import { Router } from 'express';
import { createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { logAudit } from '../services/auditLogger';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: employment, error } = await db
      .from('employment')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: employment, error } = await db
      .from('employment')
      .insert({ ...req.body, profile_id: profile.id })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(employment);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Rule 2 – Authorized Access: Verify ownership before update
    const { data: existing, error: findError } = await db
      .from('employment')
      .select('id, profile_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!existing) throw new AppError('Employment record not found', 404);

    if (existing.profile_id !== profile.id && req.user!.role !== 'admin') {
      logAudit(req, {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'employment',
        severity: 'warning',
        status: 'failure',
        details: { target_employment_id: req.params.id, reason: 'Alumni attempted to update another user\'s employment record' },
      });
      throw new AppError('Unauthorized: Users may only access and manage information allowed by their account role.', 403);
    }

    const { data: employment, error } = await db
      .from('employment')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Rule 2 – Authorized Access: Verify ownership before deletion
    const { data: existing, error: findError } = await db
      .from('employment')
      .select('id, profile_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!existing) throw new AppError('Employment record not found', 404);

    if (existing.profile_id !== profile.id && req.user!.role !== 'admin') {
      logAudit(req, {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'employment',
        severity: 'warning',
        status: 'failure',
        details: { target_employment_id: req.params.id, reason: 'Alumni attempted to delete another user\'s employment record' },
      });
      throw new AppError('Unauthorized: Users may only access and manage information allowed by their account role.', 403);
    }

    const { error } = await db
      .from('employment')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
