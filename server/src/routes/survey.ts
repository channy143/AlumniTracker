import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(surveys);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/respond', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { responses } = req.body;

    const { data: surveyResponse, error } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: req.params.id,
        user_id: req.user!.userId,
        responses,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(surveyResponse);
  } catch (err) {
    next(err);
  }
});

export default router;
