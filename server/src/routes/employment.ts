import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: employment, error } = await supabase
      .from('employment')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(employment);
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

    const { data: employment, error } = await supabase
      .from('employment')
      .insert({ ...req.body, profile_id: profile.id })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(employment);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: employment, error } = await supabase
      .from('employment')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('employment')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
