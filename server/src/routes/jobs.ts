import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const result = (jobs || []).map((job: any) => ({
      ...job,
      application_method: job.application_url ? 'external' : 'email',
      external_link: job.application_url || null,
    }));

    res.json(result);
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

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', job.company_name)
      .maybeSingle();

    res.json({
      ...job,
      application_method: job.application_url ? 'external' : 'email',
      external_link: job.application_url || null,
      company_profile: company || null,
    });
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: job, error } = await supabase
      .from('job_postings')
      .insert({ ...req.body, posted_by: profile.id })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
