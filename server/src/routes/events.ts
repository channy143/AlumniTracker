import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { data: events, error } = await supabase
      .from('feed_posts')
      .select('id, title, content, created_at')
      .eq('type', 'event')
      .gte('created_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      return res.json([]);
    }

    res.json((events || []).map((e: any) => ({
      id: e.id,
      name: e.title,
      date: new Date(e.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    })));
  } catch (err) { next(err); }
});

export default router;
