import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { validate } from '../../middleware/validate';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';
import { requireAdminSudo } from '../../middleware/sudo';
import { adminSensitiveLimiter } from '../../middleware/rateLimiter';
import { invalidateUserSessions } from '../../services/sessionSecurityService';
import {
  loadRoleOverrides,
  loadRoleAppointments,
  createRoleAppointmentOffer,
  updateUserRoleWithFallback,
  insertUserWithRoleFallback,
  INSTITUTIONAL_ROLE_LABELS,
} from '../../services/roleOverrideService';
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminRoleSchema,
  adminResetPasswordSchema,
} from '../../middleware/validationSchemas';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const status = (req.query.status as string) || '';

    const [roleOverrides, roleAppointments, allRoleRowsRes] = await Promise.all([
      loadRoleOverrides(),
      loadRoleAppointments(),
      supabase.from('users').select('id, email, role, is_active, last_login, created_at'),
    ]);
    const hasRoleOverrides = Object.keys(roleOverrides).length > 0;

    let query = supabase
      .from('users')
      .select('id, email, role, is_verified, is_active, is_archived, last_login, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (role && !hasRoleOverrides) query = query.eq('role', role);

    const trimmedSearch = search.trim().toLowerCase();
    if (!trimmedSearch && !role) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: usersData, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = (usersData || []).map((u: any) => ({
      ...u,
      role: roleOverrides[u.id] || u.role,
      role_appointment: roleAppointments[u.id] || null,
    }));
    let totalCount = count || 0;

    if (role) {
      result = result.filter((u: any) => u.role === role);
      totalCount = result.length;
    }

    if (result.length > 0) {
      const userIds = result.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      result = result.map((u: any) => ({ ...u, profile: profileMap.get(u.id) || null }));

      if (trimmedSearch) {
        const tokens = trimmedSearch.split(/\s+/).filter(Boolean);
        result = result.filter((u: any) => {
          const email = (u.email || '').toLowerCase();
          const first = (u.profile?.first_name || '').toLowerCase();
          const last = (u.profile?.last_name || '').toLowerCase();
          const full = `${first} ${last}`.trim();
          const rev = `${last} ${first}`.trim();
          const idNum = (u.profile?.id_number || '').toLowerCase();
          return (
            email.includes(trimmedSearch) ||
            full.includes(trimmedSearch) ||
            rev.includes(trimmedSearch) ||
            idNum.includes(trimmedSearch) ||
            (tokens.length > 1 && tokens.every((t) => full.includes(t) || email.includes(t)))
          );
        });
        totalCount = result.length;
      }

      if (trimmedSearch || role) {
        result = result.slice(offset, offset + limit);
      }
    }

    // Compute governance role counts and institutional role holders across all pages
    let governanceUsers: any[] = [];
    const roleCounts: Record<string, number> = { admin: 0, alumni_officer: 0, registrar: 0, staff: 0, alumni: 0 };
    try {
      const allRoleRows = allRoleRowsRes.data || [];

      const resolvedRows = (allRoleRows || []).map((r: any) => ({
        ...r,
        role: roleOverrides[r.id] || r.role || 'alumni',
      }));

      resolvedRows.forEach((r: any) => {
        const key = r.role || 'alumni';
        roleCounts[key] = (roleCounts[key] || 0) + 1;
      });

      const govRows = resolvedRows.filter((r: any) =>
        ['admin', 'alumni_officer', 'staff', 'registrar'].includes(r.role)
      );
      if (govRows.length > 0) {
        const govIds = govRows.map((g: any) => g.id);
        const { data: govProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, avatar_url')
          .in('user_id', govIds);
        const govProfMap = new Map((govProfiles || []).map((p: any) => [p.user_id, p]));
        governanceUsers = govRows.map((g: any) => ({
          ...g,
          profile: govProfMap.get(g.id) || null,
        }));
      }
    } catch {}

    res.json({ data: result, total: totalCount, page, limit, governanceUsers, roleCounts });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(adminCreateUserSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role: userRole } = req.body;
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await insertUserWithRoleFallback({
      email,
      password_hash: hashedPassword,
      role: userRole || 'staff',
      is_verified: true,
    });

    await supabase.from('profiles').insert({
      user_id: user.id, first_name: firstName, last_name: lastName, email,
    });

    logAudit(req, {
      action: 'USER_CREATED',
      entity: 'user',
      entityId: user.id,
      severity: 'info',
      status: 'success',
      details: { email, role: userRole || 'staff', firstName, lastName },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No image file uploaded', 400);
    if (!req.file.mimetype.startsWith('image/')) {
      throw new AppError('Only image files are allowed', 400);
    }

    const parts = req.file.originalname.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'jpg';
    const fileName = `avatars/${req.params.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('user_id', req.params.id);

    if (updateError) {
      throw new AppError(`Failed to save profile photo: ${updateError.message}`, 500);
    }

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    next(err);
  }
});

async function ensureNotLastAdmin(targetUserId: string, actionLabel: string) {
  const { data: target } = await supabase
    .from('users')
    .select('id, role, is_active, is_archived')
    .eq('id', targetUserId)
    .maybeSingle();

  if (target?.role === 'admin' && target.is_active !== false && !target.is_archived) {
    const { data: admins } = await supabase
      .from('users')
      .select('id, is_active, is_archived')
      .eq('role', 'admin');
    const activeAdmins = (admins || []).filter((a: any) => a.is_active !== false && !a.is_archived);
    if (activeAdmins.length <= 1) {
      throw new AppError(`Cannot ${actionLabel} the last active administrator account.`, 400);
    }
  }
}

router.put('/:id', validate(adminUpdateUserSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    // Explicit allow-list instead of passing req.body directly. This prevents
    // mass-assignment of sensitive columns (role, password_hash) even if a
    // future schema change loosens validation.
    const { email, is_active, is_archived } = req.body;
    const payload: Record<string, unknown> = {};
    if (email !== undefined) payload.email = email;
    if (is_active !== undefined) payload.is_active = is_active;
    if (is_archived !== undefined) payload.is_archived = is_archived;

    if (Object.keys(payload).length === 0) {
      throw new AppError('No updatable fields provided', 400);
    }

    if (is_active === false || is_archived === true) {
      if (req.user?.userId === req.params.id) {
        throw new AppError('You cannot deactivate or archive your own administrator account.', 400);
      }
      await ensureNotLastAdmin(req.params.id, 'deactivate or archive');
    }

    const { error } = await supabase.from('users').update(payload).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    if (is_active === false || is_archived === true) {
      await invalidateUserSessions(req.params.id);
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/disable', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user?.userId === req.params.id) {
      throw new AppError('You cannot disable your own administrator account.', 400);
    }
    await ensureNotLastAdmin(req.params.id, 'disable');

    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', req.params.id);
    if (error && error.code === '42703') return res.json({ message: 'Account status column not available on this database' });
    if (error) throw new AppError(error.message, 500);

    await invalidateUserSessions(req.params.id);

    logAudit(req, {
      action: 'USER_DISABLED',
      entity: 'user',
      entityId: req.params.id,
      severity: 'warning',
      status: 'success',
      details: { targetUserId: req.params.id },
    });

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

    logAudit(req, {
      action: 'USER_ENABLED',
      entity: 'user',
      entityId: req.params.id,
      severity: 'info',
      status: 'success',
      details: { targetUserId: req.params.id },
    });

    res.json({ message: 'Account enabled' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', adminSensitiveLimiter, requireAdminSudo, validate(adminRoleSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { role } = req.body;
    if (req.user?.userId === req.params.id && role !== 'admin') {
      throw new AppError('You cannot demote your own administrator account.', 400);
    }
    if (role !== 'admin') {
      await ensureNotLastAdmin(req.params.id, 'demote');
    }

    if (role === 'alumni') {
      await createRoleAppointmentOffer(req.params.id, 'alumni');
      await invalidateUserSessions(req.params.id);
    } else {
      const offer = await createRoleAppointmentOffer(
        req.params.id,
        role,
        'Sheila Marie C Lopez (Alumni Chair)'
      );
      const roleLabel = offer?.offeredRoleLabel || INSTITUTIONAL_ROLE_LABELS[role] || role;

      await supabase.from('notifications').insert({
        user_id: req.params.id,
        type: 'system',
        title: `🎖️ Institutional Role Appointment: ${roleLabel}`,
        message: `Sheila Marie C Lopez (Alumni Chair) added the "${roleLabel}" role to your account! Click to review and accept your institutional role.`,
        link: `/?role_offer=${encodeURIComponent(role)}`,
        is_read: false,
      });
    }

    logAudit(req, {
      action: 'USER_ROLE_CHANGED',
      entity: 'user',
      entityId: req.params.id,
      severity: 'critical',
      status: 'success',
      details: { targetUserId: req.params.id, newRole: role, mode: role === 'alumni' ? 'revoked' : 'pending_acceptance' },
    });

    res.json({
      message:
        role === 'alumni'
          ? 'User role reset to Alumni Member'
          : `Role appointment sent! The user will be notified by Alumi to accept the ${INSTITUTIONAL_ROLE_LABELS[role] || role} role upon login.`,
      pendingAcceptance: role !== 'alumni',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', adminSensitiveLimiter, requireAdminSudo, validate(adminResetPasswordSchema), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const { error } = await supabase.from('users').update({ password_hash: hashedPassword }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    await invalidateUserSessions(req.params.id);

    logAudit(req, {
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      entity: 'user',
      entityId: req.params.id,
      severity: 'critical',
      status: 'success',
      details: { targetUserId: req.params.id, note: 'Admin forcibly reset user password' },
    });

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

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json([]);
    if (error) throw new AppError(error.message, 500);
    res.json(logs || []);
  } catch (err) {
    next(err);
  }
});

export default router;

