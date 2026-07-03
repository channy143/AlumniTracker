import { Router } from 'express';
import { supabase } from '../../services/supabase';

const router = Router();

router.get('/stats', async (_req, res, next) => {
  try {
    const [
      { count: totalAlumni },
      { count: employedAlumni },
      { count: pendingVerifications },
      { count: activeJobs },
      { count: activeAnnouncements },
      { data: companies },
      { count: surveyResponses },
      { count: totalSurveys },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni').eq('is_active', true),
      supabase.from('employment').select('*', { count: 'exact', head: true }).eq('is_current', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni').eq('is_verified', false),
      supabase.from('job_postings').select('*', { count: 'exact', head: true }).gte('expires_at', new Date().toISOString()),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('companies').select('id').eq('is_verified', true),
      supabase.from('survey_responses').select('*', { count: 'exact', head: true }),
      supabase.from('surveys').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      totalAlumni: totalAlumni || 0,
      employedAlumni: employedAlumni || 0,
      unemployedAlumni: (totalAlumni || 0) - (employedAlumni || 0),
      partnerCompanies: companies?.length || 0,
      activeJobs: activeJobs || 0,
      activeAnnouncements: activeAnnouncements || 0,
      pendingVerifications: pendingVerifications || 0,
      surveyResponseRate: totalSurveys && totalSurveys > 0 ? Math.round(((surveyResponses || 0) / totalSurveys) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/charts', async (_req, res, next) => {
  try {
    const { data: education } = await supabase.from('education').select('program, year_graduated');
    const { data: employment } = await supabase.from('employment').select('company_name, company_industry, is_current, salary_range, profile_id, employment_status').eq('is_current', true);
    const { data: users } = await supabase.from('users').select('created_at, role').eq('role', 'alumni');

    const alumniByCourse: Record<string, number> = {};
    const alumniByYear: Record<string, number> = {};
    const industryDistribution: Record<string, number> = {};
    const topHiringCompanies: Record<string, number> = {};
    const monthlyRegistrations: Record<string, number> = {};

    education?.forEach((e) => {
      if (e.program) alumniByCourse[e.program] = (alumniByCourse[e.program] || 0) + 1;
      if (e.year_graduated) {
        const key = String(e.year_graduated);
        alumniByYear[key] = (alumniByYear[key] || 0) + 1;
      }
    });

    employment?.forEach((e) => {
      if (e.company_industry) industryDistribution[e.company_industry] = (industryDistribution[e.company_industry] || 0) + 1;
      if (e.company_name) topHiringCompanies[e.company_name] = (topHiringCompanies[e.company_name] || 0) + 1;
    });

    users?.forEach((u) => {
      if (u.created_at) {
        const key = new Date(u.created_at).toISOString().slice(0, 7);
        monthlyRegistrations[key] = (monthlyRegistrations[key] || 0) + 1;
      }
    });

    const totalEmployed = employment?.length || 0;
    const totalAlumni = users?.length || 0;
    const employmentRate = totalAlumni > 0 ? Math.round((totalEmployed / totalAlumni) * 100) : 0;

    const jobAlignment: Record<string, { matched: number; total: number }> = {};
    const { data: allEmployment } = await supabase.from('employment').select('company_industry, profile_id');
    const { data: allEducation } = await supabase.from('education').select('program, profile_id');
    const eduMap = new Map(allEducation?.map((e) => [e.profile_id, e.program]) || []);
    allEmployment?.forEach((emp) => {
      const program = eduMap.get(emp.profile_id);
      if (program && emp.company_industry) {
        if (!jobAlignment[program]) jobAlignment[program] = { matched: 0, total: 0 };
        jobAlignment[program].total++;
      }
    });

    const sortByValue = (obj: Record<string, number>) => Object.entries(obj).sort(([, a], [, b]) => b - a);

    res.json({
      employmentRate,
      alumniByYear: sortByValue(alumniByYear).map(([year, count]) => ({ year, count })),
      alumniByCourse: sortByValue(alumniByCourse).map(([course, count]) => ({ course, count })),
      industryDistribution: sortByValue(industryDistribution).map(([industry, count]) => ({ industry, count })),
      topHiringCompanies: sortByValue(topHiringCompanies).slice(0, 10).map(([company, count]) => ({ company, count })),
      jobAlignment: Object.entries(jobAlignment).map(([course, data]) => ({ course, ...data })),
      monthlyRegistrations: sortByValue(monthlyRegistrations).map(([month, count]) => ({ month, count })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
