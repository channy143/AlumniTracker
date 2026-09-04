import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

async function safeData(query: any): Promise<any[]> {
  try { const { data } = await query; return data || []; }
  catch { return []; }
}

function abbreviateProgram(name: string): string {
  const s = String(name || '').trim();
  if (!s) return s;
  if (/^[A-Z][A-Z0-9.\-]{1,8}$/.test(s)) return s;
  const stopwords = new Set(['of', 'in', 'and', 'the', 'a', 'an', 'for', 'with', 'at', 'on']);
  const words = s.split(/\s+/).filter((w) => w && !stopwords.has(w.toLowerCase()));
  const abbr = words.map((w) => (w.toLowerCase() === 'education' ? 'ED' : w[0])).join('').toUpperCase();
  return abbr && abbr.length >= 2 ? abbr : s;
}

function buildCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csv = rows.map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...csv].join('\n');
}

const router = Router();

router.get('/employment-rate', async (req, res, next) => {
  try {
    const year = req.query.year as string;
    const course = req.query.course as string;

    let eduQuery = supabase.from('education').select('profile_id, program, year_graduated');
    if (year) eduQuery = eduQuery.eq('year_graduated', parseInt(year));
    if (course) eduQuery = eduQuery.eq('program', course);
    const { data: education } = await eduQuery;

    const profileIds = education?.map((e) => e.profile_id) || [];
    if (profileIds.length === 0) return res.json({ employed: 0, unemployed: 0, rate: 0, total: 0 });

    const { count: employed } = await supabase
      .from('employment')
      .select('*', { count: 'exact', head: true })
      .in('profile_id', profileIds)
      .eq('is_current', true);

    const total = profileIds.length;
    const empCount = employed || 0;
    res.json({ employed: empCount, unemployed: total - empCount, rate: total > 0 ? Math.round((empCount / total) * 100) : 0, total });
  } catch (err) {
    next(err);
  }
});

