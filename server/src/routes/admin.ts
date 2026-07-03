import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*, profile:profiles(*)')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (_req, res, next) => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*, education(*), employment(*)');

    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

export default router;
