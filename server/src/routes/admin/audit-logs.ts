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
      .select('*, user:users!audit_logs_user_id_fkey(email)', { count: 'exact' });

    if (action) query = query.eq('action', action);
    if (entity) query = query.eq('entity', entity);
    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) query = query.lte('created_at', new Date(to).toISOString());
    if (search) query = query.or(`user.email.ilike.%${search}%,entity.ilike.%${search}%,details->>'email'.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ data: logs || [], total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

export default router;
