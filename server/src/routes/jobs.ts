import { Router } from 'express';
import multer from 'multer';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { applyJobSchema } from '../middleware/validationSchemas';
import { validateResumeContent } from '../utils/validateResume';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function getProfileByUserId(db: any, userId: string) {
  const { data } = await db
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, resume_url, headline, email, phone')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: jobs, error } = await db
      .from('job_postings')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    // Batch-fetch poster profiles so we can show the alumni's profile picture
    const posterIds = (jobs || []).map((j: any) => j.posted_by).filter(Boolean);
    const posterMap = new Map<string, any>();
    if (posterIds.length > 0) {
      const { data: posters } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', posterIds);
      (posters || []).forEach((p: any) => posterMap.set(p.id, p));
    }

    const result = await Promise.all((jobs || []).map(async (job: any) => {
      let companyInfo: any = null;
      if (job.company_name) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, website, contact_email, logo, industry')
          .ilike('name', job.company_name)
          .maybeSingle();
        companyInfo = company;
      }
      const poster = job.posted_by ? posterMap.get(job.posted_by) || null : null;
      return {
        id: job.id,
        company_name: job.company_name,
        position: job.position,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        job_type: job.job_type,
        salary_range: job.salary_range,
        is_alumni_exclusive: job.is_alumni_exclusive,
        created_at: job.created_at,
        expires_at: job.expires_at,
        company_website: companyInfo?.website || null,
        company_email: companyInfo?.contact_email || null,
        company_logo: companyInfo?.logo || null,
        company_industry: companyInfo?.industry || null,
        poster_avatar_url: poster?.avatar_url || null,
        poster_name: poster ? `${poster.first_name || ''} ${poster.last_name || ''}`.trim() : null,
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/my-applications', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: applications, error } = await db
      .from('job_applications')
      .select('id, job_id, status, applied_at, resume_url, cover_letter, job:job_postings(id, company_name, position, location, job_type, salary_range, is_alumni_exclusive, expires_at, is_remote)')
      .eq('user_id', req.user!.userId)
      .order('applied_at', { ascending: false });

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json([]);
    if (error) throw new AppError(error.message, 500);

    res.json(applications || []);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: job, error } = await db
      .from('job_postings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw new AppError(error.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    let companyInfo: any = null;
    if (job.company_name) {
      const { data: company } = await supabase
        .from('companies')
        .select('name, website, contact_email, logo, industry')
        .ilike('name', job.company_name)
        .maybeSingle();
      companyInfo = company;
    }

    // Fetch poster profile for the alumni icon
    let poster: any = null;
    if (job.posted_by) {
      const { data: posterData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', job.posted_by)
        .maybeSingle();
      poster = posterData;
    }

    res.json({
      id: job.id,
      company_name: job.company_name,
      position: job.position,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      job_type: job.job_type,
      salary_range: job.salary_range,
      is_alumni_exclusive: job.is_alumni_exclusive,
      created_at: job.created_at,
      expires_at: job.expires_at,
      company_website: companyInfo?.website || null,
      company_email: companyInfo?.contact_email || null,
      company_logo: companyInfo?.logo || null,
      company_industry: companyInfo?.industry || null,
      poster_avatar_url: poster?.avatar_url || null,
      poster_name: poster ? `${poster.first_name || ''} ${poster.last_name || ''}`.trim() : null,
    });
  } catch (err) { next(err); }
});

router.get('/:id/my-application', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: app, error } = await db
      .from('job_applications')
      .select('*')
      .eq('job_id', req.params.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json(null);
    if (error) throw new AppError(error.message, 500);
    res.json(app || null);
  } catch (err) { next(err); }
});

router.post('/:id/apply', authenticate, upload.single('resume'), validate(applyJobSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const jobId = req.params.id;
    const coverLetter = (req.body.cover_letter || '').toString().trim();

    const { data: job, error: jobError } = await db
      .from('job_postings')
      .select('id, position, company_name, expires_at')
      .eq('id', jobId)
      .single();
    if (jobError) throw new AppError('Job not found', 404);
    if (new Date(job.expires_at) < new Date()) throw new AppError('This job posting has expired', 400);

    const profile = await getProfileByUserId(db, req.user!.userId);

    let resumeUrl = profile?.resume_url || null;

    if (req.file) {
      // Validate the actual file content, not just the client-supplied MIME header.
      const validation = await validateResumeContent(req.file.buffer);
      if (!validation.ok) {
        throw new AppError(validation.error || 'Invalid resume file', 400);
      }
      const fileName = `job-applications/${jobId}/${req.user!.userId}-${Date.now()}.${validation.ext}`;
      const { error: uploadError } = await db.storage
        .from('resumes')
        .upload(fileName, req.file.buffer, { contentType: validation.mime, upsert: true });
      if (uploadError) throw new AppError(`Resume upload failed: ${uploadError.message}`, 500);
      const { data: signedData, error: signedError } = await db.storage
        .from('resumes')
        .createSignedUrl(fileName, 3600);
      if (signedError || !signedData?.signedUrl) throw new AppError('Failed to generate resume link', 500);
      resumeUrl = signedData.signedUrl;
    }

    if (!resumeUrl) {
      throw new AppError('No resume found on your profile. Upload a resume or attach one to apply.', 400);
    }

    const applicantName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Applicant';
    const applicantEmail = profile?.email || req.user!.email || null;

    const { data, error } = await db.from('job_applications').insert({
      job_id: jobId,
      user_id: req.user!.userId,
      status: 'pending',
      resume_url: resumeUrl,
      cover_letter: coverLetter || null,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
    }).select().single();

    if (error) {
      if (error.code === '23505') throw new AppError('You have already applied to this job', 409);
      if (error.code === '42P01' || error.code === 'PGRST205') throw new AppError('Job applications are not yet set up in the database', 500);
      throw new AppError(error.message, 500);
    }

    res.status(201).json(data);
  } catch (err) { next(err); }
});

export default router;
