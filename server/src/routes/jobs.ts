import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_RESUME_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

async function getProfileByUserId(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, resume_url, headline, email, phone, current_employment')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

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
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/my-applications', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: applications, error } = await supabase
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

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: job, error } = await supabase
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
    });
  } catch (err) { next(err); }
});

router.get('/:id/my-application', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: app, error } = await supabase
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

router.post('/:id/apply', authenticate, upload.single('resume'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const jobId = req.params.id;
    const coverLetter = (req.body.cover_letter || '').toString().trim();

    const { data: job, error: jobError } = await supabase
      .from('job_postings')
      .select('id, position, company_name, expires_at')
      .eq('id', jobId)
      .single();
    if (jobError) throw new AppError('Job not found', 404);
    if (new Date(job.expires_at) < new Date()) throw new AppError('This job posting has expired', 400);

    const profile = await getProfileByUserId(req.user!.userId);
    if (!profile) throw new AppError('Profile not found. Please complete your profile first.', 404);

    let resumeUrl = profile.resume_url || null;

    if (req.file) {
      if (!ALLOWED_RESUME_MIME.includes(req.file.mimetype)) {
        throw new AppError('Only PDF and DOC/DOCX files are allowed', 400);
      }
      const parts = req.file.originalname.split('.');
      const ext = parts.length > 1 ? parts.pop() : 'pdf';
      const fileName = `job-applications/${jobId}/${req.user!.userId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
      if (uploadError) throw new AppError(`Resume upload failed: ${uploadError.message}`, 500);
      const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
      resumeUrl = urlData.publicUrl;
    }

    if (!resumeUrl) {
      throw new AppError('No resume found on your profile. Upload a resume or attach one to apply.', 400);
    }

    const { data, error } = await supabase.from('job_applications').insert({
      job_id: jobId,
      user_id: req.user!.userId,
      status: 'pending',
      resume_url: resumeUrl,
      cover_letter: coverLetter || null,
      applicant_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      applicant_email: profile.email || null,
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
