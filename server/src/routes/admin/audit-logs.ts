import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const action = (req.query.action as string) || '';
    const entity = (req.query.entity as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action) query = query.eq('action', action);
    if (entity) query = query.eq('entity', entity);
    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) query = query.lte('created_at', new Date(to).toISOString());
    if (search) query = query.or(`entity.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;
    if (error && error.code === '42P01') return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = logs || [];
    const logUserIds = result.map((l: any) => l.user_id).filter(Boolean);
    if (logUserIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', logUserIds);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      result = result.map((l: any) => ({ ...l, user: userMap.get(l.user_id) || { email: null } }));
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

export default router;
