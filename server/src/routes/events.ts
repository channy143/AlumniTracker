import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { data: events, error } = await supabase
      .from('feed_posts')
      .select('id, title, content, created_at, image_url, company, job_url, event_date, event_time, event_location, event_gallery')
      .eq('type', 'event')
      .order('created_at', { ascending: false });

    if (error) {
      return res.json([]);
    }

    res.json((events || []).map((e: any) => ({
      id: e.id,
      name: e.title,
      description: e.content || '',
      date: e.event_date
        ? new Date(e.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date(e.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: e.event_time || '',
      location: e.event_location || '',
      organizer: e.company || '',
      banner: e.image_url || '',
      registration_link: e.job_url || '',
      gallery: e.event_gallery || [],
      created_at: e.created_at,
    })));
  } catch (err) { next(err); }
});

export default router;
