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
    const course = (req.query.course as string) || '';
    const year = (req.query.year as string) || '';
    const status = (req.query.status as string) || '';
    const employmentStatus = (req.query.employment_status as string) || '';
    const archived = req.query.archived === 'true';

    const { data: allUsers, count, error } = await supabase
      .from('users')
      .select('*, profile:profiles(*)', { count: 'exact' })
      .eq('role', 'alumni')
      .eq('is_archived', archived)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    let filtered = allUsers || [];

    if (status === 'active') filtered = filtered.filter((u: any) => u.is_active === true);
    else if (status === 'inactive') filtered = filtered.filter((u: any) => u.is_active === false);
    else if (status === 'verified') filtered = filtered.filter((u: any) => u.is_verified === true);
    else if (status === 'unverified') filtered = filtered.filter((u: any) => u.is_verified === false);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((u: any) =>
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.profile?.first_name && u.profile.first_name.toLowerCase().includes(s)) ||
        (u.profile?.last_name && u.profile.last_name.toLowerCase().includes(s)) ||
        (u.profile?.id_number && u.profile.id_number.toLowerCase().includes(s))
      );
    }

    if (course || year || employmentStatus) {
      const profileIds = filtered.map((u: any) => u.profile?.id).filter(Boolean);
      if (profileIds.length > 0) {
        let eduQuery = supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds);
        if (course) eduQuery = eduQuery.eq('program', course);
        if (year && !isNaN(parseInt(year))) eduQuery = eduQuery.eq('year_graduated', parseInt(year));
        const { data: education } = await eduQuery;
        const validProfileIds = new Set(education?.map((e: any) => e.profile_id) || []);

        if (employmentStatus) {
          const { data: empData } = await supabase
            .from('employment')
            .select('profile_id')
            .in('profile_id', profileIds)
            .eq('is_current', true)
            .eq('employment_status', employmentStatus);
          const empProfileIds = new Set(empData?.map((e: any) => e.profile_id) || []);
          filtered = filtered.filter((u: any) => u.profile?.id && validProfileIds.has(u.profile.id) && empProfileIds.has(u.profile.id));
        } else {
          filtered = filtered.filter((u: any) => u.profile?.id && validProfileIds.has(u.profile.id));
        }
      } else {
        filtered = [];
      }
    }

    const paginated = filtered.slice(offset, offset + limit);
    res.json({ data: paginated, total: filtered.length, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: users } = await supabase
      .from('users')
      .select('*, profile:profiles(*), education:education(*), employment:employment(*)')
      .eq('role', 'alumni');

    if (format === 'csv') {
      const rows = (users || []).map((u: any) => ({
        email: u.email,
        first_name: u.profile?.first_name || '',
        last_name: u.profile?.last_name || '',
        id_number: u.profile?.id_number || '',
        phone: u.profile?.phone || '',
        city: u.profile?.city || '',
        province: u.profile?.province || '',
        is_verified: u.is_verified,
        created_at: u.created_at,
      }));
      const headers = Object.keys(rows[0] || {}).join(',');
      const csv = rows.map((r: any) => Object.values(r).map((v: any) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni-export.csv');
      return res.send(`${headers}\n${csv}`);
    }

    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, profile:profiles(*), education:education(*), employment:employment(*), skills:skills(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Alumni not found', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, idNumber, program, yearGraduated } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ email, password_hash: hashedPassword, role: 'alumni', is_verified: true })
      .select()
      .single();

    if (userError) throw new AppError(userError.message, 500);

    await supabase.from('profiles').insert({
      user_id: user.id, first_name: firstName, last_name: lastName, email,
      id_number: idNumber || null,
    });

    if (program || yearGraduated) {
      await supabase.from('education').insert({
        profile_id: user.id, program: program || '', year_graduated: yearGraduated ? parseInt(yearGraduated) : null, campus: 'Naga Extension Campus',
      });
    }

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { email, profile, education: eduData } = req.body;
    if (email) {
      const { error: emailError } = await supabase.from('users').update({ email }).eq('id', req.params.id);
      if (emailError) throw new AppError(emailError.message, 500);
    }
    if (profile) {
      const { error: profileError } = await supabase.from('profiles').update(profile).eq('user_id', req.params.id);
      if (profileError) throw new AppError(profileError.message, 500);
    }
    if (eduData) {
      const { data: existing } = await supabase.from('education').select('id').eq('profile_id', req.params.id).maybeSingle();
      if (existing) {
        await supabase.from('education').update(eduData).eq('id', existing.id);
      } else {
        await supabase.from('education').insert({ profile_id: req.params.id, ...eduData });
      }
    }
    res.json({ message: 'Alumni updated successfully' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/archive', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_archived: true, is_active: false }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Alumni archived' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/restore', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_archived: false, is_active: true }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Alumni restored' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', async (_req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', _req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Alumni verified' });
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

router.get('/:id/employment', async (req, res, next) => {
  try {
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', req.params.id).maybeSingle();
    if (!profile) return res.json([]);
    const { data: employment } = await supabase
      .from('employment')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });
    res.json(employment || []);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Alumni deleted permanently' });
  } catch (err) {
    next(err);
  }
});

export default router;