router.get('/employment-by-course', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const year = req.query.year as string;
    const { data: education } = await supabase.from('education').select('profile_id, program, year_graduated');
    const { data: employment } = await supabase.from('employment').select('profile_id, is_current').eq('is_current', true);

    const empIds = new Set(employment?.map((e) => e.profile_id) || []);
    const courseStats: Record<string, { total: number; employed: number }> = {};

    education?.forEach((e) => {
      if (!e.program) return;
      if (year && String(e.year_graduated) !== year) return;
      if (!courseStats[e.program]) courseStats[e.program] = { total: 0, employed: 0 };
      courseStats[e.program].total++;
      if (empIds.has(e.profile_id)) courseStats[e.program].employed++;
    });

    const data = Object.entries(courseStats).map(([course, stats]) => ({
      course, total: stats.total, employed: stats.employed,
      rate: stats.total > 0 ? Math.round((stats.employed / stats.total) * 100) : 0,
    }));

    if (format === 'csv') {
      const csv = buildCsv(data.map((d) => ({
        Course: d.course,
        Total: d.total,
        Employed: d.employed,
        'Rate (%)': d.rate,
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employment-rate-by-course.csv');
      return res.send(csv);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/employment-by-batch', async (_req, res, next) => {
  try {
    const { data: education } = await supabase.from('education').select('profile_id, year_graduated');
    const { data: employment } = await supabase.from('employment').select('profile_id, is_current').eq('is_current', true);

    const empIds = new Set(employment?.map((e) => e.profile_id) || []);
    const batchStats: Record<string, { total: number; employed: number }> = {};

    education?.forEach((e) => {
      if (!e.year_graduated) return;
      const year = String(e.year_graduated);
      if (!batchStats[year]) batchStats[year] = { total: 0, employed: 0 };
      batchStats[year].total++;
      if (empIds.has(e.profile_id)) batchStats[year].employed++;
    });

    const data = Object.entries(batchStats).map(([year, stats]) => ({
      year: parseInt(year), total: stats.total, employed: stats.employed,
      rate: stats.total > 0 ? Math.round((stats.employed / stats.total) * 100) : 0,
    })).sort((a, b) => a.year - b.year);

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/industry-distribution', async (_req, res, next) => {
  try {
    const { data: employment } = await supabase
      .from('employment')
      .select('company_industry, salary_range')
      .eq('is_current', true)
      .not('company_industry', 'is', null);

    const distribution: Record<string, { count: number; salaries: number[] }> = {};
    employment?.forEach((e: any) => {
      if (!distribution[e.company_industry]) distribution[e.company_industry] = { count: 0, salaries: [] };
      distribution[e.company_industry].count++;
      if (e.salary_range) {
        const nums = e.salary_range.replace(/[^0-9\-]/g, '').split('-').map(Number).filter(Boolean);
        if (nums.length > 0) distribution[e.company_industry].salaries.push(nums[0]);
      }
    });

    const data = Object.entries(distribution).map(([industry, stats]) => ({
      industry, count: stats.count,
      avgSalary: stats.salaries.length > 0 ? Math.round(stats.salaries.reduce((a, b) => a + b, 0) / stats.salaries.length) : null,
    })).sort((a, b) => b.count - a.count);

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/top-employers', async (_req, res, next) => {
  try {
    const { data: employment } = await supabase
      .from('employment')
      .select('company_name, company_industry, salary_range')
      .eq('is_current', true)
      .not('company_name', 'is', null);

    const employers: Record<string, { count: number; industry: string; salaries: number[] }> = {};
    employment?.forEach((e: any) => {
      if (!employers[e.company_name]) employers[e.company_name] = { count: 0, industry: e.company_industry || '', salaries: [] };
      employers[e.company_name].count++;
      if (e.salary_range) {
        const nums = e.salary_range.replace(/[^0-9\-]/g, '').split('-').map(Number).filter(Boolean);
        if (nums.length > 0) employers[e.company_name].salaries.push(nums[0]);
      }
    });

    const data = Object.entries(employers).map(([company, stats]) => ({
      company, count: stats.count, industry: stats.industry,
      avgSalary: stats.salaries.length > 0 ? Math.round(stats.salaries.reduce((a, b) => a + b, 0) / stats.salaries.length) : null,
    })).sort((a, b) => b.count - a.count).slice(0, 20);

    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/salary-distribution', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: employment } = await supabase
      .from('employment')
      .select('salary_range, company_industry')
      .eq('is_current', true)
      .not('salary_range', 'is', null);

    const brackets: Record<string, number> = {
      '0-10000': 0, '10001-20000': 0, '20001-30000': 0, '30001-50000': 0,
      '50001-75000': 0, '75001-100000': 0, '100001+': 0,
    };

    employment?.forEach((e: any) => {
      const nums = e.salary_range.replace(/[^0-9\-]/g, '').split('-').map(Number).filter(Boolean);
      if (nums.length > 0) {
        const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
        if (avg <= 10000) brackets['0-10000']++;
        else if (avg <= 20000) brackets['10001-20000']++;
        else if (avg <= 30000) brackets['20001-30000']++;
        else if (avg <= 50000) brackets['30001-50000']++;
        else if (avg <= 75000) brackets['50001-75000']++;
        else if (avg <= 100000) brackets['75001-100000']++;
        else brackets['100001+']++;
      }
    });

    const data = Object.entries(brackets).map(([range, count]) => ({ range, count }));

    if (format === 'csv') {
      const csv = buildCsv(data.map((d) => ({
        'Salary Range': d.range,
        Count: d.count,
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=salary-distribution.csv');
      return res.send(csv);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/degree-alignment', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: education } = await supabase.from('education').select('profile_id, program');
    const { data: employment } = await supabase.from('employment').select('profile_id, company_industry, is_current');

    const eduMap = new Map(education?.map((e) => [e.profile_id, e.program]) || []);
    const empIndustries = new Map<string, string[]>();
    employment?.forEach((e) => {
      if (e.is_current && e.company_industry) {
        const existing = empIndustries.get(e.profile_id) || [];
        existing.push(e.company_industry);
        empIndustries.set(e.profile_id, existing);
      }
    });

    const INDUSTRY_KEYWORDS = [
      { keywords: ['education', 'teaching', 'school', 'training', 'academic'], industries: ['Education', 'Academic', 'School'] },
      { keywords: ['industrial technology', 'technology', 'engineering', 'industrial', 'manufacturing'], industries: ['Technology', 'Industrial', 'Engineering', 'Manufacturing'] },
      { keywords: ['information technology', 'computer', 'software', 'it ', ' data'], industries: ['Information Technology', 'IT', 'Software', 'Computer'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce'], industries: ['Accounting', 'Business', 'Finance'] },
      { keywords: ['education, ', 'education and', 'teacher'], industries: ['Education'] },
      { keywords: ['tourism', 'hospitality', 'hotel', 'restaurant'], industries: ['Tourism', 'Hospitality'] },
    ];

    const program = (p: string) => (p || '').toLowerCase();

    const alignment: Record<string, { total: number; aligned: number }> = {};
    eduMap.forEach((programName, profileId) => {
      if (!programName) return;
      if (!alignment[programName]) alignment[programName] = { total: 0, aligned: 0 };
      alignment[programName].total++;
      const industries = empIndustries.get(profileId) || [];
      const p = program(programName);
      const matchedKeywords = INDUSTRY_KEYWORDS
        .filter((entry) => entry.keywords.some((kw) => p.includes(kw)))
        .flatMap((entry) => entry.industries);
      const isAligned = industries.some((ind) =>
        matchedKeywords.some((m) => ind.toLowerCase().includes(m.toLowerCase()))
      );
      if (isAligned) alignment[programName].aligned++;
    });

    const data = Object.entries(alignment).map(([course, stats]) => ({
      course, total: stats.total, aligned: stats.aligned,
      rate: stats.total > 0 ? Math.round((stats.aligned / stats.total) * 100) : 0,
    }));

    if (format === 'csv') {
      const csv = buildCsv(data.map((d) => ({
        Course: d.course,
        Total: d.total,
        Aligned: d.aligned,
        'Rate (%)': d.rate,
      })));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=degree-alignment.csv');
      return res.send(csv);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/avg-time-employment', async (_req, res, next) => {
  try {
    const { data: education } = await supabase.from('education').select('profile_id, year_graduated');
    const { data: employment } = await supabase.from('employment').select('profile_id, start_date, is_current');

    const firstJobs = new Map<string, string>();
    employment?.forEach((e) => {
      if (e.is_current && e.start_date && !firstJobs.has(e.profile_id)) {
        firstJobs.set(e.profile_id, e.start_date);
      }
    });

    const eduMap = new Map(education?.map((e) => [e.profile_id, e.year_graduated]) || []);
    const monthsDiff: number[] = [];

    firstJobs.forEach((startDate, profileId) => {
      const gradYear = eduMap.get(profileId);
      if (gradYear) {
        const gradDate = new Date(gradYear, 5, 1);
        const start = new Date(startDate);
        const diffMonths = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
        if (diffMonths >= 0) monthsDiff.push(diffMonths);
      }
    });

    const avgMonths = monthsDiff.length > 0 ? Math.round(monthsDiff.reduce((a, b) => a + b, 0) / monthsDiff.length) : 0;
    res.json({ averageMonths: avgMonths, sampleSize: monthsDiff.length, distribution: monthsDiff });
  } catch (err) {
    next(err);
  }
});

router.get('/career-overview', async (_req, res, next) => {
  try {
    const { data: employment } = await supabase.from('employment').select('employment_status, is_current, salary_range, profile_id');
    const { data: profiles } = await supabase.from('profiles').select('id, country');
    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');

    const totalAlumni = users?.length || 0;
    const totalProfiles = profiles?.length || 0;
    const currentEmployment = employment?.filter((e: any) => e.is_current) || [];
    const allEmployment = employment || [];

    const employed = currentEmployment.filter((e: any) => e.employment_status === 'employed').length;
    const selfEmployed = currentEmployment.filter((e: any) => ['self-employed', 'entrepreneur'].includes(e.employment_status)).length;
    const unemployed = currentEmployment.filter((e: any) => ['unemployed', 'seeking'].includes(e.employment_status)).length;

    const profileCountry = new Map((profiles || []).map((p: any) => [p.id, p.country]));
    const isOverseas = (profileId: string) => {
      const country = String(profileCountry.get(profileId) || '').trim().toLowerCase();
      if (!country) return null;
      return !['philippines', 'ph', 'pilipinas', 'rp'].includes(country);
    };
    const employedCurrent = currentEmployment.filter((e: any) => e.employment_status === 'employed');
    const localEmployed = employedCurrent.filter((e: any) => isOverseas(e.profile_id) === false).length;
    const overseasEmployed = employedCurrent.filter((e: any) => isOverseas(e.profile_id) === true).length;
    const employedCountryUnknown = employedCurrent.filter((e: any) => isOverseas(e.profile_id) === null).length;

    const salaries = allEmployment
      .filter((e: any) => e.is_current && e.salary_range)
      .map((e: any) => {
        const clean = String(e.salary_range).replace(/[₱,,\s]/g, '');
        const parts = clean.split('-').map((n) => parseFloat(n)).filter((n) => !isNaN(n));
        if (parts.length === 0) return null;
        return parts.length === 1 ? parts[0] : (parts[0] + parts[1]) / 2;
      })
      .filter((n): n is number => n !== null);
    const averageSalary = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null;

    res.json({
      totalAlumni,
      totalProfiles,
      employmentRate: totalAlumni > 0 ? Math.round(((employed + selfEmployed) / totalAlumni) * 100) : 0,
      unemploymentRate: totalAlumni > 0 ? Math.round((unemployed / totalAlumni) * 100) : 0,
      selfEmployedRate: totalAlumni > 0 ? Math.round((selfEmployed / totalAlumni) * 100) : 0,
      employed,
      unemployed,
      selfEmployed,
      localEmployed,
      overseasEmployed,
      employedCountryUnknown,
      averageSalary,
    });
  } catch (err) { next(err); }
});

router.get('/career-progression', async (_req, res, next) => {
  try {
    const employment = await safeData(
      supabase.from('employment').select('profile_id, position, company_name, start_date, is_current, employment_status')
        .order('start_date', { ascending: true })
    );

    const progressionMap = new Map<string, any[]>();
    employment.forEach((e: any) => {
      if (!progressionMap.has(e.profile_id)) progressionMap.set(e.profile_id, []);
      progressionMap.get(e.profile_id)!.push(e);
    });

    const careerPaths: Record<string, number> = {};
    let totalWithProgression = 0;

    progressionMap.forEach((records) => {
      if (records.length >= 2) {
        totalWithProgression++;
        const first = records[0];
        const last = records[records.length - 1];
        if (first.position !== last.position) {
          const key = `${first.position} → ${last.position}`;
          careerPaths[key] = (careerPaths[key] || 0) + 1;
        }
      }
    });

    const sorted = Object.entries(careerPaths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([path, count]) => ({ path, count }));

    res.json({
      totalWithProgression,
      commonProgressions: sorted,
      totalAlumniTracked: employment.length || 0,
    });
  } catch (err) { next(err); }
});

router.get('/career-statistics', async (req, res, next) => {
  try {
    const academicYear = req.query.academic_year as string;
    const batch = req.query.batch as string;
    const course = req.query.course as string;
    const statusFilter = req.query.employment_status as string;
    const typeFilter = req.query.employment_type as string;
    const industryFilter = req.query.industry as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');
    const alumniUsers = users || [];
    const alumniUserIds = alumniUsers.map((u: any) => u.id);

    let profiles: any[] = [];
    if (alumniUserIds.length > 0) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, employment_status, current_job_title, company_name, industry, salary_range, city, province, last_updated_at')
        .in('user_id', alumniUserIds);
      profiles = p || [];
    }

    const profileIds = profiles.map((p: any) => p.id);
    let education: any[] = [];
    let employment: any[] = [];
    if (profileIds.length > 0) {
      const [{ data: e }, { data: emp }] = await Promise.all([
        supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
        supabase.from('employment').select('profile_id, company_name, position, company_industry, employment_status, job_type, start_date, end_date, is_current, salary_range, updated_at').in('profile_id', profileIds),
      ]);
      education = e || [];
      employment = emp || [];
    }

    const { data: surveys } = await supabase.from('surveys').select('id, academic_year, status, is_active');
    const { data: surveyResponses } = await supabase
      .from('survey_responses')
      .select('survey_id, user_id');

    const profileByUser = new Map(profiles.map((p: any) => [p.user_id, p.id]));
    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const eduByProfile = new Map<string, any[]>();
    education.forEach((e: any) => {
      if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
      eduByProfile.get(e.profile_id)!.push(e);
    });
    const empByProfile = new Map<string, any[]>();
    employment.forEach((e: any) => {
      if (!empByProfile.has(e.profile_id)) empByProfile.set(e.profile_id, []);
      empByProfile.get(e.profile_id)!.push(e);
    });

    const respondentUserIds = new Set((surveyResponses || []).map((r: any) => r.user_id));
    const academicYears = [...new Set((surveys || []).map((s: any) => s.academic_year).filter(Boolean))].sort();
    const academicYearUserIds = new Set<string>();
    if (academicYear) {
      const matchingSurveys = (surveys || []).filter((s: any) => s.academic_year === academicYear).map((s: any) => s.id);
      const ids = new Set(matchingSurveys);
      (surveyResponses || []).forEach((r: any) => {
        if (ids.has(r.survey_id)) academicYearUserIds.add(r.user_id);
      });
    }

    const isCurrent = (e: any) => e.is_current === true;
    const isEmployedStatus = (s?: string) => {
      const st = String(s || '').toLowerCase();
      return ['employed', 'self-employed', 'entrepreneur'].includes(st);
    };

    const filteredProfiles = profiles.filter((p: any) => {
      if (academicYear && !academicYearUserIds.has(p.user_id)) return false;
      const edu = eduByProfile.get(p.id) || [];
      if (batch && !edu.some((e: any) => String(e.year_graduated) === batch)) return false;
      if (course && !edu.some((e: any) => abbreviateProgram(e.program) === course)) return false;

      const status = p.employment_status || (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status || null;
      if (statusFilter && status !== statusFilter) return false;

      const emp = empByProfile.get(p.id) || [];
      const currentEmp = emp.filter(isCurrent);
      if (typeFilter) {
        const isSelfEmp = status === 'Self-employed' || status === 'self-employed';
        const matchesType = currentEmp.some((e: any) => {
          const t = e.job_type ? String(e.job_type).toLowerCase() : '';
          if (typeFilter === 'Self-employed') return false;
          if (typeFilter === 'Full-time' && t === 'full-time') return true;
          if (typeFilter === 'Part-time' && t === 'part-time') return true;
          if (typeFilter === 'Contractual' && (t === 'contract' || t === 'contractual')) return true;
          if (typeFilter === 'Freelance' && t === 'freelance') return true;
          if (typeFilter === 'Internship' && t === 'internship') return true;
          return false;
        });
        if (typeFilter === 'Self-employed' && !isSelfEmp) return false;
        if (typeFilter !== 'Self-employed' && !matchesType) return false;
      }

      if (industryFilter) {
        const industries = currentEmp.map((e: any) => e.company_industry).concat(p.industry || []).map((s: any) => String(s || '').trim());
        if (!industries.some((i: any) => i === industryFilter)) return false;
      }

      if (dateFrom || dateTo) {
        const dates = currentEmp.map((e: any) => e.start_date || e.updated_at).filter(Boolean);
        const inRange = dates.some((d: any) => {
          const t = new Date(d).getTime();
          if (dateFrom && t < new Date(dateFrom).getTime()) return false;
          if (dateTo && t > new Date(dateTo + 'T23:59:59').getTime()) return false;
          return true;
        });
        if (!inRange) return false;
      }
      return true;
    });

    const totalAlumni = filteredProfiles.length;

    const statusCount: Record<string, number> = { 'Employed': 0, 'Self-employed': 0, 'Unemployed': 0, 'Pursuing Further Studies': 0 };
    const statusOrder = ['Employed', 'Self-employed', 'Unemployed', 'Pursuing Further Studies'];
    const employmentRateTarget = Math.max(totalAlumni, 1);

    filteredProfiles.forEach((p: any) => {
      const emp = empByProfile.get(p.id) || [];
      const raw = p.employment_status || emp.find(isCurrent)?.employment_status || null;
      const lower = String(raw || '').toLowerCase();
      let bucket = 'Unemployed';
      if (raw === 'Employed' || lower === 'employed') bucket = 'Employed';
      else if (raw === 'Self-employed' || lower === 'self-employed' || lower === 'entrepreneur') bucket = 'Self-employed';
      else if (lower === 'student') bucket = 'Pursuing Further Studies';
      statusCount[bucket] = (statusCount[bucket] || 0) + 1;
    });

    const statusDistribution = statusOrder
      .filter((s) => statusCount[s] > 0)
      .map((s) => ({ status: s, count: statusCount[s], percentage: Math.round((statusCount[s] / employmentRateTarget) * 100) }));

    const employedCount = statusCount['Employed'] + statusCount['Self-employed'];
    const employmentRate = Math.round((employedCount / employmentRateTarget) * 100);

    const currentEmployment = employment.filter((e: any) => isCurrent(e) && filteredProfiles.some((p: any) => p.id === e.profile_id));

    const parseSalary = (value?: string | null): number | null => {
      if (!value) return null;
      const clean = String(value).replace(/[₱,,\s]/g, '');
      const parts = clean.split('-').map((s) => parseFloat(s)).filter((n) => !isNaN(n));
      if (parts.length === 0) return null;
      if (parts.length === 1) return parts[0];
      return (parts[0] + parts[1]) / 2;
    };

    const salaryValues = currentEmployment.map((e: any) => parseSalary(e.salary_range)).filter((n): n is number => n !== null);
    const averageSalary = salaryValues.length > 0 ? Math.round(salaryValues.reduce((a, b) => a + b, 0) / salaryValues.length) : 0;
    const highestSalary = salaryValues.length > 0 ? Math.round(Math.max(...salaryValues)) : 0;
    const lowestSalary = salaryValues.length > 0 ? Math.round(Math.min(...salaryValues)) : 0;

    const salaryBrackets = [
      { label: 'Below ₱20,000', min: 0, max: 19999.99 },
      { label: '₱20,000–₱40,000', min: 20000, max: 39999.99 },
      { label: '₱40,000–₱60,000', min: 40000, max: 59999.99 },
      { label: '₱60,000+', min: 60000, max: Infinity },
    ];
    const salaryDistribution = salaryBrackets.map((b) => ({
      range: b.label,
      count: salaryValues.filter((v) => v >= b.min && v <= b.max).length,
    }));

    const typeBuckets: Record<string, number> = {
      'Full-time': 0, 'Part-time': 0, 'Contractual': 0, 'Freelance': 0, 'Internship': 0, 'Self-employed': 0,
    };
    const usedForType = new Set<string>();
    currentEmployment.forEach((e: any) => {
      const t = String(e.job_type || '').toLowerCase();
      let key: string | null = null;
      if (t === 'full-time') key = 'Full-time';
      else if (t === 'part-time') key = 'Part-time';
      else if (t === 'contract' || t === 'contractual') key = 'Contractual';
      else if (t === 'freelance') key = 'Freelance';
      else if (t === 'internship') key = 'Internship';
      if (key) { typeBuckets[key]++; usedForType.add(e.profile_id); }
    });
    filteredProfiles.forEach((p: any) => {
      const raw = p.employment_status || (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status || null;
      const lower = String(raw || '').toLowerCase();
      if ((lower === 'self-employed' || lower === 'entrepreneur') && !usedForType.has(p.id)) {
        typeBuckets['Self-employed']++;
        usedForType.add(p.id);
      }
    });
    const employmentTypeDistribution = Object.entries(typeBuckets)
      .filter(([, c]) => c > 0)
      .map(([type, count]) => ({ type, count }));

    const firstJobByProfile = new Map<string, string>();
    currentEmployment.forEach((e: any) => {
      if (e.start_date && (!firstJobByProfile.has(e.profile_id) || e.start_date < firstJobByProfile.get(e.profile_id)!)) {
        firstJobByProfile.set(e.profile_id, e.start_date);
      }
    });
    const monthsToEmployment: number[] = [];
    firstJobByProfile.forEach((startDate, profileId) => {
      const edu = eduByProfile.get(profileId) || [];
      const gradYear = edu.map((e: any) => Number(e.year_graduated)).filter((y: number) => !isNaN(y)).sort().pop();
      if (!gradYear) return;
      const gradDate = new Date(gradYear, 5, 1);
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return;
      const months = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
      if (months >= 0) monthsToEmployment.push(months);
    });
    const averageTimeToEmployment = monthsToEmployment.length > 0
      ? Math.round(monthsToEmployment.reduce((a, b) => a + b, 0) / monthsToEmployment.length)
      : null;
    const timeBuckets = [
      { label: 'Less than 3 months', test: (m: number) => m <= 3 },
      { label: '3–6 months', test: (m: number) => m > 3 && m <= 6 },
      { label: '6–12 months', test: (m: number) => m > 6 && m <= 12 },
      { label: 'More than 1 year', test: (m: number) => m > 12 },
    ];
    const timeToEmployment = timeBuckets.map((b) => ({ label: b.label, count: monthsToEmployment.filter(b.test).length }));

    const INDUSTRY_KEYWORDS = [
      { keywords: ['education', 'teaching', 'school', 'training', 'academic'], industries: ['Education', 'Academic', 'School'] },
      { keywords: ['industrial technology', 'technology', 'engineering', 'industrial', 'manufacturing'], industries: ['Technology', 'Industrial', 'Engineering', 'Manufacturing'] },
      { keywords: ['information technology', 'computer', 'software', 'it ', ' data'], industries: ['Information Technology', 'IT', 'Software', 'Computer'] },
      { keywords: ['accounting', 'business', 'finance', 'management', 'commerce'], industries: ['Accounting', 'Business', 'Finance'] },
      { keywords: ['education, ', 'education and', 'teacher'], industries: ['Education'] },
      { keywords: ['tourism', 'hospitality', 'hotel', 'restaurant'], industries: ['Tourism', 'Hospitality'] },
    ];

    let alignmentTotal = 0;
    let alignedCount = 0;
    filteredProfiles.forEach((p: any) => {
      const emp = empByProfile.get(p.id) || [];
      const edu = eduByProfile.get(p.id) || [];
      const programName = edu.map((e: any) => e.program).filter(Boolean)[0];
      const industry = (emp.find(isCurrent)?.company_industry || p.industry || '') as string;
      if (!programName || !industry) return;
      alignmentTotal++;
      const prog = String(programName).toLowerCase();
      const ind = String(industry).toLowerCase();
      const matchedKeywords = INDUSTRY_KEYWORDS
        .filter((entry) => entry.keywords.some((kw) => prog.includes(kw)))
        .flatMap((entry) => entry.industries);
      const isAligned = matchedKeywords.some((m) => ind.includes(m.toLowerCase()));
      if (isAligned) alignedCount++;
    });
    const workAlignmentRate = alignmentTotal > 0 ? Math.round((alignedCount / alignmentTotal) * 100) : 0;

    const experienceMonths: number[] = [];
    currentEmployment.forEach((e: any) => {
      if (!e.start_date) return;
      const start = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : new Date();
      if (isNaN(start.getTime())) return;
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      if (months >= 0) experienceMonths.push(months);
    });
    const averageYearsExperience = experienceMonths.length > 0
      ? Math.round((experienceMonths.reduce((a, b) => a + b, 0) / experienceMonths.length / 12) * 10) / 10
      : 0;

    const activeSurveyCount = (surveys || []).filter((s: any) => s.status === 'published' && s.is_active === true).length;
    const activeSurveyIds = new Set((surveys || []).filter((s: any) => s.status === 'published' && s.is_active === true).map((s: any) => s.id));
    const activeRespondentUserIds = new Set(
      (surveyResponses || []).filter((r: any) => activeSurveyIds.has(r.survey_id)).map((r: any) => r.user_id)
    );
    const surveyTarget = Math.max(alumniUsers.length, 1);
    const tracerSurveyResponseRate = activeRespondentUserIds.size > 0
      ? Math.round((activeRespondentUserIds.size / surveyTarget) * 100)
      : 0;

    const gradYears = [...new Set(education.map((e: any) => Number(e.year_graduated)).filter((y: number) => !isNaN(y)))].sort((a, b) => a - b);
    const employmentTrend = gradYears.map((year) => {
      const yearProfiles = filteredProfiles.filter((p: any) => {
        const edu = eduByProfile.get(p.id) || [];
        return edu.some((e: any) => Number(e.year_graduated) === year);
      });
      const empCount = yearProfiles.filter((p: any) => {
        const raw = p.employment_status || (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status || null;
        return isEmployedStatus(raw);
      }).length;
      return {
        year,
        total: yearProfiles.length,
        employed: empCount,
        rate: yearProfiles.length > 0 ? Math.round((empCount / yearProfiles.length) * 100) : 0,
      };
    });

    const cityCount: Record<string, number> = {};
    const provinceCount: Record<string, number> = {};
    const employedProfiles = filteredProfiles.filter((p: any) => {
      const raw = p.employment_status || (empByProfile.get(p.id) || []).find(isCurrent)?.employment_status || null;
      return isEmployedStatus(raw);
    });
    employedProfiles.forEach((p: any) => {
      if (p.city) cityCount[p.city] = (cityCount[p.city] || 0) + 1;
      if (p.province) provinceCount[p.province] = (provinceCount[p.province] || 0) + 1;
    });
    const toRanked = (obj: Record<string, number>) => Object.entries(obj)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const timelineMap = new Map<number, Set<string>>();
    currentEmployment.forEach((e: any) => {
      if (!e.start_date) return;
      const year = new Date(e.start_date).getFullYear();
      if (!timelineMap.has(year)) timelineMap.set(year, new Set());
      timelineMap.get(year)!.add(e.profile_id);
    });
    const employmentTimeline = [...timelineMap.entries()]
      .map(([year, ids]) => ({ year, count: ids.size }))
      .sort((a, b) => a.year - b.year);

    const withoutEmployment = filteredProfiles.filter((p: any) => (empByProfile.get(p.id) || []).length === 0);
    const withoutSurvey = filteredProfiles.filter((p: any) => !respondentUserIds.has(p.user_id));

    const recentlyUpdated = currentEmployment
      .map((e: any) => ({
        id: e.id,
        name: `${profileMap.get(e.profile_id)?.first_name || ''} ${profileMap.get(e.profile_id)?.last_name || ''}`.trim() || 'Unknown',
        position: e.position || profileMap.get(e.profile_id)?.current_job_title || null,
        company: e.company_name || profileMap.get(e.profile_id)?.company_name || null,
        updated_at: e.updated_at || profileMap.get(e.profile_id)?.last_updated_at || null,
      }))
      .filter((r: any) => r.updated_at)
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    const industries = [...new Set(
      employment.map((e: any) => String(e.company_industry || '').trim()).concat(profiles.map((p: any) => String(p.industry || '').trim()))
    )].filter(Boolean).sort();

    res.json({
      overview: {
        totalAlumni,
        employmentRate,
        averageSalary,
        averageTimeToEmployment,
        workAlignmentRate,
        averageYearsExperience,
        tracerSurveyResponseRate,
        activeSurveyCount,
      },
      statusDistribution,
      employmentTypeDistribution,
      salaryDistribution,
      salarySummary: { averageSalary, highestSalary, lowestSalary },
      timeToEmployment,
      averageTimeToEmployment,
      employmentTrend,
      geographicDistribution: {
        cities: toRanked(cityCount),
        provinces: toRanked(provinceCount),
      },
      employmentTimeline,
      missingInfo: {
        withoutEmployment: withoutEmployment.length,
        withoutSurvey: withoutSurvey.length,
        withoutEmploymentList: withoutEmployment.map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown' })),
        withoutSurveyList: withoutSurvey.map((p: any) => ({ id: p.id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown' })),
      },
      recentlyUpdated,
      filters: {
        academicYears,
        batches: [...new Set(education.map((e: any) => e.year_graduated).filter(Boolean))].sort((a: any, b: any) => b - a),
        programs: [...new Set(education.map((e: any) => abbreviateProgram(e.program)).filter(Boolean))].sort(),
        statuses: statusOrder,
        employmentTypes: ['Full-time', 'Part-time', 'Contractual', 'Freelance', 'Internship', 'Self-employed'],
        industries,
      },
    });
  } catch (err) { next(err); }
});

router.get('/networking-growth', async (_req, res, next) => {
  try {
    const connections = await safeData(
      supabase.from('connections').select('created_at').eq('status', 'accepted').order('created_at', { ascending: true })
    );
    const referrals = await safeData(
      supabase.from('referral_requests').select('created_at').order('created_at', { ascending: true })
    );

    const monthlyConnections: Record<string, number> = {};
    const monthlyReferrals: Record<string, number> = {};

    connections.forEach((c: any) => {
      if (c.created_at) {
        const key = new Date(c.created_at).toISOString().slice(0, 7);
        monthlyConnections[key] = (monthlyConnections[key] || 0) + 1;
      }
    });
    referrals.forEach((r: any) => {
      if (r.created_at) {
        const key = new Date(r.created_at).toISOString().slice(0, 7);
        monthlyReferrals[key] = (monthlyReferrals[key] || 0) + 1;
      }
    });

    res.json({
      totalConnections: connections?.length || 0,
      totalReferrals: referrals?.length || 0,
      connectionsGrowth: Object.entries(monthlyConnections).map(([month, count]) => ({ month, count })),
      referralsGrowth: Object.entries(monthlyReferrals).map(([month, count]) => ({ month, count })),
    });
  } catch (err) { next(err); }
});

export default router;
