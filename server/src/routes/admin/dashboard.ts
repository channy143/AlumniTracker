import { Router } from 'express';
import { supabase } from '../../services/supabase';

const router = Router();

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

router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalAlumni,
      verifiedAlumni,
      currentEmployment,
      allAlumniUsers,
      totalProfiles,
      allEmployment,
      allEducation,
      partnerCompanies,
      activeSurveyCount,
    ] = await Promise.all([
      safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni')),
      safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni').eq('is_verified', true)),
      safeData(supabase.from('employment').select('employment_status, salary_range, profile_id, start_date').eq('is_current', true)),
      safeData(supabase.from('users').select('created_at').eq('role', 'alumni')),
      safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true })),
      safeData(supabase.from('employment').select('salary_range, profile_id, start_date, employment_status, company_industry')),
      safeData(supabase.from('education').select('program, year_graduated, profile_id')),
      safeCount(supabase.from('companies').select('*', { count: 'exact', head: true })),
      safeCount(supabase.from('surveys').select('*', { count: 'exact', head: true }).eq('is_active', true)),
    ]);

    const employedCount = currentEmployment.filter((e: any) =>
      ['employed', 'self-employed', 'entrepreneur'].includes(e.employment_status)
    ).length;
    const unemployedCount = currentEmployment.filter((e: any) =>
      ['unemployed', 'seeking'].includes(e.employment_status)
    ).length;
    const totalWithStatus = currentEmployment.length || 1;

    const salaries = currentEmployment
      .filter((e: any) => e.salary_range)
      .map((e: any) => {
        const range = e.salary_range.replace(/[₱,\s]/g, '').split('-');
        return range.length === 2 ? (Number(range[0]) + Number(range[1])) / 2 : Number(range[0]);
      })
      .filter((n: number) => !isNaN(n));
    const alumniWithSalary = currentEmployment.filter((e: any) => e.salary_range).length;
    const averageSalary = salaries.length > 0
      ? Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length)
      : 0;
    const highestSalary = salaries.length > 0 ? Math.round(Math.max(...salaries)) : 0;
    const lowestSalary = salaries.length > 0 ? Math.round(Math.min(...salaries)) : 0;

    const registeredThisYear = allAlumniUsers.filter((u: any) => {
      if (!u.created_at) return false;
      const d = new Date(u.created_at);
      const now = new Date();
      return d.getFullYear() === now.getFullYear();
    }).length;

    const eduMap = new Map(allEducation?.map((e: any) => [e.profile_id, e]) || []);
    let matchedCount = 0;
    let partialCount = 0;
    let notAlignedCount = 0;
    let alignmentTotal = 0;

    allEmployment?.forEach((emp: any) => {
      const edu = eduMap.get(emp.profile_id);
      if (edu && edu.program && emp.company_industry) {
        alignmentTotal++;
        const prog = edu.program.toLowerCase();
        const ind = emp.company_industry.toLowerCase();
        const progWords = prog.split(/\s+/);
        const indWords = ind.split(/\s+/);
        const hasOverlap = progWords.some((w: string) => indWords.includes(w) || ind.includes(w)) ||
                           indWords.some((w: string) => prog.includes(w));
        if (hasOverlap) matchedCount++;
        else partialCount++;
      } else if (emp.company_industry) {
        notAlignedCount++;
      }
    });

    const timeToEmployment: number[] = [];
    allEmployment?.forEach((emp: any) => {
      const edu = eduMap.get(emp.profile_id);
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
    const averageTimeToEmployment = timeToEmployment.length > 0
      ? Math.round(timeToEmployment.reduce((a: number, b: number) => a + b, 0) / timeToEmployment.length)
      : null;

    const activeSurveys = await safeData(supabase.from('surveys').select('id, title, target_count').eq('is_active', true));
    let tracerSurveyCompletionRate = 0;
    let surveyResponsesCount = 0;
    let surveyTargetCount = 0;
    if (activeSurveys.length > 0) {
      const active = activeSurveys[0];
      surveyTargetCount = (active as any).target_count || totalAlumni;
      const respondents = await safeCount(
        supabase.from('survey_responses').select('*', { count: 'exact', head: true }).eq('survey_id', active.id)
      );
      surveyResponsesCount = respondents;
      tracerSurveyCompletionRate = surveyTargetCount > 0 ? Math.round((respondents / surveyTargetCount) * 100) : 0;
    }

    res.json({
      totalAlumni: totalAlumni || 0,
      verifiedAlumni: verifiedAlumni || 0,
      activeAlumni: totalProfiles || 0,
      registeredThisYear,
      employedCount,
      employedPercentage: Math.round((employedCount / totalWithStatus) * 100),
      unemployedPercentage: Math.round((unemployedCount / totalWithStatus) * 100),
      averageSalary,
      highestSalary,
      lowestSalary,
      alumniWithSalary,
      averageTimeToEmployment,
      workAlignmentRate: alignmentTotal > 0 ? Math.round((matchedCount / alignmentTotal) * 100) : 0,
      workAlignmentAligned: matchedCount,
      workAlignmentPartial: partialCount,
      workAlignmentNotAligned: notAlignedCount,
      workAlignmentTotal: alignmentTotal + notAlignedCount,
      tracerSurveyCompletionRate,
      surveyResponsesCount,
      surveyTargetCount,
      partnerCompanies: partnerCompanies || 0,
      activeSurveyCount: activeSurveyCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (_req, res, next) => {
  try {
    const [employment, education, users, profiles, alumniSkills] = await Promise.all([
      safeData(supabase.from('employment').select('company_name, company_industry, is_current, salary_range, profile_id, employment_status, job_type, start_date')),
      safeData(supabase.from('education').select('program, year_graduated, profile_id')),
      safeData(supabase.from('users').select('created_at').eq('role', 'alumni')),
      safeData(supabase.from('profiles').select('city, province, country')),
      safeData(supabase.from('skills').select('name')),
    ]);

    const currentEmployment = employment.filter((e: any) => e.is_current);

    const statusDistribution: Record<string, number> = {};
    currentEmployment.forEach((e: any) => {
      const s = e.employment_status || 'unknown';
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    });

    const alumniByCourse: Record<string, number> = {};
    education?.forEach((e: any) => {
      if (e.program) alumniByCourse[e.program] = (alumniByCourse[e.program] || 0) + 1;
    });

    const industryDistribution: Record<string, number> = {};
    currentEmployment.forEach((e: any) => {
      if (e.company_industry) industryDistribution[e.company_industry] = (industryDistribution[e.company_industry] || 0) + 1;
    });

    const topHiringCompanies: Record<string, number> = {};
    currentEmployment.forEach((e: any) => {
      if (e.company_name) topHiringCompanies[e.company_name] = (topHiringCompanies[e.company_name] || 0) + 1;
    });

    const salaryDistribution: Record<string, number> = {};
    employment.forEach((e: any) => {
      if (e.salary_range) salaryDistribution[e.salary_range] = (salaryDistribution[e.salary_range] || 0) + 1;
    });

    const batchData: Record<string, { employed: number; total: number }> = {};
    const allEmploymentByProfile: Record<string, any[]> = {};
    employment.forEach((e: any) => {
      if (!allEmploymentByProfile[e.profile_id]) allEmploymentByProfile[e.profile_id] = [];
      allEmploymentByProfile[e.profile_id].push(e);
    });
    education?.forEach((e: any) => {
      const year = String(e.year_graduated);
      if (!batchData[year]) batchData[year] = { employed: 0, total: 0 };
      batchData[year].total++;
      const emp = allEmploymentByProfile[e.profile_id];
      if (emp && emp.some((j: any) => j.is_current && ['employed', 'self-employed', 'entrepreneur'].includes(j.employment_status))) {
        batchData[year].employed++;
      }
    });

    const skillsInDemand: Record<string, number> = {};
    alumniSkills?.forEach((s: any) => {
      if (s.name) skillsInDemand[s.name] = (skillsInDemand[s.name] || 0) + 1;
    });

    const geographicDistribution: Record<string, number> = {};
    profiles?.forEach((p: any) => {
      const loc = p.city || p.province || 'Unknown';
      geographicDistribution[loc] = (geographicDistribution[loc] || 0) + 1;
    });

    const employmentTypeDistribution: Record<string, number> = {};
    currentEmployment.forEach((e: any) => {
      const t = e.job_type || 'unknown';
      employmentTypeDistribution[t] = (employmentTypeDistribution[t] || 0) + 1;
    });

    const eduMap = new Map(education?.map((e: any) => [e.profile_id, e]) || []);
    const aligend: number[] = [];
    const partial: number[] = [];
    const notAligend: number[] = [];
    employment.forEach((emp: any) => {
      if (!emp.company_industry) return;
      const edu = eduMap.get(emp.profile_id);
      if (edu && edu.program) {
        const prog = edu.program.toLowerCase();
        const ind = emp.company_industry.toLowerCase();
        const progWords = prog.split(/\s+/);
        const indWords = ind.split(/\s+/);
        const hasOverlap = progWords.some((w: string) => indWords.includes(w) || ind.includes(w)) ||
                           indWords.some((w: string) => prog.includes(w));
        if (hasOverlap) aligend.push(1);
        else partial.push(1);
      } else {
        notAligend.push(1);
      }
    });
    const totalWork = aligend.length + partial.length + notAligend.length || 1;

    const timeBuckets = { under3: 0, m3to6: 0, m6to12: 0, over12: 0 };
    employment.forEach((emp: any) => {
      const edu = eduMap.get(emp.profile_id);
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

    const totalStatus = Object.values(statusDistribution).reduce((a, b) => a + b, 0) || 1;
    const totalGeo = Object.values(geographicDistribution).reduce((a, b) => a + b, 0) || 1;

    res.json({
      statusDistribution: sortByValue(statusDistribution).map(([status, count]) => ({
        status, count, percentage: Math.round((count / totalStatus) * 100),
      })),
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
        { label: 'Aligned with Degree', count: aligend.length, percentage: Math.round((aligend.length / totalWork) * 100) },
        { label: 'Partially Aligned', count: partial.length, percentage: Math.round((partial.length / totalWork) * 100) },
        { label: 'Not Aligned', count: notAligend.length, percentage: Math.round((notAligend.length / totalWork) * 100) },
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
