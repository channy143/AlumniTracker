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
    const employer = (req.query.employer as string) || '';
    const location = (req.query.location as string) || '';
    const archived = req.query.archived === 'true';

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'alumni');

    if (archived) query = query.eq('is_archived', true);

    if (status === 'verified') query = query.eq('is_verified', true);
    else if (status === 'unverified') query = query.eq('is_verified', false);

    if (search) {
      query = query.or(`email.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: usersList, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === '42703')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = usersList || [];

    const userIds = result.map((u: any) => u.id).filter(Boolean);

    if (userIds.length > 0) {
      const [{ data: profiles }] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', userIds),
      ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const profileIds = (profiles || []).map((p: any) => p.id).filter(Boolean);

      result = result.map((u: any) => ({ ...u, profile: profileMap.get(u.id) || null }));

      if (search) {
        const s = search.toLowerCase();
        result = result.filter((u: any) =>
          (u.email && u.email.toLowerCase().includes(s)) ||
          (u.profile?.first_name && u.profile.first_name.toLowerCase().includes(s)) ||
          (u.profile?.last_name && u.profile.last_name.toLowerCase().includes(s)) ||
          (u.profile?.id_number && u.profile.id_number.toLowerCase().includes(s))
        );
      }

      // Filter by course/batch via education table (using profile_ids)
      if (course || year) {
        let eduQuery = supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds);
        if (course) {
          const courseAliases: Record<string, string[]> = {
            'BSIT': ['BSIT', 'Bachelor of Science in Information Technology'],
            'BIT': ['BIT', 'Bachelor in Industrial Technology'],
            'BEEd': ['BEEd', 'Bachelor of Elementary Education'],
            'BSEd-Math': ['BSEd-Math', 'Bachelor of Secondary Education', 'Bachelor of Secondary Education major in Mathematics'],
            'BTLED-HE': ['BTLED-HE', 'Bachelor of Technology and Livelihood Education major in Home Economics'],
            'BTLED-ICT': ['BTLED-ICT', 'Bachelor of Technology and Livelihood Education major in Information and Communications Technology'],
          };
          const matchKey = Object.keys(courseAliases).find((k) => k.toLowerCase() === course.toLowerCase()) || course;
          const aliases = courseAliases[matchKey] || [course];
          const conditions = aliases.map((a) => `program.ilike.%${a}%`).join(',');
          eduQuery = eduQuery.or(conditions);
        }
        if (year && !isNaN(parseInt(year))) eduQuery = eduQuery.eq('year_graduated', parseInt(year));
        const { data: filteredEdu } = await eduQuery;
        const validProfileIds = new Set((filteredEdu || []).map((e: any) => e.profile_id));
        result = result.filter((u: any) => u.profile && validProfileIds.has(u.profile.id));
      }

      // Filter by employment status
      if (employmentStatus) {
        const statusMap: Record<string, string> = {
          'employed': 'employed', 'Employed': 'employed',
          'self-employed': 'self-employed', 'Self-employed': 'self-employed',
          'unemployed': 'unemployed', 'Unemployed': 'unemployed',

          'seeking': 'seeking', 'Seeking Opportunities': 'seeking',
          'retired': 'retired', 'Retired': 'retired',
        };
        const dbStatus = statusMap[employmentStatus] || employmentStatus.toLowerCase();
        const { data: empData } = await supabase
          .from('employment')
          .select('profile_id')
          .in('profile_id', profileIds)
          .eq('is_current', true)
          .eq('employment_status', dbStatus);
        const empProfileIds = new Set((empData || []).map((e: any) => e.profile_id));
        result = result.filter((u: any) => u.profile && empProfileIds.has(u.profile.id));
      }

      // Fetch education & employment data for display (use profile_ids)
      if (profileIds.length > 0) {
        const [{ data: education }, { data: employment }] = await Promise.all([
          supabase.from('education').select('profile_id, program, year_graduated').in('profile_id', profileIds),
          supabase.from('employment').select('*').in('profile_id', profileIds).eq('is_current', true),
        ]);

        const eduMap = new Map((education || []).map((e: any) => [e.profile_id, e]));
        const empMap = new Map((employment || []).map((e: any) => [e.profile_id, e]));

        result = result.map((u: any) => {
          if (u.profile) {
            u.profile.education = eduMap.has(u.profile.id) ? [eduMap.get(u.profile.id)] : [];
            u.profile.employment = empMap.has(u.profile.id) ? [empMap.get(u.profile.id)] : [];
          }
          return u;
        });
      }

      // Filter by employer and location (exact match from dropdown values)
      if (employer) {
        result = result.filter((u: any) => {
          const emp = (u.profile?.employment || [])[0];
          return emp?.company_name === employer;
        });
      }
      if (location) {
        result = result.filter((u: any) => u.profile?.city === location);
      }
    }

    // Get distinct employers and locations for filter dropdowns
    const [{ data: distinctCompanies }, { data: distinctCities }] = await Promise.all([
      supabase.from('employment').select('company_name').not('company_name', 'is', null),
      supabase.from('profiles').select('city').not('city', 'is', null),
    ]);
    const employers = [...new Set((distinctCompanies || []).map((e: any) => e.company_name).filter(Boolean))].sort();
    const locations = [...new Set((distinctCities || []).map((p: any) => p.city).filter(Boolean))].sort();

    res.json({ data: result, total: count || 0, page, limit, employers, locations });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: usersData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'alumni');
    const { data: profiles } = await supabase.from('profiles').select('*');
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const users = (usersData || []).map((u: any) => ({ ...u, profile: profileMap.get(u.id) || null }));

    if (format === 'csv') {
      const rows = (users || []).map((u: any) => ({
        email: u.email,
        first_name: u.profile?.first_name || '',
        last_name: u.profile?.last_name || '',
        id_number: u.profile?.id_number || '',
        phone: u.profile?.phone || '',
        city: u.profile?.city || '',
        province: u.profile?.province || '',
        employment_status: u.profile?.employment_status || '',
        current_job_title: u.profile?.current_job_title || '',
        company_name: u.profile?.company_name || '',
        industry: u.profile?.industry || '',
        salary_range: u.profile?.salary_range || '',
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
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Alumni not found', 404);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', req.params.id)
      .maybeSingle();

    const profileId = profile?.id || req.params.id;

    const [educationRes, employmentRes, skillsRes] = await Promise.all([
      supabase.from('education').select('*').eq('profile_id', profileId),
      supabase.from('employment').select('*').eq('profile_id', profileId),
      supabase.from('skills').select('*').eq('profile_id', profileId),
    ]);

    res.json({
      ...user,
      profile: profile || null,
      education: educationRes.data || [],
      employment: employmentRes.data || [],
      skills: skillsRes.data || [],
    });
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

    let profileInsertPayload: Record<string, any> = {
      user_id: user.id, first_name: firstName, last_name: lastName, email,
    };
    if (idNumber) {
      try {
        const { data: testCol } = await supabase.from('profiles').select('id_number').limit(1);
        if (testCol !== undefined) profileInsertPayload.id_number = idNumber;
      } catch {}
    }
    await supabase.from('profiles').insert(profileInsertPayload);

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
    const { email, profile, education: eduData, career } = req.body;
    if (email) {
      const { error: emailError } = await supabase.from('users').update({ email }).eq('id', req.params.id);
      if (emailError) throw new AppError(emailError.message, 500);
    }
    if (profile) {
      const { error: profileError } = await supabase.from('profiles').update(profile).eq('user_id', req.params.id);
      if (profileError) throw new AppError(profileError.message, 500);
    }
    if (career) {
      const careerFields: Record<string, any> = {};
      const allowed = ['employment_status', 'current_job_title', 'company_name', 'industry', 'salary_range'];
      for (const field of allowed) {
        if (career[field] !== undefined) careerFields[field] = career[field];
      }
      if (Object.keys(careerFields).length > 0) {
        careerFields.last_updated_at = new Date().toISOString();
        const { error: careerError } = await supabase.from('profiles').update(careerFields).eq('user_id', req.params.id);
        if (careerError) throw new AppError(careerError.message, 500);
      }
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
    if (error && error.code === '42703') return res.json({ message: 'Archive column not available on this database' });
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Alumni archived' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/restore', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_archived: false, is_active: true }).eq('id', req.params.id);
    if (error && error.code === '42703') return res.json({ message: 'Restore column not available on this database' });
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
