import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';
import { formatProgramLongName } from '../../utils/formatProgram';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';

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
    const archivedParam = req.query.archived as string;

    let query = supabase
      .from('users')
      .select('id, email, role, is_verified, is_active, is_archived, last_login, created_at, updated_at')
      .eq('role', 'alumni')
      .order('created_at', { ascending: false });

    if (archivedParam === 'true') query = query.eq('is_archived', true);
    else if (archivedParam === 'false') query = query.eq('is_archived', false);

    if (status === 'verified') query = query.eq('is_verified', true);
    else if (status === 'unverified') query = query.eq('is_verified', false);

    const [
      { data: usersList, error: usersError },
      { data: allProfiles, error: profError },
      { data: allEducation, error: eduError },
      { data: allEmployment, error: empError },
    ] = await Promise.all([
      query,
      supabase.from('profiles').select('*'),
      supabase.from('education').select('id, profile_id, program, major, year_graduated, campus'),
      supabase.from('employment').select('*').eq('is_current', true),
    ]);

    if (usersError && (usersError.code === '42P01' || usersError.code === '42703')) {
      return res.json({ data: [], total: 0, page, limit, employers: [], locations: [] });
    }
    if (usersError) throw new AppError(usersError.message, 500);

    const profileByUserId = new Map<string, any>();
    (allProfiles || []).forEach((p: any) => {
      if (p.user_id) profileByUserId.set(p.user_id, p);
    });

    const eduByProfile = new Map<string, any[]>();
    (allEducation || []).forEach((e: any) => {
      if (e.profile_id) {
        if (!eduByProfile.has(e.profile_id)) eduByProfile.set(e.profile_id, []);
        eduByProfile.get(e.profile_id)!.push(e);
      }
    });

    const empByProfile = new Map<string, any[]>();
    (allEmployment || []).forEach((e: any) => {
      if (e.profile_id) {
        if (!empByProfile.has(e.profile_id)) empByProfile.set(e.profile_id, []);
        empByProfile.get(e.profile_id)!.push(e);
      }
    });

    // Populate distinct employers and locations across all profiles & employment records
    const distinctEmployerSet = new Set<string>();
    const distinctLocationSet = new Set<string>();

    (allProfiles || []).forEach((p: any) => {
      if (p.company_name?.trim()) distinctEmployerSet.add(p.company_name.trim());
      if (p.city?.trim()) distinctLocationSet.add(p.city.trim());
      if (p.province?.trim()) distinctLocationSet.add(p.province.trim());
    });
    (allEmployment || []).forEach((e: any) => {
      if (e.company_name?.trim()) distinctEmployerSet.add(e.company_name.trim());
    });

    const employers = Array.from(distinctEmployerSet).sort();
    const locations = Array.from(distinctLocationSet).sort();

    // Map each user with their profile, education, and current employment
    const enrichedAlumni = (usersList || []).map((u: any) => {
      const p = profileByUserId.get(u.id) || null;
      const pid = p?.id;
      const edus = (pid ? eduByProfile.get(pid) : null) || eduByProfile.get(u.id) || [];
      const emps = (pid ? empByProfile.get(pid) : null) || empByProfile.get(u.id) || [];

      const formattedEdus = edus.map((e: any) => ({
        ...e,
        program: e.program ? formatProgramLongName(e.program) : e.program,
      }));

      const profileObj = p
        ? {
            ...p,
            education: formattedEdus,
            employment: emps,
          }
        : {
            education: formattedEdus,
            employment: emps,
          };

      return {
        ...u,
        profile: profileObj,
      };
    });

    let filtered = enrichedAlumni;

    // Search filter: name, email, student ID, employer, program
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter((u: any) => {
        const p = u.profile;
        const fullName = `${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const idNumber = (p?.id_number || '').toLowerCase();
        const comp = (p?.employment?.[0]?.company_name || p?.company_name || '').toLowerCase();
        const prog = (p?.education?.[0]?.program || '').toLowerCase();
        return fullName.includes(s) || email.includes(s) || idNumber.includes(s) || comp.includes(s) || prog.includes(s);
      });
    }

    // Course filter with intelligent degree abbreviation handling
    if (course.trim()) {
      const f = course.trim().toLowerCase();
      filtered = filtered.filter((u: any) => {
        const edus = u.profile?.education || [];
        return edus.some((e: any) => {
          const prog = (e.program || '').toLowerCase();
          if (f === 'bsit') return prog.includes('bsit') || prog.includes('information technology');
          if (f === 'bit') return (prog.includes('bit') && !prog.includes('orbit')) || prog.includes('industrial technology');
          if (f === 'beed') return prog.includes('beed') || prog.includes('elementary education');
          if (f === 'bsed-math' || f === 'bsed') return prog.includes('bsed') || prog.includes('secondary education');
          if (f === 'btled') return prog.includes('btled') || prog.includes('technology and livelihood education') || prog.includes('home economics');
          return prog.includes(f) || f.includes(prog);
        });
      });
    }

    // Year / Batch filter
    if (year.trim()) {
      const targetYear = String(year.trim());
      filtered = filtered.filter((u: any) => {
        const edus = u.profile?.education || [];
        return edus.some((e: any) => String(e.year_graduated) === targetYear);
      });
    }

    // Employment Status filter: accurately accounts for profiles.employment_status and employment.employment_status
    if (employmentStatus.trim()) {
      const target = employmentStatus.trim().toLowerCase();
      filtered = filtered.filter((u: any) => {
        const p = u.profile;
        const emp = (p?.employment || [])[0];
        const raw = p?.employment_status || emp?.employment_status || '';
        const lower = String(raw).trim().toLowerCase();

        if (target === 'employed') {
          return lower === 'employed' || lower === 'full-time' || lower === 'part-time';
        }
        if (target === 'self-employed') {
          return lower === 'self-employed' || lower === 'entrepreneur' || lower === 'freelance';
        }
        if (target === 'unemployed') {
          return !lower || lower === 'unemployed' || lower === 'seeking' || lower === 'seeking opportunities' || lower === 'null';
        }
        if (target === 'seeking opportunities' || target === 'seeking') {
          return lower === 'seeking' || lower === 'seeking opportunities';
        }
        if (target === 'retired') {
          return lower === 'retired';
        }
        return lower === target;
      });
    }

    // Employer filter
    if (employer.trim()) {
      const target = employer.trim().toLowerCase();
      filtered = filtered.filter((u: any) => {
        const p = u.profile;
        const empComp = (p?.employment?.[0]?.company_name || '').trim().toLowerCase();
        const profComp = (p?.company_name || '').trim().toLowerCase();
        return empComp === target || profComp === target;
      });
    }

    // Location filter
    if (location.trim()) {
      const target = location.trim().toLowerCase();
      filtered = filtered.filter((u: any) => {
        const p = u.profile;
        const city = (p?.city || '').trim().toLowerCase();
        const prov = (p?.province || '').trim().toLowerCase();
        return city === target || prov === target || `${city}, ${prov}`.includes(target);
      });
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    res.json({
      data: paged,
      total,
      page,
      limit,
      employers,
      locations,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, role, is_verified, last_login, created_at')
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
      const dpaNotice = 
        '# -----------------------------------------------------------------------------\n' +
        '# CONFIDENTIALITY & DATA PRIVACY NOTICE (RULE 5 & REPUBLIC ACT NO. 10173)\n' +
        '# CTU-Naga Alumni Connect — Exported Alumni Personal Data\n' +
        '# Unauthorized disclosure, copying, or distribution is strictly prohibited.\n' +
        '# -----------------------------------------------------------------------------\n';

      logAudit(req, {
        action: 'ALUMNI_DATA_EXPORTED',
        entity: 'alumni',
        severity: 'warning',
        status: 'success',
        details: { count: rows.length, format: 'csv' },
      });

      if ((req as any).user?.userId) {
        await supabase.from('report_exports').insert({
          user_id: (req as any).user.userId,
          report_name: 'Alumni Directory Export',
          report_type: 'alumni_export',
          format: 'csv',
          record_count: rows.length,
          ip_address: req.ip || 'unknown',
          user_agent: req.headers['user-agent'] as string,
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni-export.csv');
      return res.send(`${dpaNotice}${headers}\n${csv}`);
    }

    logAudit(req, {
      action: 'ALUMNI_DATA_EXPORTED',
      entity: 'alumni',
      severity: 'warning',
      status: 'success',
      details: { count: users.length, format: 'json' },
    });

    if ((req as any).user?.userId) {
      await supabase.from('report_exports').insert({
        user_id: (req as any).user.userId,
        report_name: 'Alumni Directory Export',
        report_type: 'alumni_export',
        format: 'json',
        record_count: users.length,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] as string,
      });
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
      .select('id, email, role, is_verified, is_active, is_archived, last_login, created_at, updated_at')
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
      .select('id, email, role, is_verified, created_at')
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
      try {
        await supabase.from('alumni_eligible').update({ user_id: user.id }).eq('student_id', idNumber);
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

    logAudit(req, {
      action: 'ALUMNI_ARCHIVED',
      entity: 'alumni',
      entityId: req.params.id,
      severity: 'warning',
      status: 'success',
      details: { targetAlumniId: req.params.id },
    });

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

    logAudit(req, {
      action: 'ALUMNI_RESTORED',
      entity: 'alumni',
      entityId: req.params.id,
      severity: 'info',
      status: 'success',
      details: { targetAlumniId: req.params.id },
    });

    res.json({ message: 'Alumni restored' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/verify', async (req, res, next) => {
  try {
    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    logAudit(req, {
      action: 'ALUMNI_VERIFIED',
      entity: 'alumni',
      entityId: req.params.id,
      severity: 'info',
      status: 'success',
      details: { targetAlumniId: req.params.id },
    });

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

router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const targetId = req.params.id;

    // Guard: Prevent admin from deleting their own account
    if (req.user && req.user.userId === targetId) {
      throw new AppError('You cannot delete your own account', 400);
    }

    // Verify user exists and has role 'alumni'
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', targetId)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!targetUser) throw new AppError('Alumni not found', 404);
    if (targetUser.role !== 'alumni') {
      throw new AppError('Only alumni accounts can be deleted from Alumni Management', 400);
    }

    const { error } = await supabase.from('users').delete().eq('id', targetId);
    if (error) throw new AppError(error.message, 500);

    logAudit(req, {
      action: 'ALUMNI_DELETED',
      entity: 'alumni',
      entityId: targetId,
      severity: 'critical',
      status: 'success',
      details: { targetAlumniId: targetId, email: targetUser.email },
    });

    res.json({ message: 'Alumni deleted permanently' });
  } catch (err) {
    next(err);
  }
});

router.put('/employment/:employmentId/verify', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, notes } = req.body;
    const isVerified = status === 'verified';
    const { data, error } = await supabase
      .from('employment')
      .update({
        is_verified: isVerified,
        verification_status: status || (isVerified ? 'verified' : 'rejected'),
        verification_notes: notes || null,
        verified_at: isVerified ? new Date().toISOString() : null,
        verified_by: isVerified ? (req.user?.userId || null) : null,
      })
      .eq('id', req.params.employmentId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    logAudit(req, {
      action: isVerified ? 'VERIFY_EMPLOYMENT_PROOF' : 'REJECT_EMPLOYMENT_PROOF',
      entity: 'employment',
      entityId: req.params.employmentId,
      severity: 'info',
      status: 'success',
      details: { verification_status: status, notes },
    });

    res.json({ message: `Employment record marked as ${status}`, data });
  } catch (err) {
    next(err);
  }
});

export default router;
