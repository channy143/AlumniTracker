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
      totalAlumni, verifiedAlumni, activeConnections, pendingReferrals,
      alumniAvailableForReferral, activeJobs, verifiedCompanies, totalProfiles,
    ] = await Promise.all([
      safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni')),
      safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni').eq('is_verified', true)),
      safeCount(supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted')),
      safeCount(supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
      safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('available_for_referral', true)),
      safeCount(supabase.from('job_postings').select('*', { count: 'exact', head: true }).gte('expires_at', new Date().toISOString())),
      safeData(supabase.from('companies').select('id').eq('is_verified', true)),
      safeCount(supabase.from('profiles').select('*', { count: 'exact', head: true })),
    ]);

    const employmentData = await safeData(
      supabase.from('employment').select('employment_status').eq('is_current', true)
    );
    const employedCount = employmentData.filter((e: any) =>
      ['employed', 'self-employed', 'entrepreneur'].includes(e.employment_status)
    ).length;
    const overseasCount = employmentData.filter((e: any) =>
      e.employment_status === 'employed' && false
    ).length;

    res.json({
      totalAlumni: totalAlumni || 0,
      activeAlumni: totalProfiles || 0,
      verifiedAlumni: verifiedAlumni || 0,
      companiesConnected: verifiedCompanies?.length || 0,
      alumniAvailableForReferral: alumniAvailableForReferral || 0,
      pendingReferralRequests: pendingReferrals || 0,
      activeJobs: activeJobs || 0,
      alumniNetworkConnections: activeConnections || 0,
      employedAlumni: employedCount || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (_req, res, next) => {
  try {
    const education = await safeData(supabase.from('education').select('program, year_graduated'));
    const employment = await safeData(supabase.from('employment').select('company_name, company_industry, is_current, salary_range, profile_id, employment_status').eq('is_current', true));
    const users = await safeData(supabase.from('users').select('created_at, role').eq('role', 'alumni'));

    const alumniByCourse: Record<string, number> = {};
    const alumniByYear: Record<string, number> = {};
    const industryDistribution: Record<string, number> = {};
    const topHiringCompanies: Record<string, number> = {};
    const monthlyRegistrations: Record<string, number> = {};

    education?.forEach((e: any) => {
      if (e.program) alumniByCourse[e.program] = (alumniByCourse[e.program] || 0) + 1;
      if (e.year_graduated) {
        const key = String(e.year_graduated);
        alumniByYear[key] = (alumniByYear[key] || 0) + 1;
      }
    });

    employment?.forEach((e: any) => {
      if (e.company_industry) industryDistribution[e.company_industry] = (industryDistribution[e.company_industry] || 0) + 1;
      if (e.company_name) topHiringCompanies[e.company_name] = (topHiringCompanies[e.company_name] || 0) + 1;
    });

    users?.forEach((u: any) => {
      if (u.created_at) {
        const key = new Date(u.created_at).toISOString().slice(0, 7);
        monthlyRegistrations[key] = (monthlyRegistrations[key] || 0) + 1;
      }
    });

    const totalEmployed = employment?.length || 0;
    const totalAlumni = users?.length || 0;
    const employmentRate = totalAlumni > 0 ? Math.round((totalEmployed / totalAlumni) * 100) : 0;

    const selfEmployed = employment?.filter((e: any) => e.employment_status === 'self-employed' || e.employment_status === 'entrepreneur').length || 0;

    const allEmployment = await safeData(supabase.from('employment').select('company_industry, profile_id'));
    const allEducation = await safeData(supabase.from('education').select('program, profile_id'));
    const eduMap = new Map(allEducation?.map((e: any) => [e.profile_id, e.program]) || []);
    const jobAlignment: Record<string, { matched: number; total: number }> = {};
    allEmployment?.forEach((emp: any) => {
      const program = eduMap.get(emp.profile_id);
      if (program && emp.company_industry) {
        if (!jobAlignment[program]) jobAlignment[program] = { matched: 0, total: 0 };
        jobAlignment[program].total++;
      }
    });

    const connectionsData = await safeData(supabase.from('connections').select('created_at'));
    const monthlyConnections: Record<string, number> = {};
    connectionsData?.forEach((c: any) => {
      if (c.created_at) {
        const key = new Date(c.created_at).toISOString().slice(0, 7);
        monthlyConnections[key] = (monthlyConnections[key] || 0) + 1;
      }
    });

    const referralData = await safeData(supabase.from('referral_requests').select('created_at'));
    const monthlyReferrals: Record<string, number> = {};
    referralData?.forEach((r: any) => {
      if (r.created_at) {
        const key = new Date(r.created_at).toISOString().slice(0, 7);
        monthlyReferrals[key] = (monthlyReferrals[key] || 0) + 1;
      }
    });

    const sortByValue = (obj: Record<string, number>) => Object.entries(obj).sort(([, a], [, b]) => b - a);

    res.json({
      employmentRate,
      selfEmployedRate: totalEmployed > 0 ? Math.round((selfEmployed / totalEmployed) * 100) : 0,
      alumniByYear: sortByValue(alumniByYear).map(([year, count]) => ({ year, count })),
      alumniByCourse: sortByValue(alumniByCourse).map(([course, count]) => ({ course, count })),
      industryDistribution: sortByValue(industryDistribution).map(([industry, count]) => ({ industry, count })),
      topHiringCompanies: sortByValue(topHiringCompanies).slice(0, 10).map(([company, count]) => ({ company, count })),
      jobAlignment: Object.entries(jobAlignment).map(([course, data]) => ({ course, ...data })),
      monthlyRegistrations: sortByValue(monthlyRegistrations).map(([month, count]) => ({ month, count })),
      monthlyConnections: sortByValue(monthlyConnections).map(([month, count]) => ({ month, count })),
      monthlyReferrals: sortByValue(monthlyReferrals).map(([month, count]) => ({ month, count })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
