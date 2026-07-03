import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, authorize } from '../middleware/auth';
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

    res.json(jobs);
  } catch (err) {
    next(err);
  }
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

router.post('/:id/apply', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: application, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: req.params.id,
        user_id: req.user!.userId,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

export default router;
