import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mode(arr: number[]): number[] {
  if (!arr.length) return [];
  const freq: Record<number, number> = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq <= 1) return [];
  return Object.entries(freq).filter(([, v]) => v === maxFreq).map(([k]) => Number(k));
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const squaredDiffs = arr.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - 1));
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (idx - lower) * (sorted[upper] - sorted[lower]);
}

function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0) return 0;
  const cubedDeviations = arr.map((v) => ((v - m) / sd) ** 3);
  return (arr.length / ((arr.length - 1) * (arr.length - 2))) * cubedDeviations.reduce((a, b) => a + b, 0);
}

function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0) return 0;
  const fourthPower = arr.map((v) => ((v - m) / sd) ** 4);
  const n = arr.length;
  const excess = (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * fourthPower.reduce((a, b) => a + b, 0);
  return excess - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

async function safeCount(query: any): Promise<number> {
  try { const { count } = await query; return count || 0; }
  catch { return 0; }
}

async function safeData(query: any): Promise<any[]> {
  try { const { data } = await query; return data || []; }
  catch { return []; }
}

router.get('/overview', authenticate, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { count: totalAlumni } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: employed } = await supabase
      .from('employment')
      .select('*', { count: 'exact', head: true })
      .eq('is_current', true);

    const { data: industries } = await supabase
      .from('employment')
      .select('company_industry');

    const industryCount: Record<string, number> = {};
    industries?.forEach((e) => {
      if (e.company_industry) {
        industryCount[e.company_industry] = (industryCount[e.company_industry] || 0) + 1;
      }
    });

    const topIndustries = Object.entries(industryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalAlumni,
      employedPercentage: totalAlumni ? Math.round((employed! / totalAlumni) * 100) : 0,
      topIndustries,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/batch/:year', authenticate, async (req, res, next) => {
  try {
    const { year } = req.params;
    const { data: graduates } = await supabase
      .from('education')
      .select('profile_id')
      .eq('year_graduated', parseInt(year));

    if (!graduates?.length) {
      return res.json({ batch: year, total: 0, employmentRate: 0, industries: [] });
    }

    const profileIds = graduates.map((g) => g.profile_id);
    const { data: employment } = await supabase
      .from('employment')
      .select('*')
      .in('profile_id', profileIds)
      .eq('is_current', true);

    const industryCount: Record<string, number> = {};
    employment?.forEach((e) => {
      if (e.company_industry) {
        industryCount[e.company_industry] = (industryCount[e.company_industry] || 0) + 1;
      }
    });

    res.json({
      batch: year,
      total: graduates.length,
      employmentRate: graduates.length
        ? Math.round((employment?.length || 0) / graduates.length * 100)
        : 0,
      industries: Object.entries(industryCount).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/industries', authenticate, async (_req, res, next) => {
  try {
    const { data: employment, error } = await supabase
      .from('employment')
      .select('company_industry, salary_range')
      .eq('is_current', true);

    if (error) throw new AppError(error.message, 500);

    const industryData: Record<string, { count: number; salaries: number[] }> = {};
    employment?.forEach((e) => {
      if (e.company_industry) {
        if (!industryData[e.company_industry]) {
          industryData[e.company_industry] = { count: 0, salaries: [] };
        }
        industryData[e.company_industry].count++;
      }
    });

    const industries = Object.entries(industryData).map(([name, data]) => ({
      name,
      count: data.count,
    }));

    res.json(industries);
  } catch (err) {
    next(err);
  }
});

router.get('/statistics', authenticate, async (_req, res, next) => {
  try {
    const employment = await safeData(
      supabase.from('employment').select('profile_id, company_industry, employment_status, salary_range, start_date, is_current, created_at')
    );
    const education = await safeData(
      supabase.from('education').select('profile_id, program, year_graduated')
    );
    const profiles = await safeData(
      supabase.from('profiles').select('id, created_at')
    );
    const connections = await safeData(
      supabase.from('connections').select('created_at, status')
    );
    const referrals = await safeData(
      supabase.from('referral_requests').select('created_at, status')
    );

    const totalAlumni = profiles.length;
    const currentEmployment = employment.filter((e: any) => e.is_current);
    const employed = currentEmployment.filter((e: any) => e.employment_status === 'employed').length;
    const selfEmployed = currentEmployment.filter((e: any) => ['self-employed', 'entrepreneur'].includes(e.employment_status)).length;
    const unemployed = currentEmployment.filter((e: any) => ['unemployed', 'seeking'].includes(e.employment_status)).length;
    const employmentStatuses = currentEmployment.map((e: any) => e.employment_status);
    const totalEmployed = currentEmployment.length;

    const monthsToEmployment: number[] = [];
    const eduMap = new Map(education.map((e: any) => [e.profile_id, e.year_graduated]));
    employment.forEach((e: any) => {
      if (e.start_date && eduMap.has(e.profile_id)) {
        const gradYear = eduMap.get(e.profile_id);
        const gradDate = new Date(gradYear, 5, 1);
        const start = new Date(e.start_date);
        const diffMonths = (start.getFullYear() - gradDate.getFullYear()) * 12 + (start.getMonth() - gradDate.getMonth());
        if (diffMonths >= 0) monthsToEmployment.push(diffMonths);
      }
    });

    const salaries: number[] = [];
    employment.forEach((e: any) => {
      if (e.salary_range) {
        const nums = e.salary_range.replace(/[^0-9\-.]/g, '').split('-').map(Number).filter((n: number) => !isNaN(n));
        if (nums.length > 0) {
          const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
          salaries.push(avg);
        }
      }
    });

    const jobTenureMonths: number[] = [];
    employment.forEach((e: any) => {
      if (e.start_date) {
        const end = e.end_date ? new Date(e.end_date) : new Date();
        const start = new Date(e.start_date);
        const tenure = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (tenure > 0) jobTenureMonths.push(tenure);
      }
    });

    const industries = currentEmployment.map((e: any) => e.company_industry).filter(Boolean);
    const industryFreq: Record<string, number> = {};
    industries.forEach((ind: string) => { industryFreq[ind] = (industryFreq[ind] || 0) + 1; });

    const industryDistribution = Object.entries(industryFreq).map(([name, count]) => ({
      name, count,
      percentage: totalAlumni > 0 ? Math.round((count / totalAlumni) * 10000) / 100 : 0,
    })).sort((a, b) => b.count - a.count);

    const totalConnections = connections.filter((c: any) => c.status === 'accepted').length;
    const totalReferrals = referrals.length;

    const annualRegistrations: Record<string, number> = {};
    profiles.forEach((p: any) => {
      if (p.created_at) {
        const year = new Date(p.created_at).getFullYear().toString();
        annualRegistrations[year] = (annualRegistrations[year] || 0) + 1;
      }
    });

    res.json({
      sampleSize: totalAlumni,
      employment: {
        totalEmployed,
        employed,
        selfEmployed,
        unemployed,
        employmentRate: totalAlumni > 0 ? Math.round((totalEmployed / totalAlumni) * 10000) / 100 : 0,
        unemploymentRate: totalAlumni > 0 ? Math.round((unemployed / totalAlumni) * 10000) / 100 : 0,
        selfEmploymentRate: totalAlumni > 0 ? Math.round((selfEmployed / totalAlumni) * 10000) / 100 : 0,
        statusDistribution: [
          { status: 'Employed', count: employed, percentage: totalAlumni > 0 ? Math.round(employed / totalAlumni * 10000) / 100 : 0 },
          { status: 'Self-Employed', count: selfEmployed, percentage: totalAlumni > 0 ? Math.round(selfEmployed / totalAlumni * 10000) / 100 : 0 },
          { status: 'Unemployed', count: unemployed, percentage: totalAlumni > 0 ? Math.round(unemployed / totalAlumni * 10000) / 100 : 0 },
        ],
      },
      timeToEmployment: {
        sampleSize: monthsToEmployment.length,
        mean: Math.round(mean(monthsToEmployment) * 100) / 100,
        median: Math.round(median(monthsToEmployment) * 100) / 100,
        mode: mode(monthsToEmployment).map((v) => Math.round(v * 100) / 100),
        stdDev: Math.round(stdDev(monthsToEmployment) * 100) / 100,
        min: monthsToEmployment.length > 0 ? Math.min(...monthsToEmployment) : 0,
        max: monthsToEmployment.length > 0 ? Math.max(...monthsToEmployment) : 0,
        range: monthsToEmployment.length > 0 ? Math.max(...monthsToEmployment) - Math.min(...monthsToEmployment) : 0,
        percentile25: Math.round(percentile(monthsToEmployment, 25) * 100) / 100,
        percentile75: Math.round(percentile(monthsToEmployment, 75) * 100) / 100,
        skewness: Math.round(skewness(monthsToEmployment) * 100) / 100,
        kurtosis: Math.round(kurtosis(monthsToEmployment) * 100) / 100,
      },
      salary: {
        sampleSize: salaries.length,
        mean: Math.round(mean(salaries) * 100) / 100,
        median: Math.round(median(salaries) * 100) / 100,
        mode: mode(salaries).map((v) => Math.round(v * 100) / 100),
        stdDev: Math.round(stdDev(salaries) * 100) / 100,
        min: salaries.length > 0 ? Math.min(...salaries) : 0,
        max: salaries.length > 0 ? Math.max(...salaries) : 0,
        range: salaries.length > 0 ? Math.max(...salaries) - Math.min(...salaries) : 0,
        percentile10: Math.round(percentile(salaries, 10) * 100) / 100,
        percentile25: Math.round(percentile(salaries, 25) * 100) / 100,
        percentile75: Math.round(percentile(salaries, 75) * 100) / 100,
        percentile90: Math.round(percentile(salaries, 90) * 100) / 100,
        skewness: Math.round(skewness(salaries) * 100) / 100,
        kurtosis: Math.round(kurtosis(salaries) * 100) / 100,
      },
      jobTenure: {
        sampleSize: jobTenureMonths.length,
        mean: Math.round(mean(jobTenureMonths) * 100) / 100,
        median: Math.round(median(jobTenureMonths) * 100) / 100,
        stdDev: Math.round(stdDev(jobTenureMonths) * 100) / 100,
        min: jobTenureMonths.length > 0 ? Math.min(...jobTenureMonths) : 0,
        max: jobTenureMonths.length > 0 ? Math.max(...jobTenureMonths) : 0,
      },
      industries: {
        total: industryDistribution.length,
        distribution: industryDistribution.slice(0, 15),
        herfindahlIndex: Math.round(industryDistribution.reduce((sum, ind) => sum + (ind.percentage / 100) ** 2, 0) * 10000) / 10000,
      },
      networking: {
        totalConnections,
        totalReferrals,
        connectionRate: totalAlumni > 0 ? Math.round((totalConnections / totalAlumni) * 10000) / 100 : 0,
      },
      growth: Object.entries(annualRegistrations).sort().map(([year, count]) => ({ year, count })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/salary-statistics', authenticate, async (_req, res, next) => {
  try {
    const employment = await safeData(
      supabase.from('employment').select('salary_range, company_industry, employment_status, profile_id').eq('is_current', true)
    );

    const byIndustry: Record<string, number[]> = {};
    const allSalaries: number[] = [];

    employment.forEach((e: any) => {
      if (e.salary_range) {
        const nums = e.salary_range.replace(/[^0-9\-.]/g, '').split('-').map(Number).filter((n: number) => !isNaN(n));
        if (nums.length > 0) {
          const avg = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
          allSalaries.push(avg);
          if (e.company_industry) {
            if (!byIndustry[e.company_industry]) byIndustry[e.company_industry] = [];
            byIndustry[e.company_industry].push(avg);
          }
        }
      }
    });

    const industrySalaryStats = Object.entries(byIndustry).map(([industry, sals]) => ({
      industry,
      count: sals.length,
      mean: Math.round(mean(sals) * 100) / 100,
      median: Math.round(median(sals) * 100) / 100,
      min: Math.round(Math.min(...sals) * 100) / 100,
      max: Math.round(Math.max(...sals) * 100) / 100,
      stdDev: Math.round(stdDev(sals) * 100) / 100,
    })).sort((a, b) => b.mean - a.mean);

    res.json({
      overall: {
        sampleSize: allSalaries.length,
        mean: Math.round(mean(allSalaries) * 100) / 100,
        median: Math.round(median(allSalaries) * 100) / 100,
        min: allSalaries.length > 0 ? Math.round(Math.min(...allSalaries) * 100) / 100 : 0,
        max: allSalaries.length > 0 ? Math.round(Math.max(...allSalaries) * 100) / 100 : 0,
        stdDev: Math.round(stdDev(allSalaries) * 100) / 100,
        percentile10: Math.round(percentile(allSalaries, 10) * 100) / 100,
        percentile25: Math.round(percentile(allSalaries, 25) * 100) / 100,
        percentile75: Math.round(percentile(allSalaries, 75) * 100) / 100,
        percentile90: Math.round(percentile(allSalaries, 90) * 100) / 100,
        skewness: Math.round(skewness(allSalaries) * 100) / 100,
      },
      byIndustry: industrySalaryStats,
    });
  } catch (err) { next(err); }
});

router.get('/user-career-stats', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const employment = await safeData(
      supabase.from('employment').select('*').eq('profile_id', profile.id).order('start_date', { ascending: false })
    );
    const educationData = await safeData(
      supabase.from('education').select('*').eq('profile_id', profile.id)
    );
    const skills = await safeData(
      supabase.from('skills').select('name, proficiency_level').eq('profile_id', profile.id)
    );
    const sentConnections = await safeCount(
      supabase.from('connections').select('*', { count: 'exact', head: true }).eq('requester_id', profile.id).eq('status', 'accepted')
    );
    const receivedConnections = await safeCount(
      supabase.from('connections').select('*', { count: 'exact', head: true }).eq('recipient_id', profile.id).eq('status', 'accepted')
    );
    const sentReferrals = await safeCount(
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('requester_id', profile.id)
    );
    const receivedReferrals = await safeCount(
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('recipient_id', profile.id)
    );

    const currentJob = employment.find((e: any) => e.is_current);
    const totalExperienceMonths = employment.reduce((acc: number, e: any) => {
      if (e.start_date) {
        const end = e.end_date ? new Date(e.end_date) : new Date();
        const start = new Date(e.start_date);
        return acc + (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      }
      return acc;
    }, 0);

    const totalExperienceYears = Math.round(totalExperienceMonths / 12 * 10) / 10;

    const jobTenures = employment.filter((e: any) => e.start_date).map((e: any) => {
      const end = e.end_date ? new Date(e.end_date) : new Date();
      const start = new Date(e.start_date);
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    });

    const skillsCount = skills.length;
    const avgProficiency = skills.length > 0 ? Math.round(mean(skills.map((s: any) => s.proficiency_level)) * 10) / 10 : 0;
    const graduationYear = educationData[0]?.year_graduated || null;
    const profileAgeMonths = profile.created_at
      ? Math.round((Date.now() - new Date(profile.created_at).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
      : 0;

    res.json({
      profileId: profile.id,
      name: `${profile.first_name} ${profile.last_name}`,
      memberSince: profile.created_at,
      profileAgeMonths,
      education: {
        program: educationData[0]?.program || null,
        graduationYear,
        totalDegrees: educationData.length,
      },
      career: {
        currentPosition: currentJob?.position || null,
        currentCompany: currentJob?.company_name || null,
        totalExperienceYears,
        totalExperienceMonths,
        totalJobs: employment.length,
        jobTenureMean: jobTenures.length > 0 ? Math.round(mean(jobTenures) * 10) / 10 : 0,
        jobTenureMedian: jobTenures.length > 0 ? Math.round(median(jobTenures) * 10) / 10 : 0,
        yearsSinceGraduation: graduationYear ? (new Date().getFullYear() - graduationYear) : 0,
      },
      skills: {
        total: skillsCount,
        averageProficiency: avgProficiency,
        topSkills: skills.sort((a: any, b: any) => b.proficiency_level - a.proficiency_level).slice(0, 5).map((s: any) => s.name),
      },
      network: {
        connections: sentConnections + receivedConnections,
        sentReferrals,
        receivedReferrals,
        totalReferrals: sentReferrals + receivedReferrals,
      },
    });
  } catch (err) { next(err); }
});

router.get('/industry-trends', authenticate, async (_req, res, next) => {
  try {
    const employment = await safeData(
      supabase.from('employment').select('profile_id, company_industry, start_date, is_current, employment_status')
    );
    const education = await safeData(
      supabase.from('education').select('profile_id, year_graduated')
    );

    const eduProfileYear = new Map(education.map((e: any) => [e.profile_id, e.year_graduated]));
    const byYear: Record<string, Record<string, number>> = {};

    employment.forEach((e: any) => {
      if (e.is_current && e.company_industry) {
        const gradYear = eduProfileYear.get(e.profile_id);
        if (gradYear) {
          const yearKey = String(gradYear);
          if (!byYear[yearKey]) byYear[yearKey] = {};
          byYear[yearKey][e.company_industry] = (byYear[yearKey][e.company_industry] || 0) + 1;
        }
      }
    });

    const years = Object.keys(byYear).sort();
    const allIndustries = new Set<string>();
    years.forEach((y) => Object.keys(byYear[y]).forEach((ind) => allIndustries.add(ind)));

    const topIndustries = [...allIndustries]
      .map((ind) => ({ name: ind, total: years.reduce((sum, y) => sum + (byYear[y][ind] || 0), 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((i) => i.name);

    const trends = years.map((year) => {
      const entry: Record<string, any> = { year: parseInt(year) };
      topIndustries.forEach((ind) => { entry[ind] = byYear[year][ind] || 0; });
      return entry;
    });

    res.json({ years, industries: topIndustries, trends });
  } catch (err) { next(err); }
});

router.get('/employment-time-series', authenticate, async (_req, res, next) => {
  try {
    const employment = await safeData(
      supabase.from('employment').select('start_date, is_current, profile_id').order('start_date', { ascending: true })
    );
    const monthlyCount: Record<string, number> = {};
    employment.forEach((e: any) => {
      if (e.start_date) {
        const key = new Date(e.start_date).toISOString().slice(0, 7);
        monthlyCount[key] = (monthlyCount[key] || 0) + 1;
      }
    });

    const sorted = Object.entries(monthlyCount).sort(([a], [b]) => a.localeCompare(b));
    const cumulative: Record<string, number> = {};
    let running = 0;
    sorted.forEach(([month, count]) => {
      running += count;
      cumulative[month] = running;
    });

    res.json({
      monthly: sorted.map(([month, count]) => ({ month, count })),
      cumulative: Object.entries(cumulative).map(([month, total]) => ({ month, total })),
    });
  } catch (err) { next(err); }
});

export default router;
