import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

let eventColumnsSupported: boolean | null = null;

async function hasEventColumns(): Promise<boolean> {
  if (eventColumnsSupported !== null) return eventColumnsSupported;
  const { error } = await supabase.from('feed_posts').select('id, event_date').limit(1);
  eventColumnsSupported = !error;
  return eventColumnsSupported;
}

function mapRow(e: any) {
  return {
    id: e.id,
    name: e.title,
    description: e.content || '',
    date: e.event_date || '',
    time: e.event_time || '',
    location: e.event_location || '',
    organizer: e.company || '',
    banner: e.image_url || '',
    registration_link: e.job_url || '',
    gallery: e.event_gallery || [],
    created_at: e.created_at,
  };
}

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// GET /api/admin/events - list events
router.get('/', async (_req, res, next) => {
  try {
    const supported = await hasEventColumns();
    let query = supabase.from('feed_posts').select('*').eq('type', 'event');
    if (supported) query = query.order('event_date', { ascending: true, nullsFirst: false });
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json([]);
    if (error) throw new AppError(error.message, 500);

    res.json((data || []).map(mapRow));
  } catch (err) { next(err); }
});

// POST /api/admin/events - create an event as a feed post
router.post('/', async (req, res, next) => {
  try {
    const { name, description, date, time, location } = req.body || {};
    if (!name) throw new AppError('Event name is required', 400);

    const payload: Record<string, any> = {
      type: 'event',
      title: name,
      content: description || '',
      author: 'CTU-Naga Alumni Office',
      author_avatar: 'C',
      tag: 'Event',
      tag_color: 'bg-pink-50 text-pink-700',
      is_official: true,
    };

    if (await hasEventColumns()) {
      payload.event_date = date || null;
      payload.event_time = time || null;
      payload.event_location = location || null;
    }

    const { data, error } = await supabase.from('feed_posts').insert(payload).select().single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json(mapRow(data));
  } catch (err) { next(err); }
});

// PUT /api/admin/events - update an event (id sent in body)
router.put('/', async (req, res, next) => {
  try {
    const { id, name, description, date, time, location } = req.body || {};
    if (!id) throw new AppError('Event id is required', 400);

    const payload: Record<string, any> = {
      title: name,
      content: description || '',
    };

    if (await hasEventColumns()) {
      payload.event_date = date || null;
      payload.event_time = time || null;
      payload.event_location = location || null;
    }

    const { data, error } = await supabase.from('feed_posts')
      .update(payload)
      .eq('id', id)
      .eq('type', 'event')
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(mapRow(data));
  } catch (err) { next(err); }
});

// DELETE /api/admin/events/:id - delete an event
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('feed_posts').delete().eq('id', req.params.id).eq('type', 'event');
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Event deleted' });
  } catch (err) { next(err); }
});

export default router;
