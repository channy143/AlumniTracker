import { Router } from 'express';
import multer from 'multer';
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

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

      const skillsScore = screeningRecord?.skills_match_score != null
        ? Math.min(100, Math.max(0, Number(screeningRecord.skills_match_score)))
        : scoreResult.skills_score;

      const experienceScore = screeningRecord?.experience_match_score != null
        ? Math.min(100, Math.max(0, Number(screeningRecord.experience_match_score)))
        : scoreResult.experience_score;

      const educationScore = screeningRecord?.education_match_score != null
        ? Math.min(100, Math.max(0, Number(screeningRecord.education_match_score)))
        : scoreResult.education_score;

      const calculatedOverall = Math.min(
        100,
        Math.max(
          0,
          Math.round(skillsScore * 0.50 + experienceScore * 0.30 + educationScore * 0.20)
        )
      );

      const overall = screeningRecord?.overall_match_score != null
        ? Math.min(100, Math.max(0, Number(screeningRecord.overall_match_score)))
        : calculatedOverall;

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
        skills_score: skillsScore,
        experience_match_score: experienceScore,
        experience_score: experienceScore,
        education_match_score: educationScore,
        education_score: educationScore,
        overall_match_score: overall,
        overall_score: overall,
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

async function syncHiredApplicationToEmployment(applicationId: string) {
  try {
    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id, status')
      .eq('id', applicationId)
      .maybeSingle();
    if (appError || !application) return;

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name, industry, job_type, salary_range')
      .eq('id', application.job_id)
      .maybeSingle();
    if (jobError || !job) return;

    // Get applicant profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('id, current_job_title, company_name, industry, employment_status')
      .eq('user_id', application.user_id)
      .maybeSingle();
    if (profError || !profile) return;

    // Check if an employment record already exists for this profile + position + company
    const { data: existingEmployment } = await supabase
      .from('employment')
      .select('id')
      .eq('profile_id', profile.id)
      .ilike('company_name', job.company_name)
      .ilike('position', job.position)
      .maybeSingle();

    if (!existingEmployment) {
      // Mark any prior current employment as not current
      await supabase
        .from('employment')
        .update({ is_current: false })
        .eq('profile_id', profile.id)
        .eq('is_current', true);

      // Insert new current employment
      await supabase.from('employment').insert({
        profile_id: profile.id,
        company_name: job.company_name,
        position: job.position,
        company_industry: job.industry || null,
        employment_status: 'employed',
        is_current: true,
        start_date: new Date().toISOString().split('T')[0],
        salary_range: job.salary_range || null,
        job_type: job.job_type || 'full-time',
      });
    }

    // Update profiles table
    await supabase
      .from('profiles')
      .update({
        current_job_title: job.position,
        company_name: job.company_name,
        industry: job.industry || profile.industry || null,
        employment_status: 'Employed',
      })
      .eq('id', profile.id);

    // Ensure company exists in companies table
    if (job.company_name) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, industry')
        .ilike('name', job.company_name)
        .maybeSingle();

      if (!existingCompany) {
        await supabase.from('companies').insert({
          name: job.company_name,
          industry: job.industry || 'Technology',
          is_verified: true,
        });
      } else if (!existingCompany.industry && job.industry) {
        await supabase
          .from('companies')
          .update({ industry: job.industry })
          .eq('id', existingCompany.id);
      }
    }

    // Notify the alumnus
    try {
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        title: 'Hired for ' + job.position + '!',
        message: `Congratulations! You have been marked as hired for ${job.position} at ${job.company_name}. Your profile and employment history have been automatically updated.`,
        type: 'job',
        is_read: false,
      });
    } catch {}
  } catch (err) {
    console.error('Failed to sync hired application to employment:', err);
  }
}

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

    if (status === 'hired' || status === 'accepted') {
      await syncHiredApplicationToEmployment(req.params.applicationId);
    }

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
      .select('required_skills, experience_level, position, industry')
      .eq('id', application.job_id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);

    const requiredSkills: string[] = job?.required_skills || [];
    const validMatchedSkills: string[] = Array.from(new Set(
      (matched_skills || []).filter((s: string) => requiredSkills.includes(s))
    ));
    const missingSkills = requiredSkills.filter((s) => !validMatchedSkills.includes(s));

    const { data: prof } = await supabase
      .from('profiles')
      .select('id, user_id, education:education(*), employment:employment(*)')
      .eq('user_id', application.user_id)
      .maybeSingle();

    const scoreResult = calculateMatchScore(
      {
        required_skills: requiredSkills,
        experience_level: job?.experience_level || 'entry',
        position: job?.position || '',
        industry: job?.industry || '',
      },
      {
        skills: validMatchedSkills,
        employment: prof?.employment || [],
        education: prof?.education || [],
      }
    );

    const calculatedSkillsScore = requiredSkills.length > 0
      ? Math.min(100, Math.max(0, Math.round((validMatchedSkills.length / requiredSkills.length) * 100)))
      : 100;

    const expScore = experience_match_score != null
      ? Math.min(100, Math.max(0, experience_match_score))
      : scoreResult.experience_score;

    const eduScore = education_match_score != null
      ? Math.min(100, Math.max(0, education_match_score))
      : scoreResult.education_score;

    const computedOverall = Math.min(
      100,
      Math.max(
        0,
        Math.round(calculatedSkillsScore * 0.5 + expScore * 0.3 + eduScore * 0.2)
      )
    );

    const finalOverall = overall_match_score != null
      ? Math.min(100, Math.max(0, overall_match_score))
      : computedOverall;

    const finalSkillsScore = skills_match_score != null
      ? Math.min(100, Math.max(0, skills_match_score))
      : calculatedSkillsScore;

    const updatePayload: any = {
      matched_skills: validMatchedSkills,
      missing_skills: missingSkills,
      match_percentage: finalOverall,
      screening_notes: screening_notes || null,
      is_screened: true,
      screened_at: new Date().toISOString(),
    };
    if (status) {
      updatePayload.status = status;
    }

    let { error } = await supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('id', req.params.applicationId);

    if (error && error.code === 'PGRST204' && updatePayload.screened_at) {
      delete updatePayload.screened_at;
      const retryResult = await supabase
        .from('job_applications')
        .update(updatePayload)
        .eq('id', req.params.applicationId);
      error = retryResult.error;
    }

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      throw new AppError('Screening columns not available. Run the screening migration first.', 500);
    }
    if (error) throw new AppError(error.message, 500);

    if (status === 'hired' || status === 'accepted') {
      await syncHiredApplicationToEmployment(req.params.applicationId);
    }

    try {
      const { data: existingScreening } = await supabase
        .from('application_screening')
        .select('id')
        .eq('application_id', req.params.applicationId)
        .order('screened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const screeningPayload = {
        application_id: req.params.applicationId,
        skills_match_score: finalSkillsScore,
        experience_match_score: expScore,
        education_match_score: eduScore,
        overall_match_score: finalOverall,
        screening_notes: screening_notes || null,
        screened_by: req.user?.userId || null,
        screened_at: new Date().toISOString(),
      };

      if (existingScreening) {
        await supabase
          .from('application_screening')
          .update(screeningPayload)
          .eq('id', existingScreening.id);
      } else {
        await supabase
          .from('application_screening')
          .insert(screeningPayload);
      }
    } catch (scErr) {
      console.warn('Could not upsert application_screening record:', scErr);
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

    res.json({
      ...updated,
      matched_skills: validMatchedSkills,
      missing_skills: missingSkills,
      match_percentage: finalOverall,
      overall_match_score: finalOverall,
      skills_match_score: finalSkillsScore,
      experience_match_score: expScore,
      education_match_score: eduScore,
    });
  } catch (err) { next(err); }
});

