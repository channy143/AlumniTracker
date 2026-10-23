import { Router } from 'express';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sanitizeFilterInput } from '../utils/sanitizeFilterInput';
import { sendMessageSchema } from '../middleware/validationSchemas';

const router = Router();

// In-memory presence map: key = profileId or userId, value = timestamp (ms)
export const userPresenceMap = new Map<string, number>();

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
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const userId = req.user!.userId;

    userPresenceMap.set(userId, nowMs);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile?.id) {
      userPresenceMap.set(profile.id, nowMs);
      await supabase
        .from('profiles')
        .update({ last_active_at: nowIso })
        .eq('id', profile.id);
    }

    await supabase
      .from('users')
      .update({ last_active_at: nowIso })
      .eq('id', userId);

    res.json({ success: true, last_active_at: nowIso });
  } catch (err) { next(err); }
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

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

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
      const memTs =
        userPresenceMap.get(id) ||
        (p?.id ? userPresenceMap.get(p.id) : 0) ||
        (p?.user_id ? userPresenceMap.get(p.user_id) : 0) ||
        0;
      const dbTs = p?.last_active_at ? new Date(p.last_active_at).getTime() : 0;
      const effectiveTs = Math.max(memTs, dbTs);

      const isOnline = effectiveTs > 0 && now - effectiveTs < ONLINE_THRESHOLD_MS;
      const lastActiveAt = effectiveTs > 0 ? new Date(effectiveTs).toISOString() : (p?.last_active_at || null);

      result[id] = {
        is_online: isOnline,
        last_active_at: lastActiveAt,
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

    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;

    conversationMap.forEach((conv, id) => {
      conv.unread = unreadCounts[id] || 0;
      const memActive = userPresenceMap.get(id) || 0;
      const dbActive = conv.last_active_at ? new Date(conv.last_active_at).getTime() : 0;
      const effectiveTs = Math.max(memActive, dbActive);
      conv.is_online = effectiveTs > 0 && now - effectiveTs < ONLINE_THRESHOLD_MS;
      if (effectiveTs > 0) {
        conv.last_active_at = new Date(effectiveTs).toISOString();
      }
    });

    res.json(Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
  } catch (err) { next(err); }
});

router.get('/:profileId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const targetParam = sanitizeFilterInput(req.params.profileId);
    // Resolve target profile id (whether passed profile.id or profile.user_id)
    const { data: targetProfile } = await db
      .from('profiles')
      .select('id')
      .or(`id.eq.${targetParam},user_id.eq.${targetParam}`)
      .maybeSingle();

    const targetProfileId = targetProfile ? targetProfile.id : targetParam;

    const { data, error } = await db
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url)')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${targetProfileId}),and(sender_id.eq.${targetProfileId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    if (error) throw new AppError(error.message, 500);

    await db
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('receiver_id', profile.id)
      .eq('sender_id', targetProfileId)
      .eq('is_read', false);

    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/', authenticate, validate(sendMessageSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { receiver_id, subject, body, connection_id } = req.body;
    if (!receiver_id || !body) throw new AppError('Receiver and message body are required', 400);

    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const targetParam = sanitizeFilterInput(receiver_id);
    const { data: targetProfile } = await db
      .from('profiles')
      .select('id')
      .or(`id.eq.${targetParam},user_id.eq.${targetParam}`)
      .maybeSingle();

    const finalReceiverId = targetProfile ? targetProfile.id : targetParam;

    const { data, error } = await db
      .from('messages')
      .insert({
        sender_id: profile.id,
        receiver_id: finalReceiverId,
        subject: subject || null,
        body,
        connection_id: connection_id || null,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
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
