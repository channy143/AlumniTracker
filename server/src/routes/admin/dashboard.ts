import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

let partnershipSupported: boolean | null = null;

async function hasPartnershipColumn(): Promise<boolean> {
  if (partnershipSupported !== null) return partnershipSupported;
  const { error } = await supabase.from('companies').select('id, partnership_status').limit(1);
  partnershipSupported = !error;
  return partnershipSupported;
}

async function safeCount(query: any): Promise<number> {
  try {
    const { count } = await query;
    return count || 0;
  } catch { return 0; }
}

async function safeData(query: any): Promise<any[]> {
  try {
    const { data } = await query;
    return data || [];
  } catch { return []; }
}

router.get('/upcoming-events', async (_req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let events: any[] = [];

    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('id, title, event_date, event_time, event_location, created_at')
        .eq('type', 'event')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);
      if (error && (error.code === '42703' || error.message?.includes('does not exist'))) throw new Error('column-missing');
      if (error) throw new AppError(error.message, 500);
      events = data || [];

      // If no future upcoming events exist, fall back to the most recent events so the dashboard is not blank
      if (events.length === 0) {
        const { data: recent, error: recentErr } = await supabase
          .from('feed_posts')
          .select('id, title, event_date, event_time, event_location, created_at')
          .eq('type', 'event')
          .order('event_date', { ascending: false })
          .limit(5);
        if (!recentErr && recent && recent.length > 0) {
          events = recent;
        }
      }
    } catch (err: any) {
      if (err?.message !== 'column-missing') throw err;
      const { data, error } = await supabase
        .from('feed_posts')
        .select('id, title, created_at')
        .eq('type', 'event')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw new AppError(error.message, 500);
      events = (data || []).map((e: any) => ({ ...e, event_date: null }));
    }

    res.json(events.map((e: any) => ({
      id: e.id,
      title: e.title,
      date: e.event_date
        ? new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : e.created_at
          ? new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '',
      time: e.event_time || '',
      location: e.event_location || '',
    })));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const rawYear = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const selectedYear = rawYear && !isNaN(rawYear) ? rawYear : currentYear;
    const isFiltered = rawYear !== undefined && !isNaN(rawYear);

    const partnershipTracked = await hasPartnershipColumn();
    const [
      allAlumniUsers,
      allProfiles,
      allEmployment,
      allEducation,
      allCompanies,
      activeSurveys,
    ] = await Promise.all([
      safeData(supabase.from('users').select('id, created_at, is_verified').eq('role', 'alumni')),
      safeData(supabase.from('profiles').select('id, user_id, first_name, last_name, employment_status, current_job_title, company_name, industry, salary_range, city, province, country')),
      safeData(supabase.from('employment').select('id, profile_id, employment_status, company_name, company_industry, salary_range, is_current, start_date')),
      safeData(supabase.from('education').select('profile_id, program, year_graduated')),
      partnershipTracked
        ? safeData(supabase.from('companies').select('id, name, partnership_status, employer_type, created_at, agreement_start_date, agreement_end_date'))
        : Promise.resolve([]),
      safeData(supabase.from('surveys').select('id, title, is_active, created_at')),
    ]);

    const alumniUserMap = new Map((allAlumniUsers || []).map((u: any) => [u.id, u]));
    const eduByProfile = new Map<string, any[]>();
    (allEducation || []).forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });

    const empByProfile = new Map<string, any[]>();
    (allEmployment || []).forEach((e: any) => {
      if (!empByProfile.has(e.profile_id)) empByProfile.set(e.profile_id, []);
      empByProfile.get(e.profile_id)!.push(e);
    });

    // All profiles corresponding to alumni users
    const alumniProfiles = (allProfiles || []).filter((p: any) => alumniUserMap.has(p.user_id));

    // Calculate alumni registered in the selected year
    const registeredInSelectedYear = (allAlumniUsers || []).filter((u: any) => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      return d.getFullYear() === selectedYear;
    }).length;

    // Filter cohort if year is selected
    const targetAlumniProfiles = isFiltered
      ? alumniProfiles.filter((p: any) => {
          const u = alumniUserMap.get(p.user_id);
          const edu = eduByProfile.get(p.id) || [];
          const hasGradYear = edu.some((e: any) => Number(e.year_graduated) <= selectedYear);
          const hasRegYear = u?.created_at && new Date(u.created_at).getFullYear() <= selectedYear;
          return hasGradYear || hasRegYear;
        })
      : alumniProfiles;

    const resolvedTotalAlumni = targetAlumniProfiles.length || (allAlumniUsers || []).length;
    const resolvedVerifiedAlumni = targetAlumniProfiles.filter((p: any) => {
      const u = alumniUserMap.get(p.user_id);
      return u?.is_verified;
    }).length;

    // Partner companies active/created in or up to selected year
    const partnerCompaniesCount = (allCompanies || []).filter((c: any) => {
      const isPartner = c.partnership_status === 'partner' || c.employer_type === 'partner';
      if (!isPartner) return false;
      if (!isFiltered) return true;
      const cDate = c.agreement_start_date ? new Date(c.agreement_start_date) : (c.created_at ? new Date(c.created_at) : null);
      if (!cDate) return true;
      return cDate.getFullYear() <= selectedYear;
    }).length;

    // Unified Employment Status across profiles and employment records (same standard as Career Analytics)
    let strictlyEmployedCount = 0;
    let selfEmployedCount = 0;
    let unemployedCount = 0;

    targetAlumniProfiles.forEach((p: any) => {
      const emps = empByProfile.get(p.id) || [];
      const currentEmp = emps.find((e: any) => e.is_current);
      const rawStatus = p.employment_status || currentEmp?.employment_status || null;
      const lower = String(rawStatus || '').toLowerCase().trim();

      if (rawStatus === 'Employed' || lower === 'employed') {
        strictlyEmployedCount++;
      } else if (
        rawStatus === 'Self-employed' ||
        lower === 'self-employed' ||
        lower === 'entrepreneur' ||
        lower === 'freelance'
      ) {
        selfEmployedCount++;
      } else {
        unemployedCount++;
      }
    });

    const totalEmployed = strictlyEmployedCount + selfEmployedCount;
    const cohortTotal = targetAlumniProfiles.length || 1;
    const employedPercentage = Math.round((totalEmployed / cohortTotal) * 100);
    const unemployedPercentage = Math.round((unemployedCount / cohortTotal) * 100);

    // Salaries for current employment
    const parseSalary = (value?: string | null): number | null => {
      if (!value) return null;
      const clean = String(value).replace(/[₱,,\s]/g, '');
      const parts = clean.split('-').map((s) => parseFloat(s)).filter((n) => !isNaN(n));
      if (parts.length === 0) return null;
      if (parts.length === 1) return parts[0];
      return (parts[0] + parts[1]) / 2;
    };

    const targetEmpRecords = (allEmployment || []).filter((e: any) =>
      e.is_current && targetAlumniProfiles.some((p: any) => p.id === e.profile_id)
    );
    const salaries = targetEmpRecords
      .map((e: any) => parseSalary(e.salary_range))
      .filter((n): n is number => n !== null);

    const averageSalary = salaries.length > 0
      ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length)
      : 0;
    const highestSalary = salaries.length > 0 ? Math.round(Math.max(...salaries)) : 0;
    const lowestSalary = salaries.length > 0 ? Math.round(Math.min(...salaries)) : 0;
    const alumniWithSalary = salaries.length;

    // Degree / Work Alignment
    const INDUSTRY_KEYWORDS = [
      { keywords: ['education', 'teaching', 'school', 'training', 'academic', 'sped'], industries: ['Education', 'Academic', 'School', 'Educational Services'] },
      { keywords: ['industrial technology', 'engineering', 'industrial', 'manufacturing', 'mechanical', 'civil', 'electrical'], industries: ['Technology', 'Industrial', 'Engineering', 'Manufacturing', 'Construction'] },
      { keywords: ['information technology', 'computer', 'software', 'it', 'data', 'programming'], industries: ['Information Technology', 'IT', 'Software', 'Computer', 'Technology'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce', 'administration'], industries: ['Accounting', 'Business', 'Finance', 'Management'] },
      { keywords: ['tourism', 'hospitality', 'hotel', 'restaurant', 'food'], industries: ['Tourism', 'Hospitality', 'Food and Beverage', 'Restaurant'] },
    ];

    let matchedCount = 0;
    let partialCount = 0;
    let notAlignedCount = 0;
    let alignmentTotal = 0;

    targetAlumniProfiles.forEach((p: any) => {
      const emps = empByProfile.get(p.id) || [];
      const currentEmp = emps.find((e: any) => e.is_current);
      const rawStatus = p.employment_status || currentEmp?.employment_status || '';
      const lower = String(rawStatus).toLowerCase().trim();
      const isEmp = ['employed', 'self-employed', 'entrepreneur', 'freelance'].includes(lower);
      if (!isEmp) return;

      const edus = eduByProfile.get(p.id) || [];
      const prog = (edus[0]?.program || '').toLowerCase();
      const ind = (currentEmp?.company_industry || p.industry || '').trim().toLowerCase();
      if (!prog || !ind) return;

      alignmentTotal++;
      const matchedKeywords = INDUSTRY_KEYWORDS
        .filter((entry) => entry.keywords.some((kw) => prog.includes(kw)))
        .flatMap((entry) => entry.industries.map((i) => i.toLowerCase()));

      const isAligned = matchedKeywords.some((m) => ind.includes(m) || m.includes(ind));
      if (isAligned) matchedCount++;
      else notAlignedCount++;
    });

    const timeToEmployment: number[] = [];
    (allEmployment || []).forEach((emp: any) => {
      const edus = eduByProfile.get(emp.profile_id) || [];
      const edu = edus[0];
      if (edu && edu.year_graduated && emp.start_date) {
        const gradYear = Number(edu.year_graduated);
        if (isFiltered && gradYear !== selectedYear) return;
        const start = new Date(emp.start_date);
        if (!isNaN(gradYear) && !isNaN(start.getTime())) {
          const gradDate = new Date(gradYear, 5, 1);
          const monthsDiff = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
          if (monthsDiff >= 0) timeToEmployment.push(monthsDiff);
        }
      }
    });

    if (timeToEmployment.length === 0 && isFiltered) {
      (allEmployment || []).forEach((emp: any) => {
        const edus = eduByProfile.get(emp.profile_id) || [];
        const edu = edus[0];
        if (edu && edu.year_graduated && emp.start_date) {
          const gradYear = Number(edu.year_graduated);
          const start = new Date(emp.start_date);
          if (!isNaN(gradYear) && !isNaN(start.getTime())) {
            const gradDate = new Date(gradYear, 5, 1);
            const monthsDiff = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
            if (monthsDiff >= 0) timeToEmployment.push(monthsDiff);
          }
        }
      });
    }

    const averageTimeToEmployment = timeToEmployment.length > 0
      ? Math.round(timeToEmployment.reduce((a: number, b: number) => a + b, 0) / timeToEmployment.length)
      : null;

    const activeList = (activeSurveys || []).filter((s: any) => s.is_active);
    let tracerSurveyCompletionRate = 0;
    let surveyResponsesCount = 0;
    if (activeList.length > 0) {
      const active = activeList[0];
      const respondents = await safeCount(
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }).eq('survey_id', active.id)
      );
      surveyResponsesCount = respondents;
      const target = resolvedTotalAlumni || 0;
      tracerSurveyCompletionRate = target > 0 ? Math.round((respondents / target) * 100) : 0;
    }

    res.json({
      selectedYear,
      isCurrentYear: selectedYear === currentYear,
      totalAlumni: resolvedTotalAlumni,
      verifiedAlumni: resolvedVerifiedAlumni,
      activeAlumni: targetAlumniProfiles.length || 0,
      registeredThisYear: registeredInSelectedYear,
      employedCount: totalEmployed,
      employedPercentage,
      unemployedPercentage,
      averageSalary,
      highestSalary,
      lowestSalary,
      alumniWithSalary,
      averageTimeToEmployment,
      workAlignmentRate: alignmentTotal > 0 ? Math.round((matchedCount / alignmentTotal) * 100) : 0,
      workAlignmentAligned: matchedCount,
      workAlignmentPartial: partialCount,
      workAlignmentNotAligned: notAlignedCount,
      workAlignmentTotal: alignmentTotal,
      tracerSurveyCompletionRate,
      surveyResponsesCount,
      surveyTargetCount: resolvedTotalAlumni,
      partnerCompanies: partnerCompaniesCount,
      activeSurveyCount: activeList.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (req, res, next) => {
  try {
    const rawYear = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const isFiltered = rawYear !== undefined && !isNaN(rawYear);
    const selectedYear = rawYear || new Date().getFullYear();

    const [employment, education, users, profiles, alumniSkills] = await Promise.all([
      safeData(supabase.from('employment').select('id, company_name, company_industry, is_current, salary_range, profile_id, employment_status, job_type, start_date')),
      safeData(supabase.from('education').select('program, year_graduated, profile_id')),
      safeData(supabase.from('users').select('id, created_at').eq('role', 'alumni')),
      safeData(supabase.from('profiles').select('id, user_id, first_name, last_name, employment_status, current_job_title, company_name, industry, salary_range, city, province, country')),
      safeData(supabase.from('skills').select('name')),
    ]);

    const alumniUserMap = new Map((users || []).map((u: any) => [u.id, u]));
    const eduByProfile = new Map<string, any[]>();
    (education || []).forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });

    const empByProfile = new Map<string, any[]>();
    (employment || []).forEach((e: any) => {
      if (!empByProfile.has(e.profile_id)) empByProfile.set(e.profile_id, []);
      empByProfile.get(e.profile_id)!.push(e);
    });

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const alumniProfiles = (profiles || []).filter((p: any) => alumniUserMap.has(p.user_id));

    const targetProfiles = isFiltered
      ? alumniProfiles.filter((p: any) => {
          const u = alumniUserMap.get(p.user_id);
          const edu = eduByProfile.get(p.id) || [];
          const hasGradYear = edu.some((e: any) => Number(e.year_graduated) <= selectedYear);
          const hasRegYear = u?.created_at && new Date(u.created_at).getFullYear() <= selectedYear;
          return hasGradYear || hasRegYear;
        })
      : alumniProfiles;

    // Status distribution
    let strictlyEmployed = 0;
    let selfEmployed = 0;
    let unemployed = 0;

    targetProfiles.forEach((p: any) => {
      const emps = empByProfile.get(p.id) || [];
      const currentEmp = emps.find((e: any) => e.is_current);
      const rawStatus = p.employment_status || currentEmp?.employment_status || null;
      const lower = String(rawStatus || '').toLowerCase().trim();

      if (rawStatus === 'Employed' || lower === 'employed') {
        strictlyEmployed++;
      } else if (
        rawStatus === 'Self-employed' ||
        lower === 'self-employed' ||
        lower === 'entrepreneur' ||
        lower === 'freelance'
      ) {
        selfEmployed++;
      } else {
        unemployed++;
      }
    });

    const totalStatus = targetProfiles.length || 1;
    const statusDistribution = [
      { status: 'Employed', count: strictlyEmployed, percentage: Math.round((strictlyEmployed / totalStatus) * 100) },
      { status: 'Self-employed', count: selfEmployed, percentage: Math.round((selfEmployed / totalStatus) * 100) },
      { status: 'Unemployed', count: unemployed, percentage: Math.round((unemployed / totalStatus) * 100) },
    ];

    // Alumni by course
    const alumniByCourse: Record<string, number> = {};
    education?.forEach((e: any) => {
      if (e.program && profileMap.has(e.profile_id)) {
        alumniByCourse[e.program] = (alumniByCourse[e.program] || 0) + 1;
      }
    });

    // Industry and top hiring companies from employed alumni
    const industryDistribution: Record<string, number> = {};
    const topHiringCompanies: Record<string, number> = {};
    const employmentTypeDistribution: Record<string, number> = {};

    targetProfiles.forEach((p: any) => {
      const emps = empByProfile.get(p.id) || [];
      const currentEmp = emps.find((e: any) => e.is_current);
      const rawStatus = p.employment_status || currentEmp?.employment_status || '';
      const lower = String(rawStatus).toLowerCase().trim();
      const isEmp = ['employed', 'self-employed', 'entrepreneur', 'freelance'].includes(lower);
      if (!isEmp) return;

      const ind = (currentEmp?.company_industry || p.industry || '').trim();
      if (ind) industryDistribution[ind] = (industryDistribution[ind] || 0) + 1;

      const comp = (currentEmp?.company_name || p.company_name || '').trim();
      if (comp) topHiringCompanies[comp] = (topHiringCompanies[comp] || 0) + 1;

      const jobType = currentEmp?.job_type || (lower === 'self-employed' ? 'Self-employed' : 'Full-time');
      employmentTypeDistribution[jobType] = (employmentTypeDistribution[jobType] || 0) + 1;
    });

    // Salary distribution
    const salaryDistribution: Record<string, number> = {};
    employment.forEach((e: any) => {
      if (e.salary_range) salaryDistribution[e.salary_range] = (salaryDistribution[e.salary_range] || 0) + 1;
    });

    // Batch employment data
    const batchData: Record<string, { employed: number; total: number }> = {};
    education?.forEach((e: any) => {
      if (!e.year_graduated) return;
      const year = String(e.year_graduated);
      if (!batchData[year]) batchData[year] = { employed: 0, total: 0 };
      batchData[year].total++;

      const p = profileMap.get(e.profile_id);
      const emps = empByProfile.get(e.profile_id) || [];
      const currentEmp = emps.find((j: any) => j.is_current);
      const raw = p?.employment_status || currentEmp?.employment_status || '';
      const lower = String(raw).toLowerCase().trim();
      const isEmp = ['employed', 'self-employed', 'entrepreneur', 'freelance'].includes(lower);
      if (isEmp) {
        batchData[year].employed++;
      }
    });

    const skillsInDemand: Record<string, number> = {};
    alumniSkills?.forEach((s: any) => {
      if (s.name) skillsInDemand[s.name] = (skillsInDemand[s.name] || 0) + 1;
    });

    const geographicDistribution: Record<string, number> = {};
    targetProfiles?.forEach((p: any) => {
      const loc = p.city || p.province || 'Unknown';
      geographicDistribution[loc] = (geographicDistribution[loc] || 0) + 1;
    });

    // Work alignment
    const INDUSTRY_KEYWORDS = [
      { keywords: ['education', 'teaching', 'school', 'training', 'academic', 'sped'], industries: ['Education', 'Academic', 'School', 'Educational Services'] },
      { keywords: ['industrial technology', 'engineering', 'industrial', 'manufacturing', 'mechanical', 'civil', 'electrical'], industries: ['Technology', 'Industrial', 'Engineering', 'Manufacturing', 'Construction'] },
      { keywords: ['information technology', 'computer', 'software', 'it', 'data', 'programming'], industries: ['Information Technology', 'IT', 'Software', 'Computer', 'Technology'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce', 'administration'], industries: ['Accounting', 'Business', 'Finance', 'Management'] },
      { keywords: ['tourism', 'hospitality', 'hotel', 'restaurant', 'food'], industries: ['Tourism', 'Hospitality', 'Food and Beverage', 'Restaurant'] },
    ];

    let aligned = 0;
    let notAligned = 0;
    targetProfiles.forEach((p: any) => {
      const emps = empByProfile.get(p.id) || [];
      const currentEmp = emps.find((e: any) => e.is_current);
      const rawStatus = p.employment_status || currentEmp?.employment_status || '';
      const lower = String(rawStatus).toLowerCase().trim();
      const isEmp = ['employed', 'self-employed', 'entrepreneur', 'freelance'].includes(lower);
      if (!isEmp) return;

      const edus = eduByProfile.get(p.id) || [];
      const prog = (edus[0]?.program || '').toLowerCase();
      const ind = (currentEmp?.company_industry || p.industry || '').trim().toLowerCase();
      if (!prog || !ind) return;

      const matchedKeywords = INDUSTRY_KEYWORDS
        .filter((entry) => entry.keywords.some((kw) => prog.includes(kw)))
        .flatMap((entry) => entry.industries.map((i) => i.toLowerCase()));

      const isAligned = matchedKeywords.some((m) => ind.includes(m) || m.includes(ind));
      if (isAligned) aligned++;
      else notAligned++;
    });
    const totalAlign = aligned + notAligned || 1;

    const timeBuckets = { under3: 0, m3to6: 0, m6to12: 0, over12: 0 };
    employment.forEach((emp: any) => {
      const edus = eduByProfile.get(emp.profile_id) || [];
      const edu = edus[0];
      if (edu && edu.year_graduated && emp.start_date) {
        const gradYear = Number(edu.year_graduated);
        const start = new Date(emp.start_date);
        if (!isNaN(gradYear) && !isNaN(start.getTime())) {
          const gradDate = new Date(gradYear, 5, 1);
          const months = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
          if (months >= 0) {
            if (months <= 3) timeBuckets.under3++;
            else if (months <= 6) timeBuckets.m3to6++;
            else if (months <= 12) timeBuckets.m6to12++;
            else timeBuckets.over12++;
          }
        }
      }
    });
    const totalTime = timeBuckets.under3 + timeBuckets.m3to6 + timeBuckets.m6to12 + timeBuckets.over12 || 1;

    const sortByValue = (obj: Record<string, number>) =>
      Object.entries(obj).sort(([, a], [, b]) => b - a);
    const totalGeo = Object.values(geographicDistribution).reduce((a, b) => a + b, 0) || 1;

    res.json({
      statusDistribution,
      alumniByCourse: sortByValue(alumniByCourse).slice(0, 10).map(([course, count]) => ({ course, count })),
      industryDistribution: sortByValue(industryDistribution).map(([industry, count]) => ({ industry, count })),
      topHiringCompanies: sortByValue(topHiringCompanies).slice(0, 10).map(([company, count]) => ({ company, count })),
      salaryDistribution: sortByValue(salaryDistribution).map(([range, count]) => ({ range, count })),
      batchEmploymentData: Object.entries(batchData)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, data]) => ({
          year,
          rate: data.total > 0 ? Math.round((data.employed / data.total) * 100) : 0,
          employed: data.employed,
          total: data.total,
        })),
      skillsInDemand: sortByValue(skillsInDemand).slice(0, 15).map(([name, count]) => ({ name, count })),
      geographicDistribution: sortByValue(geographicDistribution).slice(0, 8).map(([location, count]) => ({
        location, count, percentage: Math.round((count / totalGeo) * 100),
      })),
      employmentTypeDistribution: sortByValue(employmentTypeDistribution).map(([type, count]) => ({ type, count })),
      workAlignmentDistribution: [
        { label: 'Aligned with Degree', count: aligned, percentage: Math.round((aligned / totalAlign) * 100) },
        { label: 'Not Aligned', count: notAligned, percentage: Math.round((notAligned / totalAlign) * 100) },
      ],
      timeToEmploymentDistribution: [
        { label: 'Within 3 months', count: timeBuckets.under3, percentage: Math.round((timeBuckets.under3 / totalTime) * 100) },
        { label: '3–6 months', count: timeBuckets.m3to6, percentage: Math.round((timeBuckets.m3to6 / totalTime) * 100) },
        { label: '6–12 months', count: timeBuckets.m6to12, percentage: Math.round((timeBuckets.m6to12 / totalTime) * 100) },
        { label: 'More than 1 year', count: timeBuckets.over12, percentage: Math.round((timeBuckets.over12 / totalTime) * 100) },
      ],
    });
  } catch (err) {
    next(err);
  }
});

export default router;
