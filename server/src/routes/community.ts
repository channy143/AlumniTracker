import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/groups', authenticate, async (_req, res, next) => {
  try {
    const { data: groups, error } = await supabase
      .from('community_groups')
      .select('*')
      .order('name');

    if (error) throw new AppError(error.message, 500);

    res.json(groups);
  } catch (err) {
    next(err);
  }
});

router.get('/groups/:id/posts', authenticate, async (req, res, next) => {
  try {
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select('*, author:profiles(first_name, last_name, avatar_url)')
      .eq('group_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

router.post('/posts', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({ ...req.body, author_id: profile.id })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

export default router;
