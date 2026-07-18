import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

async function safeData(query: any): Promise<any[]> {
  try { const { data } = await query; return data || []; }
  catch { return []; }
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

router.get('/salary-distribution', async (_req, res, next) => {
  try {
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

    res.json(Object.entries(brackets).map(([range, count]) => ({ range, count })));
  } catch (err) {
    next(err);
  }
});

router.get('/degree-alignment', async (_req, res, next) => {
  try {
    const { data: education } = await supabase.from('education').select('profile_id, program');
    const { data: employment } = await supabase.from('employment').select('profile_id, company_industry, is_current');
    const { data: jobs } = await supabase.from('job_postings').select('position, description');

    const eduMap = new Map(education?.map((e) => [e.profile_id, e.program]) || []);
    const empIndustries = new Map<string, string[]>();
    employment?.forEach((e) => {
      if (e.is_current && e.company_industry) {
        const existing = empIndustries.get(e.profile_id) || [];
        existing.push(e.company_industry);
        empIndustries.set(e.profile_id, existing);
      }
    });

    const courseIndustryMap: Record<string, string[]> = {
      'BSIT': ['Technology', 'Software', 'IT'],
      'BIT': ['Technology', 'IT'],
      'BEEd': ['Education', 'Training'],
      'BSEd-Math': ['Education', 'Training'],
      'BTLED-HE': ['Education', 'Training'],
      'BTLED-ICT': ['Education', 'Technology', 'IT'],
    };

    const alignment: Record<string, { total: number; aligned: number }> = {};
    eduMap.forEach((program, profileId) => {
      if (!program) return;
      if (!alignment[program]) alignment[program] = { total: 0, aligned: 0 };
      alignment[program].total++;
      const industries = empIndustries.get(profileId) || [];
      const matchedIndustries = courseIndustryMap[program] || [];
      const isAligned = industries.some((ind) => matchedIndustries.some((m) => ind.toLowerCase().includes(m.toLowerCase())));
      if (isAligned) alignment[program].aligned++;
    });

    res.json(Object.entries(alignment).map(([course, stats]) => ({
      course, total: stats.total, aligned: stats.aligned,
      rate: stats.total > 0 ? Math.round((stats.aligned / stats.total) * 100) : 0,
    })));
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
    const { data: profiles } = await supabase.from('profiles').select('id');
    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');

    const totalAlumni = users?.length || 0;
    const totalProfiles = profiles?.length || 0;
    const currentEmployment = employment?.filter((e: any) => e.is_current) || [];
    const allEmployment = employment || [];

    const employed = currentEmployment.filter((e: any) => e.employment_status === 'employed').length;
    const selfEmployed = currentEmployment.filter((e: any) => ['self-employed', 'entrepreneur'].includes(e.employment_status)).length;
    const unemployed = currentEmployment.filter((e: any) => ['unemployed', 'seeking'].includes(e.employment_status)).length;
    const underemployed = currentEmployment.filter((e: any) => e.employment_status === 'employed' && e.salary_range).length;

    const withSalary = currentEmployment.filter((e: any) => e.salary_range);
    const totalWithSalary = withSalary.length;

    res.json({
      totalAlumni,
      totalProfiles,
      employmentRate: totalAlumni > 0 ? Math.round(((employed + selfEmployed) / totalAlumni) * 100) : 0,
      unemploymentRate: totalAlumni > 0 ? Math.round((unemployed / totalAlumni) * 100) : 0,
      selfEmployedRate: totalAlumni > 0 ? Math.round((selfEmployed / totalAlumni) * 100) : 0,
      employed,
      unemployed,
      selfEmployed,
      underemployedEstimate: totalAlumni > 0 ? Math.round((underemployed / totalAlumni) * 100) : 0,
      localEmployed: employed,
      overseasEmployed: 0,
      averageSalaryAvailable: totalWithSalary > 0,
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

router.get('/career-statistics', async (_req, res, next) => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, employment_status, current_job_title, company_name, industry, salary_range, last_updated_at, first_name, last_name');
    const { data: users } = await supabase.from('users').select('id').eq('role', 'alumni');
    const { data: education } = await supabase.from('education').select('profile_id, program, year_graduated');

    const totalAlumni = users?.length || 0;
    const allProfiles = profiles || [];

    const withStatus = allProfiles.filter((p: any) => p.employment_status);
    const employed = withStatus.filter((p: any) => p.employment_status === 'Employed').length;
    const unemployed = withStatus.filter((p: any) => p.employment_status === 'Unemployed').length;
    const selfEmployed = withStatus.filter((p: any) => p.employment_status === 'Self-employed').length;
    const seeking = withStatus.filter((p: any) => p.employment_status === 'Seeking Opportunities').length;
    
    const retired = withStatus.filter((p: any) => p.employment_status === 'Retired').length;

    const missingInfo = allProfiles.filter((p: any) => !p.employment_status).length;

    const statusDistribution = [
      { status: 'Employed', count: employed },
      { status: 'Unemployed', count: unemployed },
      { status: 'Self-employed', count: selfEmployed },
      { status: 'Seeking Opportunities', count: seeking },

      { status: 'Retired', count: retired },
    ].filter((s) => s.count > 0);

    const industryCount: Record<string, number> = {};
    allProfiles.forEach((p: any) => {
      if (p.industry) {
        industryCount[p.industry] = (industryCount[p.industry] || 0) + 1;
      }
    });
    const byIndustry = Object.entries(industryCount)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);

    const salaryCount: Record<string, number> = {};
    allProfiles.forEach((p: any) => {
      if (p.salary_range) {
        salaryCount[p.salary_range] = (salaryCount[p.salary_range] || 0) + 1;
      }
    });
    const bySalary = Object.entries(salaryCount)
      .map(([range, count]) => ({ range, count }))
      .sort((a, b) => b.count - a.count);

    const companyCount: Record<string, { count: number; industry: string }> = {};
    allProfiles.forEach((p: any) => {
      if (p.company_name) {
        if (!companyCount[p.company_name]) {
          companyCount[p.company_name] = { count: 0, industry: p.industry || '' };
        }
        companyCount[p.company_name].count++;
      }
    });
    const topCompanies = Object.entries(companyCount)
      .map(([name, data]) => ({ company: name, count: data.count, industry: data.industry }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const recentlyUpdated = allProfiles
      .filter((p: any) => p.last_updated_at)
      .sort((a: any, b: any) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime())
      .slice(0, 20)
      .map((p: any) => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        employment_status: p.employment_status,
        company_name: p.company_name,
        current_job_title: p.current_job_title,
        last_updated_at: p.last_updated_at,
      }));

    const withoutInfo = allProfiles
      .filter((p: any) => !p.employment_status)
      .map((p: any) => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      }));

    res.json({
      overview: {
        totalAlumni,
        employed,
        unemployed,
        selfEmployed,
        seeking,
        retired,
        employmentRate: totalAlumni > 0 ? Math.round(((employed + selfEmployed) / totalAlumni) * 100) : 0,
        missingInfo,
      },
      statusDistribution,
      byIndustry,
      bySalary,
      topCompanies,
      recentlyUpdated,
      withoutInfo,
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
