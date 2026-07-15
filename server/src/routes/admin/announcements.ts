import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';

    let query = supabase.from('announcements').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: announcements, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = announcements || [];
    const creatorIds = result.map((a: any) => a.created_by).filter(Boolean);
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, email')
        .in('id', creatorIds);
      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));
      result = result.map((a: any) => ({ ...a, user: creatorMap.get(a.created_by) || { email: null } }));
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, content, image_url, document_url, is_pinned, is_scheduled, scheduled_at, send_to_all, send_by_batch, send_by_course, target_batches, target_courses, status } = req.body;
    if (!title || !content) throw new AppError('Title and content are required', 400);

    const { data, error } = await supabase.from('announcements').insert({
      title, content, image_url, document_url, is_pinned: is_pinned || false,
      is_scheduled: is_scheduled || false, scheduled_at,
      send_to_all: send_to_all !== false, send_by_batch: send_by_batch || false, send_by_course: send_by_course || false,
      target_batches: target_batches || [], target_courses: target_courses || [],
      status: status || 'draft', created_by: (req as any).user!.userId,
    }).select().single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('announcements').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('announcements').update({ status: 'archived' }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Announcement archived' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/pin', async (req, res, next) => {
  try {
    const isPinned = req.body.is_pinned !== false;
    const { error } = await supabase.from('announcements').update({ is_pinned: isPinned }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: isPinned ? 'Announcement pinned' : 'Announcement unpinned' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/publish', async (req, res, next) => {
  try {
    const { error } = await supabase.from('announcements').update({
      status: 'published', published_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Announcement published' });
  } catch (err) {
    next(err);
  }
});

export default router;
