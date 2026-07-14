import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const surveysWithCounts = await Promise.all((surveys || []).map(async (survey) => {
      const { count } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.id);
      return { ...survey, responseCount: count || 0 };
    }));

    res.json(surveysWithCounts);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, questions, target_groups, starts_at, expires_at } = req.body;
    if (!title || !questions) throw new AppError('Title and questions are required', 400);

    const { data, error } = await supabase.from('surveys').insert({
      title, description, questions, target_groups: target_groups || [],
      starts_at: starts_at || new Date().toISOString(), expires_at,
    }).select().single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey deleted' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/activate', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').update({ is_active: true }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey activated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/deactivate', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey deactivated' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/responses', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: responses, count, error } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact' })
      .eq('survey_id', req.params.id)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error && error.code === '42P01') return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = responses || [];
    const userIds = result.map((r: any) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      result = result.map((r: any) => ({
        ...r,
        user: {
          ...(userMap.get(r.user_id) || { id: r.user_id, email: null }),
          profile: profileMap.get(r.user_id) || null,
        },
      }));
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/responses/export', async (req, res, next) => {
  try {
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', req.params.id);

    const { data: survey } = await supabase.from('surveys').select('title, questions').eq('id', req.params.id).single();

    let result = responses || [];
    const userIds = result.map((r: any) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, email').in('id', userIds);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      result = result.map((r: any) => ({ ...r, user: userMap.get(r.user_id) || { email: null } }));
    }

    const csvRows = (result || []).map((r: any) => {
      const row: Record<string, string> = { email: r.user?.email || '' };
      if (survey?.questions) {
        (survey.questions as any[]).forEach((q: any, i: number) => {
          row[q.title || `Question ${i + 1}`] = r.responses?.[i] || '';
        });
      }
      return row;
    });

    if (csvRows.length === 0) return res.json([]);

    const headers = Object.keys(csvRows[0]);
    const csv = csvRows.map((r: any) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${req.params.id.slice(0, 8)}-responses.csv`);
    return res.send(`${headers.join(',')}\n${csv}`);
  } catch (err) {
    next(err);
  }
});

export default router;
