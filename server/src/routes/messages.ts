import { Router, Request, Response } from 'express';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sanitizeFilterInput } from '../utils/sanitizeFilterInput';
import { sendMessageSchema } from '../middleware/validationSchemas';

import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';
import {
  userPresenceMap,
  markUserActive,
  markUserOffline,
  checkIsOnline,
  getProfileIdForUser,
  resolveReceiverProfileId,
  ONLINE_THRESHOLD_MS,
} from '../services/presenceService';

// Re-export userPresenceMap for any consumers
export { userPresenceMap };

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

    const { data, error } = await db
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/heartbeat', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const nowIso = new Date().toISOString();

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    await markUserActive(userId, profile?.id);

    res.json({ success: true, last_active_at: nowIso });
  } catch (err) { next(err); }
});

/**
 * Explicit offline signal (sent via navigator.sendBeacon on tab close or pagehide)
 */
router.post('/offline', async (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], getJwtSecret()) as any;
        userId = decoded.userId;
      } catch {}
    }

    if (!userId && req.body?.token) {
      try {
        const decoded = jwt.verify(req.body.token, getJwtSecret()) as any;
        userId = decoded.userId;
      } catch {}
    }

    if (!userId && req.body?.userId) {
      userId = req.body.userId;
    }

    if (userId) {
      await markUserOffline(userId);
    }

    res.json({ success: true, is_online: false });
  } catch {
    res.json({ success: false });
  }
});

router.get('/presence', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawIds = ((req.query.profileIds as string) || '').trim();
    if (!rawIds) {
      return res.json({});
    }

    const ids = Array.from(new Set(rawIds.split(',').map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) {
      return res.json({});
    }

    const { data: profilesById } = await supabase
      .from('profiles')
      .select('id, user_id, last_active_at')
      .in('id', ids);

    const foundIds = new Set(profilesById?.map((p) => p.id) || []);
    const missingIds = ids.filter((id) => !foundIds.has(id));

    let profilesByUserId: any[] = [];
    if (missingIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, last_active_at')
        .in('user_id', missingIds);
      profilesByUserId = data || [];
    }

    const profileMap = new Map<string, any>();
    [...(profilesById || []), ...profilesByUserId].forEach((p) => {
      if (p.id) profileMap.set(p.id, p);
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    const result: Record<string, { is_online: boolean; last_active_at: string | null }> = {};

    for (const id of ids) {
      const p = profileMap.get(id);
      const presence = checkIsOnline(id, p?.last_active_at);

      result[id] = {
        is_online: presence.isOnline,
        last_active_at: presence.lastActiveAt,
      };
    }

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: sent } = await db
      .from('messages')
      .select(`
        receiver_id,
        receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url, last_active_at),
        body, created_at, is_read
      `)
      .eq('sender_id', profile.id)
      .order('created_at', { ascending: false });

    const { data: received } = await db
      .from('messages')
      .select(`
        sender_id,
        sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url, last_active_at),
        body, created_at, is_read
      `)
      .eq('receiver_id', profile.id)
      .order('created_at', { ascending: false });

    const conversationMap = new Map<string, any>();
    [...(sent || []), ...(received || [])].forEach((msg: any) => {
      const otherId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
      const other = msg.sender_id === profile.id ? msg.receiver : msg.sender;
      if (!conversationMap.has(otherId) || new Date(msg.created_at) > new Date(conversationMap.get(otherId).lastMessageAt)) {
        conversationMap.set(otherId, {
          profile_id: otherId,
          first_name: other?.first_name,
          last_name: other?.last_name,
          avatar_url: other?.avatar_url,
          lastMessage: msg.body,
          lastMessageAt: msg.created_at,
          last_active_at: other?.last_active_at || null,
          unread: msg.sender_id !== profile.id && !msg.is_read ? 1 : 0,
        });
      }
    });

    const unreadCounts: Record<string, number> = {};
    received?.forEach((msg: any) => {
      if (!msg.is_read) {
        unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
      }
    });

    conversationMap.forEach((conv, id) => {
      conv.unread = unreadCounts[id] || 0;
      const presence = checkIsOnline(id, conv.last_active_at);
      conv.is_online = presence.isOnline;
      conv.last_active_at = presence.lastActiveAt;
    });

    res.json(Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
  } catch (err) { next(err); }
});

router.get('/:profileId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const senderProfileId = await getProfileIdForUser(req.user!.userId);
    if (!senderProfileId) throw new AppError('Profile not found', 404);

    const targetParam = sanitizeFilterInput(req.params.profileId);
    const targetProfileId = await resolveReceiverProfileId(targetParam);

    const db = createUserScopedClient(req.token!);
    const { data, error } = await db
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url)')
      .or(`and(sender_id.eq.${senderProfileId},receiver_id.eq.${targetProfileId}),and(sender_id.eq.${targetProfileId},receiver_id.eq.${senderProfileId})`)
      .order('created_at', { ascending: true });
    if (error) throw new AppError(error.message, 500);

    // Asynchronously mark messages as read in background without delaying response
    Promise.resolve(
      db.from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('receiver_id', senderProfileId)
        .eq('sender_id', targetProfileId)
        .eq('is_read', false)
    ).catch(() => {});

    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(sendMessageSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { receiver_id, subject, body, connection_id } = req.body;
    if (!receiver_id || !body) throw new AppError('Receiver and message body are required', 400);

    // Fast profile resolution using RAM cache
    const senderProfileId = await getProfileIdForUser(req.user!.userId);
    if (!senderProfileId) throw new AppError('Profile not found', 404);

    const targetParam = sanitizeFilterInput(receiver_id);
    const finalReceiverId = await resolveReceiverProfileId(targetParam);

    const db = createUserScopedClient(req.token!);
    const { data, error } = await db
      .from('messages')
      .insert({
        sender_id: senderProfileId,
        receiver_id: finalReceiverId,
        subject: subject || null,
        body,
        connection_id: connection_id || null,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);

    // Mark user active without blocking
    markUserActive(req.user!.userId, senderProfileId).catch(() => {});

    res.status(201).json(data);
  } catch (err) { next(err); }
});


router.get('/unread/count', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { count, error } = await db
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', profile.id)
      .eq('is_read', false);
    if (error) throw new AppError(error.message, 500);
    res.json({ count: count || 0 });
  } catch (err) { next(err); }
});

export default router;