router.get('/:id/applicants/export', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name, industry')
      .eq('id', req.params.id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'export',
        entity: 'job_application',
        entity_id: req.params.id,
        details: { description: `Admin generated candidate referral report for ${job.position}` },
      });
    } catch { }

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({ data: [], message: 'No screening data available' });
    }
    if (error) throw new AppError(error.message, 500);

    const userIds = (applications || []).map((a: any) => a.user_id).filter(Boolean);
    const profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email, phone, education:education(*)')
        .in('user_id', userIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const esc = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const escHtml = (val: any) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const format = String(req.query.format || 'csv').toLowerCase();

    const appData = (applications || []).map((a: any) => {
      const prof = profileMap.get(a.user_id);
      const sortedEd = [...(prof?.education || [])].sort((x: any, y: any) => (y.year_graduated || 0) - (x.year_graduated || 0));
      const batchYear = sortedEd[0]?.year_graduated ? String(sortedEd[0].year_graduated) : '';
      const program = sortedEd[0]?.program || '';
      const phone = prof?.phone || '';
      const candidateName = a.applicant_name || (prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Applicant');
      const email = a.applicant_email || prof?.email || '';
      const matchScore = a.match_percentage != null ? `${a.match_percentage}%` : 'Not evaluated';
      const matchedSkills = (a.matched_skills || []).join('; ');
      const missingSkills = (a.missing_skills || []).join('; ');
      const notes = a.screening_notes || '';
      const resume = a.resume_url || '';
      const appliedDate = a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '';
      const currentDecision = a.status && a.status !== 'pending' && a.status !== 'under_review' ? a.status : '';

      return {
        id: a.id,
        name: candidateName,
        email,
        phone,
        batchYear,
        program,
        matchScore,
        matchedSkills,
        missingSkills,
        notes,
        resume,
        appliedDate,
        decision: currentDecision,
        remarks: a.company_feedback || '',
      };
    });

    const safeName = (job.position || 'job').replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'excel' || format === 'xls') {
      const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; }
    .header-box { background-color: #f97316; color: #ffffff; padding: 12px 16px; margin-bottom: 12px; border-radius: 6px; }
    .title { font-size: 16px; font-weight: bold; }
    .subtitle { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    .notice { background-color: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 10px 14px; font-size: 11px; margin-bottom: 14px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; }
    th { background-color: #1e3a8a; color: #ffffff; border: 1px solid #0f172a; padding: 7px 10px; font-size: 11px; text-align: left; }
    td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; }
    .decision-th { background-color: #047857; color: #ffffff; }
    .decision-td { background-color: #ecfdf5; font-weight: bold; color: #065f46; }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="title">Candidate Referral Report — ${escHtml(job.position)}</div>
    <div class="subtitle">Company: ${escHtml(job.company_name || 'Employer Partner')} · Generated: ${new Date().toLocaleDateString()}</div>
  </div>
  <div class="notice">
    <strong>Instructions for Employer:</strong> The university has screened and verified candidate qualifications. Please review the applicants below, indicate your hiring outcome in the <strong>"Company Hiring Decision"</strong> column (e.g. <em>Hired, Shortlisted, Rejected, Interview</em>), and return this spreadsheet to the University Alumni Placement Office.
  </div>
  <table>
    <thead>
      <tr>
        <th>Applicant Name</th>
        <th>Email Address</th>
        <th>Contact Number</th>
        <th>Batch Year</th>
        <th>Degree / Program</th>
        <th>Match Score</th>
        <th>Matched Skills</th>
        <th>Skill Gaps</th>
        <th>University Screening Notes</th>
        <th>Resume Link</th>
        <th>Applied Date</th>
        <th class="decision-th">Company Hiring Decision (Hired / Shortlisted / Rejected / Interview)</th>
        <th class="decision-th">Company Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${appData
        .map(
          (d) => `<tr>
        <td>${escHtml(d.name)}</td>
        <td>${escHtml(d.email)}</td>
        <td>${escHtml(d.phone)}</td>
        <td>${escHtml(d.batchYear)}</td>
        <td>${escHtml(d.program)}</td>
        <td>${escHtml(d.matchScore)}</td>
        <td>${escHtml(d.matchedSkills)}</td>
        <td>${escHtml(d.missingSkills)}</td>
        <td>${escHtml(d.notes)}</td>
        <td>${d.resume ? `<a href="${escHtml(d.resume)}">View Resume</a>` : 'N/A'}</td>
        <td>${escHtml(d.appliedDate)}</td>
        <td class="decision-td">${escHtml(d.decision)}</td>
        <td>${escHtml(d.remarks)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="candidates-${safeName}.xls"`);
      return res.send(html);
    }

    // Default: CSV format with UTF-8 BOM
    const headers = [
      'Applicant Name',
      'Email Address',
      'Contact Number',
      'Batch Year',
      'Degree / Program',
      'Match Score',
      'Matched Skills',
      'Skill Gaps',
      'University Screening Notes',
      'Resume Link',
      'Applied Date',
      'Company Hiring Decision (Hired / Shortlisted / Rejected / Interview)',
      'Company Remarks',
    ];
    const rows = appData.map((d) => [
      esc(d.name),
      esc(d.email),
      esc(d.phone),
      esc(d.batchYear),
      esc(d.program),
      esc(d.matchScore),
      esc(d.matchedSkills),
      esc(d.missingSkills),
      esc(d.notes),
      esc(d.resume),
      esc(d.appliedDate),
      esc(d.decision),
      esc(d.remarks),
    ]);
    const csvContent = '\ufeff' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="candidates-${safeName}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// Import company hiring decisions from spreadsheet / JSON
router.post('/:id/import-company-decisions', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { decisions } = req.body;
    if (!Array.isArray(decisions) || decisions.length === 0) {
      throw new AppError('No decision records provided in payload', 400);
    }

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name')
      .eq('id', req.params.id)
      .maybeSingle();
    if (jobError) throw new AppError(jobError.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    const { data: applications, error: appError } = await supabase
      .from('job_applications')
      .select('id, user_id, applicant_email, applicant_name, status, screening_notes')
      .eq('job_id', req.params.id);
    if (appError) throw new AppError(appError.message, 500);

    const appByEmail = new Map<string, any>();
    const appByName = new Map<string, any>();
    const appById = new Map<string, any>();

    (applications || []).forEach((a: any) => {
      if (a.id) appById.set(String(a.id).trim().toLowerCase(), a);
      if (a.applicant_email) appByEmail.set(String(a.applicant_email).trim().toLowerCase(), a);
      if (a.applicant_name) appByName.set(String(a.applicant_name).trim().toLowerCase(), a);
    });

    let updatedCount = 0;
    let hiredCount = 0;
    let shortlistedCount = 0;
    let rejectedCount = 0;
    const details: any[] = [];

    const normalizeStatus = (rawStatus: string): string => {
      const s = String(rawStatus || '')
        .toLowerCase()
        .trim();
      if (s.includes('hire') || s.includes('accept') || s.includes('passed') || s.includes('employed') || s === 'hired')
        return 'hired';
      if (
        s.includes('shortlist') ||
        s.includes('interview') ||
        s.includes('review') ||
        s.includes('qualif') ||
        s === 'shortlisted'
      )
        return 'shortlisted';
      if (
        s.includes('reject') ||
        s.includes('not select') ||
        s.includes('declined') ||
        s.includes('failed') ||
        s.includes('denied') ||
        s === 'rejected'
      )
        return 'rejected';
      if (s.includes('pending') || s.includes('hold') || s.includes('waiting')) return 'pending';
      return 'under_review';
    };

    for (const d of decisions) {
      const email = String(d.email || d.applicant_email || d['Email Address'] || d['email'] || '').trim().toLowerCase();
      const name = String(d.name || d.applicant_name || d['Applicant Name'] || d['name'] || '').trim().toLowerCase();
      const appId = String(d.id || d.application_id || d.applicant_id || '').trim().toLowerCase();
      const rawStatus =
        d.status ||
        d.decision ||
        d.company_decision ||
        d['Company Hiring Decision (Hired / Shortlisted / Rejected / Interview)'] ||
        d['Company Hiring Decision'] ||
        d['Company Decision'] ||
        d['Decision'] ||
        '';

      if (!rawStatus) continue;

      const app = (appId ? appById.get(appId) : null) || (email ? appByEmail.get(email) : null) || (name ? appByName.get(name) : null);
      if (!app) {
        details.push({
          identifier: email || name || appId || 'Unknown applicant',
          success: false,
          reason: 'Applicant was not found among applicants for this job.',
        });
        continue;
      }

      const nextStatus = normalizeStatus(rawStatus);
      const remarks =
        d.remarks ||
        d.company_notes ||
        d.notes ||
        d['Company Remarks'] ||
        d['Company Remarks / Notes'] ||
        d['Remarks'] ||
        '';

      const updateData: any = {
        status: nextStatus,
      };

      if (remarks) {
        const timestamp = new Date().toLocaleDateString();
        const noteAddition = `[Company Decision - ${timestamp}]: ${remarks}`;
        updateData.screening_notes = app.screening_notes
          ? `${app.screening_notes}\n${noteAddition}`
          : noteAddition;
      }

      const { error: updateErr } = await supabase.from('job_applications').update(updateData).eq('id', app.id);

      if (updateErr) {
        details.push({
          identifier: app.applicant_name || app.applicant_email,
          success: false,
          reason: updateErr.message,
        });
        continue;
      }

      updatedCount++;
      if (nextStatus === 'hired') hiredCount++;
      else if (nextStatus === 'shortlisted') shortlistedCount++;
      else if (nextStatus === 'rejected') rejectedCount++;

      if (nextStatus === 'hired') {
        try {
          await syncHiredApplicationToEmployment(app.id);
        } catch (syncErr) {
          console.warn('Could not sync hired applicant to employment:', syncErr);
        }
      }

      details.push({
        identifier: app.applicant_name || app.applicant_email,
        success: true,
        previousStatus: app.status,
        newStatus: nextStatus,
      });
    }

    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'IMPORT_COMPANY_DECISIONS',
        entity: 'job_application',
        entity_id: req.params.id,
        details: {
          job_id: req.params.id,
          job_title: job.position,
          total_processed: decisions.length,
          updated_count: updatedCount,
          hired_count: hiredCount,
          shortlisted_count: shortlistedCount,
          rejected_count: rejectedCount,
        },
      });
    } catch { }

    res.json({
      message: `Processed company decisions: ${updatedCount} applicant(s) updated (${hiredCount} hired, ${shortlistedCount} shortlisted, ${rejectedCount} rejected).`,
      totalProcessed: decisions.length,
      updatedCount,
      hiredCount,
      shortlistedCount,
      rejectedCount,
      details,
    });
  } catch (err) {
    next(err);
  }
});

// Upload and attach company evaluation file
router.post('/:id/company-files', upload.single('file'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    const fileRecord = {
      id: 'cf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      job_id: req.params.id,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      data_url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      uploaded_by: req.user?.userId || null,
      uploaded_at: new Date().toISOString(),
    };

    try {
      await supabase.from('audit_logs').insert({
        user_id: req.user?.userId || null,
        action: 'UPLOAD_COMPANY_FILE',
        entity: 'job_posting',
        entity_id: req.params.id,
        details: fileRecord,
      });
    } catch (auditErr) {
      console.warn('Audit log insert error for company file:', auditErr);
    }

    res.json({
      message: `File "${file.originalname}" successfully uploaded.`,
      file: {
        id: fileRecord.id,
        file_name: fileRecord.file_name,
        file_size: fileRecord.file_size,
        mime_type: fileRecord.mime_type,
        data_url: fileRecord.data_url,
        uploaded_at: fileRecord.uploaded_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Retrieve company evaluation files for a job posting
router.get('/:id/company-files', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity', 'job_posting')
      .eq('entity_id', req.params.id)
      .eq('action', 'UPLOAD_COMPANY_FILE')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const files = (logs || []).map((l: any) => l.details).filter(Boolean);
    res.json(files);
  } catch (err) {
    next(err);
  }
});

// Delete a company evaluation file
router.delete('/:id/company-files/:fileId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id: jobId, fileId } = req.params;
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, details')
      .eq('entity', 'job_posting')
      .eq('entity_id', jobId)
      .eq('action', 'UPLOAD_COMPANY_FILE');

    if (error) throw new AppError(error.message, 500);

    const match = (logs || []).find((l: any) => l.details?.id === fileId);
    if (match) {
      await supabase.from('audit_logs').delete().eq('id', match.id);
    }

    res.json({ message: 'Company file removed.' });
  } catch (err) {
    next(err);
  }
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

