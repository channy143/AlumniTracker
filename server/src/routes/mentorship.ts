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

    const { data: mentorships, error } = await supabase
      .from('mentorships')
      .select('*, mentor:profiles!mentor_id(*), mentee:profiles!mentee_id(*)')
      .or(`mentor_id.eq.${profile.id},mentee_id.eq.${profile.id}`);

    if (error) throw new AppError(error.message, 500);

    res.json(mentorships);
  } catch (err) {
    next(err);
  }
});

router.post('/apply', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: mentorship, error } = await supabase
      .from('mentorships')
      .insert({
        mentee_id: profile.id,
        mentor_id: req.body.mentor_id,
        goals: req.body.goals,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(mentorship);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: mentorship, error } = await supabase
      .from('mentorships')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(mentorship);
  } catch (err) {
    next(err);
  }
});

export default router;
