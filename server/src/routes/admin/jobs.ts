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
    const search = (req.query.search as string) || '';

    let query = supabase.from('job_postings').select('*, profiles!job_postings_posted_by_fkey(first_name, last_name)', { count: 'exact' });

    if (status === 'active') query = query.gte('expires_at', new Date().toISOString());
    else if (status === 'expired') query = query.lt('expires_at', new Date().toISOString());
    if (search) query = query.or(`position.ilike.%${search}%,company_name.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: jobs, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ data: jobs || [], total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/close', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').update({ expires_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job posting closed' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/applicants', async (req, res, next) => {
  try {
    const { data: applicants, error } = await supabase
      .from('job_applications')
      .select('*, user:users!job_applications_user_id_fkey(id, email, profile:profiles!user_id(first_name, last_name))')
      .eq('job_id', req.params.id)
      .order('applied_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(applicants || []);
  } catch (err) {
    next(err);
  }
});

export default router;
