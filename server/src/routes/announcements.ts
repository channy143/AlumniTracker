import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return res.json([]);
    }

    const result = await Promise.all((announcements || []).map(async (a: any) => {
      let createdBy = 'Admin';
      if (a.created_by) {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('id', a.created_by)
          .single();
        if (user) createdBy = user.email;
      }
      return {
        id: a.id,
        title: a.title,
        content: a.content,
        image_url: a.image_url,
        document_url: a.document_url,
        is_pinned: a.is_pinned,
        created_at: a.created_at,
        created_by: createdBy,
      };
    }));

    res.json(result);
  } catch (err) { next(err); }
});

export default router;
