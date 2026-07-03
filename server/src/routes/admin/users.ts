import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const status = (req.query.status as string) || '';

    let query = supabase.from('users').select('*, profile:profiles(*)', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (status === 'active') query = query.eq('is_active', true);
    else if (status === 'inactive') query = query.eq('is_active', false);
    if (search) query = query.or(`email.ilike.%${search}%,profile.first_name.ilike.%${search}%,profile.last_name.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json({ data: users || [], total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role: userRole } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, role: userRole || 'staff', is_verified: true })
      .select()
      .single();

    if (userError) throw new AppError(userError.message, 500);

    await supabase.from('profiles').insert({
      user_id: user.id, first_name: firstName, last_name: lastName, email,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'User updated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/disable', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Account disabled' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/enable', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Account enabled' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'staff', 'alumni'].includes(role)) {
      throw new AppError('Valid role is required (admin, staff, alumni)', 400);
    }
    const { error } = await supabase.from('users').update({ role }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: `Role updated to ${role}` });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) throw new AppError('New password is required', 400);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const { error } = await supabase.from('users').update({ password_hash: hashedPassword }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/login-history', async (req, res, next) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', req.params.id)
      .eq('action', 'login')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new AppError(error.message, 500);
    res.json(logs || []);
  } catch (err) {
    next(err);
  }
});

export default router;
