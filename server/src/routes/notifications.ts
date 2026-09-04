import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json([]);
    if (error) throw new AppError(error.message, 500);

    res.json(notifications || []);
  } catch (err) { next(err); }
});

router.get('/unread-count', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.userId)
      .eq('is_read', false);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ count: 0 });
    if (error) throw new AppError(error.message, 500);
    res.json({ count: count || 0 });
  } catch (err) { next(err); }
});

router.post('/:id/read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.userId);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/mark-all-read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user!.userId)
      .eq('is_read', false);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export async function createSurveyNotifications(survey: any) {
  try {
    const { data: alumni, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'alumni')
      .eq('is_active', true);

    if (error || !alumni || alumni.length === 0) return;

    const notificationRows = alumni.map((a: any) => ({
      user_id: a.id,
      type: 'survey',
      title: `📋 ${survey.title}`,
      message: `Please complete the survey before ${survey.expires_at ? new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the closing date'}.`,
      link: `/surveys/${survey.id}`,
      survey_id: survey.id,
    }));

    const batchSize = 100;
    for (let i = 0; i < notificationRows.length; i += batchSize) {
      const batch = notificationRows.slice(i, i + batchSize);
      await supabase.from('notifications').insert(batch);
    }
  } catch (err) {
    console.error('Failed to create survey notifications:', err);
  }
}

export default router;
