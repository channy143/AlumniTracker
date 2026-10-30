import { Router } from 'express';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { connectionRequestSchema, connectionRespondSchema } from '../middleware/validationSchemas';
import { createNotification } from './notifications';

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

    const status = (req.query.status as string) || '';
    let query = db
      .from('connections')
      .select('*, requester:profiles!connections_requester_id_fkey(id, first_name, last_name, avatar_url, headline), recipient:profiles!connections_recipient_id_fkey(id, first_name, last_name, avatar_url, headline)')
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
    if (status) query = query.eq('status', status);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/request', authenticate, validate(connectionRequestSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { recipient_id, message } = req.body;
    if (!recipient_id) throw new AppError('Recipient is required', 400);

    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name, user_id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);
    const targetParam = recipient_id;
    const { data: targetProfile } = await db
      .from('profiles')
      .select('id, user_id, first_name, last_name')
      .or(`id.eq.${targetParam},user_id.eq.${targetParam}`)
      .maybeSingle();

    const finalRecipientId = targetProfile ? targetProfile.id : targetParam;
    if (profile.id === finalRecipientId) throw new AppError('Cannot connect with yourself', 400);

    // Check if a connection record already exists between the two profiles
    const { data: existingConn } = await db
      .from('connections')
      .select('id, status')
      .or(`and(requester_id.eq.${profile.id},recipient_id.eq.${finalRecipientId}),and(requester_id.eq.${finalRecipientId},recipient_id.eq.${profile.id})`)
      .maybeSingle();

    let data: any = null;
    if (existingConn) {
      if (existingConn.status === 'declined') {
        const { data: updated, error: updateErr } = await db
          .from('connections')
          .update({
            requester_id: profile.id,
            recipient_id: finalRecipientId,
            status: 'pending',
            message: message || null,
            created_at: new Date().toISOString(),
            connected_at: null,
          })
          .eq('id', existingConn.id)
          .select('*, requester:profiles!connections_requester_id_fkey(id, first_name, last_name, avatar_url, headline), recipient:profiles!connections_recipient_id_fkey(id, first_name, last_name, avatar_url, headline)')
          .single();
        if (updateErr) throw new AppError(updateErr.message, 500);
        data = updated;
      } else {
        throw new AppError('Connection request already exists', 400);
      }
    } else {
      const { data: inserted, error } = await db
        .from('connections')
        .insert({ requester_id: profile.id, recipient_id: finalRecipientId, message: message || null })
        .select('*, requester:profiles!connections_requester_id_fkey(id, first_name, last_name, avatar_url, headline), recipient:profiles!connections_recipient_id_fkey(id, first_name, last_name, avatar_url, headline)')
        .single();
      if (error && error.code === '23505') throw new AppError('Connection request already exists', 400);
      if (error) throw new AppError(error.message, 500);
      data = inserted;
    }

    // Create notification for the added alumnus
    let targetUserId = targetProfile?.user_id;
    if (!targetUserId) {
      const { data: tp } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', finalRecipientId)
        .maybeSingle();
      if (tp?.user_id) targetUserId = tp.user_id;
    }

    if (targetUserId) {
      const requesterName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'An alumnus';
      await createNotification({
        userId: targetUserId,
        type: 'mentorship',
        title: 'New Connection Request',
        message: `${requesterName} sent you a connection request.`,
        link: '/connections',
      });
    }

    res.status(201).json(data);
  } catch (err) { next(err); }
});


router.put('/:id/respond', authenticate, validate(connectionRespondSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { status } = req.body;
    if (!status || !['accepted', 'declined'].includes(status)) throw new AppError('Invalid status', 400);

    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: connection } = await db
      .from('connections')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!connection) throw new AppError('Connection not found', 404);
    if (connection.recipient_id !== profile.id) throw new AppError('Not authorized', 403);

    const { error } = await db
      .from('connections')
      .update({ status, connected_at: status === 'accepted' ? new Date().toISOString() : null })
      .eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    // If accepted, notify the requester that their request was accepted
    if (status === 'accepted') {
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', connection.requester_id)
        .maybeSingle();

      if (requesterProfile?.user_id) {
        const accepterName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'An alumnus';
        await createNotification({
          userId: requesterProfile.user_id,
          type: 'mentorship',
          title: 'Connection Accepted',
          message: `${accepterName} accepted your connection request.`,
          link: '/connections',
        });
      }
    }

    res.json({ message: `Connection ${status}` });
  } catch (err) { next(err); }
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

    let { data: connection } = await db
      .from('connections')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    // Fallback: allow canceling/removing by the other alumnus's profile ID
    if (!connection) {
      const { data: byPeer } = await db
        .from('connections')
        .select('*')
        .or(`and(requester_id.eq.${profile.id},recipient_id.eq.${req.params.id}),and(requester_id.eq.${req.params.id},recipient_id.eq.${profile.id})`)
        .maybeSingle();
      connection = byPeer;
    }

    if (!connection) throw new AppError('Connection not found', 404);
    if (connection.requester_id !== profile.id && connection.recipient_id !== profile.id) {
      throw new AppError('Not authorized', 403);
    }
    const { error: deleteErr } = await db.from('connections').delete().eq('id', connection.id);
    if (deleteErr) throw new AppError(deleteErr.message, 500);
    res.json({ message: 'Connection removed', id: connection.id });
  } catch (err) { next(err); }
});

router.get('/suggestions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: existing } = await db
      .from('connections')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
    const connectedIds = new Set<string>();
    existing?.forEach((c: any) => {
      connectedIds.add(c.requester_id);
      connectedIds.add(c.recipient_id);
    });
    connectedIds.add(profile.id);

    const { data: suggestions } = await db
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, headline')
      .not('id', 'in', `(${[...connectedIds].join(',')})`)
      .limit(10);
    res.json(suggestions || []);
  } catch (err) { next(err); }
});

export default router;
