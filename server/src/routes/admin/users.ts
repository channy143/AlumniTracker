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

    let query = supabase.from('users').select('*', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (search) query = query.or(`email.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: usersData, count, error } = await query;
    if (error && error.code === '42P01') return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = usersData || [];
    if (result.length > 0) {
      const userIds = result.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      result = result.map((u: any) => ({ ...u, profile: profileMap.get(u.id) || null }));

      if (search) {
        const s = search.toLowerCase();
        result = result.filter((u: any) =>
          (u.email && u.email.toLowerCase().includes(s)) ||
          (u.profile?.first_name && u.profile.first_name.toLowerCase().includes(s)) ||
          (u.profile?.last_name && u.profile.last_name.toLowerCase().includes(s))
        );
      }
    }

    res.json({ data: result, total: count || 0, page, limit });
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
    if (error && error.code === '42703') return res.json({ message: 'Account status column not available on this database' });
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Account disabled' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/enable', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', req.params.id);
    if (error && error.code === '42703') return res.json({ message: 'Account status column not available on this database' });
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

    if (error && error.code === '42P01') return res.json([]);
    if (error) throw new AppError(error.message, 500);
    res.json(logs || []);
  } catch (err) {
    next(err);
  }
});

export default router;
