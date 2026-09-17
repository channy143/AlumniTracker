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

export interface CreateNotificationParams {
  userId: string;
  type?: 'survey' | 'job' | 'application' | 'mentorship' | 'announcement' | 'event' | 'system';
  title: string;
  message?: string;
  link?: string;
  surveyId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type || 'system',
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      survey_id: params.surveyId || null,
      is_read: false,
    });
    if (error) console.error('Failed to create notification:', error);
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

export interface BroadcastNotificationParams {
  role?: string;
  type?: 'survey' | 'job' | 'application' | 'mentorship' | 'announcement' | 'event' | 'system';
  title: string;
  message?: string;
  link?: string;
  surveyId?: string;
}

export async function createBroadcastNotification(params: BroadcastNotificationParams) {
  try {
    let query = supabase.from('users').select('id').eq('is_active', true);
    if (params.role) {
      query = query.eq('role', params.role);
    } else {
      query = query.eq('role', 'alumni');
    }
    const { data: users, error } = await query;
    if (error || !users || users.length === 0) return;

    const rows = users.map((u: any) => ({
      user_id: u.id,
      type: params.type || 'system',
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      survey_id: params.surveyId || null,
      is_read: false,
    }));

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await supabase.from('notifications').insert(batch);
    }
  } catch (err) {
    console.error('Failed to broadcast notifications:', err);
  }
}

export async function createSurveyNotifications(survey: any) {
  try {
    await createBroadcastNotification({
      role: 'alumni',
      type: 'survey',
      title: `📋 ${survey.title}`,
      message: `Please complete the tracer survey before ${survey.expires_at ? new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the closing date'}.`,
      link: `/surveys/${survey.id}`,
      surveyId: survey.id,
    });
  } catch (err) {
    console.error('Failed to create survey notifications:', err);
  }
}

export default router;

