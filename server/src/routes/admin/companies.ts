import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const industry = (req.query.industry as string) || '';
    const verified = req.query.verified as string;

    let query = supabase.from('companies').select('*', { count: 'exact' });

    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    if (industry) query = query.eq('industry', industry);
    if (verified === 'true') query = query.eq('is_verified', true);
    else if (verified === 'false') query = query.eq('is_verified', false);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: companies, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ data: companies || [], total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, industry, website, description, address, city, province, contact_email, contact_phone } = req.body;
    if (!name) throw new AppError('Company name is required', 400);

    const { data, error } = await supabase.from('companies').insert({
      name, industry, website, description, address, city, province, contact_email, contact_phone,
    }).select().single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('companies').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Company updated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', async (req, res, next) => {
  try {
    const { error } = await supabase.from('companies').update({
      is_verified: true, verified_by: (req as any).user?.userId, verified_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Company verified' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('companies').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Company deactivated' });
  } catch (err) {
    next(err);
  }
});

export default router;
