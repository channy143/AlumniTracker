import { Router } from 'express';
import { supabase } from '../services/supabase';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/employer/dashboard
 * Read-only metrics & shortlisted candidates for employers.
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res, next) => {
  try {
    const employerId = (req.query.employer_id as string) || '';

    let jobsQuery = supabase
      .from('job_postings')
      .select('id, company_name, position, location, job_type, created_at, expires_at, employer_id');

    if (employerId) {
      jobsQuery = jobsQuery.eq('employer_id', employerId);
    }

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError && (jobsError.code === '42P01' || jobsError.code === 'PGRST205')) {
      return res.json({
        stats: { active_jobs: 0, total_applicants: 0, shortlisted_count: 0 },
        shortlisted: [],
        jobs: [],
      });
    }
    if (jobsError) throw new AppError(jobsError.message, 500);

    const jobList = jobs || [];
    const nowIso = new Date().toISOString();
    const activeJobs = jobList.filter((j) => !j.expires_at || j.expires_at >= nowIso);
    const jobIds = jobList.map((j) => j.id);

    if (jobIds.length === 0) {
      return res.json({
        stats: { active_jobs: 0, total_applicants: 0, shortlisted_count: 0 },
        shortlisted: [],
        jobs: [],
      });
    }

    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id, status, applied_at, match_percentage, matched_skills, missing_skills, screening_notes, applicant_name, applicant_email, resume_url')
      .in('job_id', jobIds);

    if (appError && (appError.code === '42P01' || appError.code === 'PGRST205')) {
      return res.json({
        stats: { active_jobs: activeJobs.length, total_applicants: 0, shortlisted_count: 0 },
        shortlisted: [],
        jobs: jobList,
      });
    }
    if (appError) throw new AppError(appError.message, 500);

    const allApps = applications || [];
    const shortlistedApps = allApps.filter((a) => a.status === 'shortlisted');

    // Fetch profile details for shortlisted candidates
    const userIds = shortlistedApps.map((a) => a.user_id).filter(Boolean);
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, avatar_url, education:education(program, year_graduated)')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const jobMap = new Map(jobList.map((j) => [j.id, j]));

    const shortlisted = shortlistedApps.map((a) => {
      const job = jobMap.get(a.job_id);
      const prof = profileMap.get(a.user_id);
      const edu = prof?.education?.[0];

      return {
        id: a.id,
        user_id: a.user_id,
        applicant_name: a.applicant_name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Applicant'),
        applicant_email: a.applicant_email,
        avatar_url: prof?.avatar_url || null,
        batch_year: edu?.year_graduated ? String(edu.year_graduated) : null,
        program: edu?.program || null,
        job_id: a.job_id,
        job_title: job?.position || 'Position',
        company_name: job?.company_name || 'Employer',
        applied_at: a.applied_at,
        match_percentage: a.match_percentage ?? 0,
        matched_skills: a.matched_skills || [],
        missing_skills: a.missing_skills || [],
        screening_notes: a.screening_notes || null,
        resume_url: a.resume_url || null,
      };
    });

    res.json({
      stats: {
        active_jobs: activeJobs.length,
        total_applicants: allApps.length,
        shortlisted_count: shortlistedApps.length,
      },
      shortlisted,
      jobs: jobList,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/employer/reports/:jobId
 * Download Screening Report for shortlisted applicants.
 */
router.get('/reports/:jobId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const jobId = req.params.jobId;

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name, employer_id')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError) throw new AppError(jobError.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'shortlisted')
      .order('match_percentage', { ascending: false });

    if (appError) throw new AppError(appError.message, 500);

    const userIds = (applications || []).map((a: any) => a.user_id).filter(Boolean);
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, education:education(program, year_graduated)')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const esc = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const headers = ['Applicant Name', 'Email', 'Batch', 'Program', 'Match Score', 'Matched Skills', 'Notes', 'Application Date'];
    const rows = (applications || []).map((a: any) => {
      const prof = profileMap.get(a.user_id);
      const edu = prof?.education?.[0];
      return [
        esc(a.applicant_name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '')),
        esc(a.applicant_email || prof?.email || ''),
        esc(edu?.year_graduated ? String(edu.year_graduated) : 'N/A'),
        esc(edu?.program || 'N/A'),
        `${a.match_percentage ?? 0}%`,
        esc((a.matched_skills || []).join('; ')),
        esc(a.screening_notes || ''),
        new Date(a.applied_at).toLocaleDateString(),
      ];
    });

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Record in employer_reports table if employer_id exists
    try {
      if (job.employer_id) {
        await supabase.from('employer_reports').insert({
          employer_id: job.employer_id,
          job_posting_id: job.id,
          report_data: { candidate_count: applications?.length || 0, generated_by: 'employer_portal' },
          generated_at: new Date().toISOString(),
          exported_at: new Date().toISOString(),
        });
      }
    } catch {}

    const safeName = (job.position || 'job').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="screening-report-${safeName}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
