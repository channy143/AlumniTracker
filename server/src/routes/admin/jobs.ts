import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { AuthenticatedRequest } from '../../types';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';
import { sanitizeRichText } from '../../utils/sanitizeHtml';
import {
  adminCreateJobSchema,
  adminUpdateJobSchema,
  applicationStatusSchema,
  screenApplicationSchema,
  createEmployerSchema,
} from '../../middleware/validationSchemas';
import { calculateMatchScore } from '../../utils/matchScoring';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';

    let query = supabase.from('job_postings').select('*', { count: 'exact' });

    if (status === 'active') query = query.gte('expires_at', new Date().toISOString());
    else if (status === 'expired') query = query.lt('expires_at', new Date().toISOString());
    if (search) query = query.or(`position.ilike.%${sanitizeFilterInput(search)}%,company_name.ilike.%${sanitizeFilterInput(search)}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: jobs, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = jobs || [];
    const posterIds = result.map((j: any) => j.posted_by).filter(Boolean);
    if (posterIds.length > 0) {
      const { data: posters } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', posterIds);
      const posterMap = new Map((posters || []).map((p: any) => [p.id, p]));
      result = result.map((j: any) => ({ ...j, profiles: posterMap.get(j.posted_by) || null }));
    }

    const jobIds = result.map((j: any) => j.id).filter(Boolean);
    const referralCounts: Record<string, number> = {};
    const applicantCounts: Record<string, number> = {};
    if (jobIds.length > 0) {
      const { data: referrals } = await supabase
        .from('referral_requests')
        .select('job_id')
        .in('job_id', jobIds);
      referrals?.forEach((r: any) => {
        referralCounts[r.job_id] = (referralCounts[r.job_id] || 0) + 1;
      });

      const { data: applications } = await supabase
        .from('job_applications')
        .select('job_id')
        .in('job_id', jobIds);
      applications?.forEach((a: any) => {
        applicantCounts[a.job_id] = (applicantCounts[a.job_id] || 0) + 1;
      });
    }
    result = result.map((j: any) => ({ ...j, referral_count: referralCounts[j.id] || 0, applicant_count: applicantCounts[j.id] || 0 }));

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/employers', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('employers')
      .select('*')
      .order('company_name', { ascending: true });
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json([]);
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/employers', validate(createEmployerSchema), async (req, res, next) => {
  try {
    const { company_name, industry, contact_person, contact_email } = req.body;
    const { data, error } = await supabase
      .from('employers')
      .insert({
        company_name,
        industry: industry || null,
        contact_person: contact_person || null,
        contact_email: contact_email || null,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.post('/', validate(adminCreateJobSchema), async (req, res, next) => {
  try {
    const {
      company_id,
      employer_id,
      company_name,
      position,
      description,
      requirements,
      location,
      job_type,
      salary_range,
      application_url,
      is_alumni_exclusive,
      expires_at,
      industry,
      required_skills,
      experience_level,
      is_remote,
    } = req.body;

    let resolvedCompanyName = (company_name || '').trim();
    let resolvedEmployerId = employer_id || null;
    let resolvedCompanyId = company_id || null;
    let resolvedIndustry = industry || null;

    if (resolvedEmployerId) {
      const { data: emp } = await supabase
        .from('employers')
        .select('id, company_name, industry')
        .eq('id', resolvedEmployerId)
        .maybeSingle();
      if (emp) {
        resolvedCompanyName = emp.company_name;
        if (!resolvedIndustry && emp.industry) resolvedIndustry = emp.industry;
      }
    } else if (resolvedCompanyId) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, is_verified, industry')
        .eq('id', resolvedCompanyId)
        .maybeSingle();
      if (companyError) throw new AppError(companyError.message, 500);
      if (company) {
        resolvedCompanyName = company.name;
        if (!resolvedIndustry && company.industry) resolvedIndustry = company.industry;
      }
    }

    if (!resolvedCompanyName) {
      throw new AppError('Employer / Company name is required', 400);
    }

    if (!position || !description || !location) {
      throw new AppError('Position, description, and location are required', 400);
    }
    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('job_postings').insert({
      company_id: resolvedCompanyId,
      employer_id: resolvedEmployerId,
      company_name: resolvedCompanyName,
      position,
      description: sanitizeRichText(description),
      requirements: (requirements || []).map((r: string) => r),
      location,
      job_type: job_type || 'full-time',
      salary_range: salary_range || null,
      application_url: application_url || null,
      is_alumni_exclusive: is_alumni_exclusive || false,
      posted_by: null,
      industry: resolvedIndustry,
      required_skills: required_skills || [],
      experience_level: experience_level || 'entry',
      is_remote: is_remote || false,
      expires_at: expires_at || defaultExpiry,
    }).select().single();
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) throw new AppError('Job postings table not available', 400);
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/applicants', async (req: AuthenticatedRequest, res, next) => {
  try {
    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'view',
        entity: 'job_application',
        entity_id: req.params.id,
        details: { description: 'Admin viewed job applicants (PII)' },
      });
    } catch {}

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, required_skills, position, company_name, industry, experience_level')
      .eq('id', req.params.id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({ job: { required_skills: [] }, applicants: [] });
    }
    if (error) throw new AppError(error.message, 500);

    const userIds = (applications || []).map((a: any) => a.user_id).filter(Boolean);
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, education:education(*), skills:skills(*), employment:employment(*)')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const appIds = (applications || []).map((a: any) => a.id);
    const screeningMap = new Map<string, any>();
    if (appIds.length > 0) {
      const { data: screenings } = await supabase
        .from('application_screening')
        .select('*')
        .in('application_id', appIds)
        .order('screened_at', { ascending: false });
      (screenings || []).forEach((s: any) => {
        if (!screeningMap.has(s.application_id)) screeningMap.set(s.application_id, s);
      });
    }

    const applicants = (applications || []).map((a: any) => {
      const prof = profileMap.get(a.user_id) || null;
      const applicantEducation = prof?.education || [];
      const applicantSkills = prof?.skills || [];
      const applicantEmployment = prof?.employment || [];
      const screeningRecord = screeningMap.get(a.id) || null;

      const sortedEd = [...applicantEducation].sort((x: any, y: any) => (y.year_graduated || 0) - (x.year_graduated || 0));
      const batchYear = sortedEd[0]?.year_graduated ? String(sortedEd[0].year_graduated) : null;
      const program = sortedEd[0]?.program || null;

      const scoreResult = calculateMatchScore(
        {
          required_skills: job.required_skills || [],
          experience_level: job.experience_level || 'entry',
          position: job.position || '',
          industry: job.industry || '',
        },
        {
          skills: applicantSkills,
          employment: applicantEmployment,
          education: applicantEducation,
        }
      );

      const overall = screeningRecord?.overall_match_score != null
        ? Number(screeningRecord.overall_match_score)
        : (a.match_percentage != null && a.match_percentage > 0 ? a.match_percentage : scoreResult.overall_score);

      const skillsScore = screeningRecord?.skills_match_score != null
        ? Number(screeningRecord.skills_match_score)
        : scoreResult.skills_score;

      const experienceScore = screeningRecord?.experience_match_score != null
        ? Number(screeningRecord.experience_match_score)
        : scoreResult.experience_score;

      const educationScore = screeningRecord?.education_match_score != null
        ? Number(screeningRecord.education_match_score)
        : scoreResult.education_score;

      return {
        id: a.id,
        applicant_name: a.applicant_name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Applicant'),
        applicant_email: a.applicant_email || prof?.email || '',
        batch_year: batchYear,
        program: program,
        resume_url: a.resume_url,
        applied_at: a.applied_at,
        status: a.status || 'pending',
        cover_letter: a.cover_letter,
        match_percentage: overall,
        skills_match_score: skillsScore,
        experience_match_score: experienceScore,
        education_match_score: educationScore,
        overall_match_score: overall,
        skills_breakdown: scoreResult.skills_breakdown,
        matched_skills: a.matched_skills && a.matched_skills.length > 0
          ? a.matched_skills
          : scoreResult.skills_breakdown.filter((s) => s.status !== 'missing').map((s) => s.skill),
        missing_skills: a.missing_skills && a.missing_skills.length > 0
          ? a.missing_skills
          : scoreResult.skills_breakdown.filter((s) => s.status === 'missing').map((s) => s.skill),
        is_screened: a.is_screened || false,
        screening_notes: a.screening_notes || screeningRecord?.screening_notes || null,
        screened_at: a.screened_at || screeningRecord?.screened_at || null,
      };
    });

    res.json({
      job: {
        id: job.id,
        required_skills: job.required_skills || [],
        position: job.position,
        company_name: job.company_name,
      },
      applicants,
    });
  } catch (err) { next(err); }
});

router.put('/applications/:applicationId/status', validate(applicationStatusSchema), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'under_review', 'shortlisted', 'rejected', 'hired', 'reviewed', 'accepted'];
    if (!allowed.includes(status)) throw new AppError('Invalid application status', 400);

    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', req.params.applicationId);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Application status updated', status });
  } catch (err) { next(err); }
});

router.put('/applications/:applicationId/screen', validate(screenApplicationSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      matched_skills,
      screening_notes,
      status,
      skills_match_score,
      experience_match_score,
      education_match_score,
      overall_match_score,
    } = req.body;

    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id')
      .eq('id', req.params.applicationId)
      .maybeSingle();
    if (appError) throw new AppError(appError.message, 500);
    if (!application) throw new AppError('Application not found', 404);

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('required_skills')
      .eq('id', application.job_id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);

    const requiredSkills: string[] = job?.required_skills || [];
    const missingSkills = requiredSkills.filter((s) => !matched_skills.includes(s));
    const finalOverall = overall_match_score != null
      ? overall_match_score
      : (requiredSkills.length > 0 ? Math.round((matched_skills.length / requiredSkills.length) * 100) : 0);

    const updatePayload: any = {
      matched_skills,
      missing_skills: missingSkills,
      match_percentage: finalOverall,
      screening_notes: screening_notes || null,
      is_screened: true,
      screened_at: new Date().toISOString(),
    };
    if (status) {
      updatePayload.status = status;
    }

    const { error } = await supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('id', req.params.applicationId);
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      throw new AppError('Screening columns not available. Run the screening migration first.', 500);
    }
    if (error) throw new AppError(error.message, 500);

    try {
      await supabase.from('application_screening').insert({
        application_id: req.params.applicationId,
        skills_match_score: skills_match_score ?? finalOverall,
        experience_match_score: experience_match_score ?? 0,
        education_match_score: education_match_score ?? 0,
        overall_match_score: finalOverall,
        screening_notes: screening_notes || null,
        screened_by: req.user?.userId || null,
        screened_at: new Date().toISOString(),
      });
    } catch (scErr) {
      console.warn('Could not insert application_screening record:', scErr);
    }

    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'SCREEN_APPLICANT',
        entity: 'job_application',
        entity_id: req.params.applicationId,
        details: {
          matched_skills,
          missing_skills: missingSkills,
          match_percentage: finalOverall,
          status: status || null,
        },
      });
    } catch {}

    const { data: updated, error: fetchError } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', req.params.applicationId)
      .maybeSingle();
    if (fetchError) throw new AppError(fetchError.message, 500);

    res.json(updated);
  } catch (err) { next(err); }
});

router.get('/:id/applicants/export', async (req: AuthenticatedRequest, res, next) => {
  try {
    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'export',
        entity: 'job_application',
        entity_id: req.params.id,
        details: { description: 'Admin exported screened applicants as CSV' },
      });
    } catch { }

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name')
      .eq('id', req.params.id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({ data: [], message: 'No screening data available' });
    }
    if (error) throw new AppError(error.message, 500);

    const esc = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const headers = ['Name', 'Email', 'Match %', 'Matched Skills', 'Missing Skills', 'Notes', 'Status'];
    const rows = (applications || []).map((a: any) => [
      esc(a.applicant_name || ''),
      esc(a.applicant_email || ''),
      a.match_percentage != null ? `${a.match_percentage}%` : 'Not screened',
      esc((a.matched_skills || []).join('; ')),
      esc((a.missing_skills || []).join('; ')),
      esc(a.screening_notes || ''),
      esc(a.status || 'pending'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const safeName = (job.position || 'job').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="screening-${safeName}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
});

router.put('/:id', validate(adminUpdateJobSchema), async (req, res, next) => {
  try {
    const { company_id, position, description, requirements, location, job_type, salary_range, application_url, is_alumni_exclusive, expires_at, industry, required_skills, experience_level, is_remote } = req.body;

    const payload: any = {};
    if (company_id !== undefined) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, name, is_verified')
        .eq('id', company_id)
        .maybeSingle();
      if (companyError) throw new AppError(companyError.message, 500);
      if (!company) throw new AppError('Company not found', 404);
      if (!company.is_verified) throw new AppError('Only verified companies can be used for job postings', 400);
      payload.company_id = company.id;
      payload.company_name = company.name;
    }
    if (position !== undefined) payload.position = position;
    if (description !== undefined) payload.description = sanitizeRichText(description);
    if (requirements !== undefined) payload.requirements = requirements || [];
    if (location !== undefined) payload.location = location;
    if (job_type !== undefined) payload.job_type = job_type;
    if (salary_range !== undefined) payload.salary_range = salary_range || null;
    if (application_url !== undefined) payload.application_url = application_url || null;
    if (is_alumni_exclusive !== undefined) payload.is_alumni_exclusive = is_alumni_exclusive;
    if (industry !== undefined) payload.industry = industry || null;
    if (required_skills !== undefined) payload.required_skills = required_skills || [];
    if (experience_level !== undefined) payload.experience_level = experience_level;
    if (is_remote !== undefined) payload.is_remote = is_remote;
    if (expires_at !== undefined) payload.expires_at = expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (Object.keys(payload).length === 0) throw new AppError('No fields provided to update', 400);

    const { error } = await supabase.from('job_postings').update(payload).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/close', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').update({ expires_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job posting closed' });
  } catch (err) {
    next(err);
  }
});

export default router;

