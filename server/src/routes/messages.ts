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

// ==========================================
// GROUP CHAT ENDPOINTS (MUST BE BEFORE /:profileId)
// ==========================================

// GET /api/messages/groups - list groups for current user
router.get('/groups', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const profileId = await getProfileIdForUser(req.user!.userId);
    if (!profileId) throw new AppError('Profile not found', 404);

    const { data: memberships, error: memErr } = await supabase
      .from('chat_group_members')
      .select('group_id, role, joined_at')
      .eq('profile_id', profileId);

    if (memErr) throw new AppError(memErr.message, 500);
    if (!memberships || memberships.length === 0) {
      return res.json([]);
    }

    const groupIds = memberships.map((m: any) => m.group_id);
    const myRoleMap = new Map<string, string>();
    memberships.forEach((m: any) => myRoleMap.set(m.group_id, m.role || 'member'));

    const { data: groups, error: grpErr } = await supabase
      .from('chat_groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });

    if (grpErr) throw new AppError(grpErr.message, 500);

    const { data: allMembers, error: allMemErr } = await supabase
      .from('chat_group_members')
      .select(`
        id, group_id, profile_id, role, joined_at,
        profile:profiles(id, first_name, last_name, avatar_url)
      `)
      .in('group_id', groupIds);

    if (allMemErr) throw new AppError(allMemErr.message, 500);

    const { data: latestMessages } = await supabase
      .from('chat_group_messages')
      .select('group_id, body, created_at, sender_id')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map<string, any>();
    (latestMessages || []).forEach((m: any) => {
      if (!lastMsgMap.has(m.group_id)) {
        lastMsgMap.set(m.group_id, m);
      }
    });

    const membersByGroup = new Map<string, any[]>();
    (allMembers || []).forEach((m: any) => {
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id)!.push({
        id: m.id,
        profile_id: m.profile_id,
        role: m.role || 'member',
        joined_at: m.joined_at,
        first_name: m.profile?.first_name || '',
        last_name: m.profile?.last_name || '',
        avatar_url: m.profile?.avatar_url || null,
        name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Alumnus',
      });
    });

    const result = (groups || []).map((g: any) => {
      const gMembers = membersByGroup.get(g.id) || [];
      const lastMsg = lastMsgMap.get(g.id);
      const myRole = myRoleMap.get(g.id) || 'member';

      return {
        id: g.id,
        profileId: g.id,
        name: g.name,
        description: g.description,
        avatar: g.avatar_url,
        creator_id: g.creator_id,
        admin_id: g.admin_id,
        isAdmin: myRole === 'admin' || g.admin_id === profileId,
        myRole,
        isGroup: true,
        members: gMembers,
        lastMessage: lastMsg?.body || null,
        lastMessageAt: lastMsg?.created_at || g.updated_at || g.created_at,
        unread: 0,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/messages/groups - create a new group chat
router.post('/groups', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name, description, member_ids } = req.body;
    if (!name || !name.trim()) {
      throw new AppError('Group name is required', 400);
    }

    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: newGroup, error: grpErr } = await supabase
      .from('chat_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        creator_id: myProfileId,
        admin_id: myProfileId,
      })
      .select()
      .single();

    if (grpErr || !newGroup) throw new AppError(grpErr?.message || 'Failed to create group', 500);

    const membersToInsert: any[] = [
      {
        group_id: newGroup.id,
        profile_id: myProfileId,
        role: 'admin',
      },
    ];

    if (Array.isArray(member_ids)) {
      member_ids.forEach((mid: string) => {
        if (mid && mid !== myProfileId && !membersToInsert.some((m) => m.profile_id === mid)) {
          membersToInsert.push({
            group_id: newGroup.id,
            profile_id: mid,
            role: 'member',
          });
        }
      });
    }

    const { error: memErr } = await supabase
      .from('chat_group_members')
      .insert(membersToInsert);

    if (memErr) throw new AppError(memErr.message, 500);

    const { data: groupMembers } = await supabase
      .from('chat_group_members')
      .select(`
        id, group_id, profile_id, role, joined_at,
        profile:profiles(id, first_name, last_name, avatar_url)
      `)
      .eq('group_id', newGroup.id);

    const formattedMembers = (groupMembers || []).map((m: any) => ({
      id: m.id,
      profile_id: m.profile_id,
      role: m.role,
      joined_at: m.joined_at,
      name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Alumnus',
      avatar: m.profile?.avatar_url,
    }));

    res.status(201).json({
      id: newGroup.id,
      profileId: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      creator_id: newGroup.creator_id,
      admin_id: newGroup.admin_id,
      isAdmin: true,
      myRole: 'admin',
      isGroup: true,
      members: formattedMembers,
      lastMessage: null,
      lastMessageAt: newGroup.created_at,
      unread: 0,
    });
  } catch (err) { next(err); }
});

// GET /api/messages/groups/:groupId/messages - get messages of a group
router.get('/groups/:groupId/messages', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groupId = req.params.groupId;
    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: member } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId)
      .maybeSingle();

    if (!member) {
      throw new AppError('You are not a member of this group chat', 403);
    }

    const { data: messages, error } = await supabase
      .from('chat_group_messages')
      .select(`
        id, group_id, sender_id, body, created_at,
        sender:profiles(id, first_name, last_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw new AppError(error.message, 500);

    const formatted = (messages || []).map((m: any) => {
      const senderObj: any = Array.isArray(m.sender) ? m.sender[0] : m.sender;
      return {
        id: m.id,
        group_id: m.group_id,
        sender_id: m.sender_id,
        receiver_id: m.group_id,
        body: m.body,
        created_at: m.created_at,
        sender_name: `${senderObj?.first_name || ''} ${senderObj?.last_name || ''}`.trim() || 'Alumnus',
        sender_avatar: senderObj?.avatar_url || null,
      };
    });

    res.json(formatted);
  } catch (err) { next(err); }
});

// POST /api/messages/groups/:groupId/messages - send message in group
router.post('/groups/:groupId/messages', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groupId = req.params.groupId;
    const { body } = req.body;
    if (!body || !body.trim()) {
      throw new AppError('Message body is required', 400);
    }

    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: member } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId)
      .maybeSingle();

    if (!member) {
      throw new AppError('You are not a member of this group chat', 403);
    }

    const { data: msg, error } = await supabase
      .from('chat_group_messages')
      .insert({
        group_id: groupId,
        sender_id: myProfileId,
        body: body.trim(),
      })
      .select(`
        id, group_id, sender_id, body, created_at,
        sender:profiles(id, first_name, last_name, avatar_url)
      `)
      .single();

    if (error || !msg) throw new AppError(error?.message || 'Failed to send message', 500);

    await supabase
      .from('chat_groups')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', groupId);

    markUserActive(req.user!.userId, myProfileId).catch(() => {});

    const senderObj: any = Array.isArray((msg as any).sender) ? (msg as any).sender[0] : (msg as any).sender;
    res.status(201).json({
      id: msg.id,
      group_id: msg.group_id,
      sender_id: msg.sender_id,
      receiver_id: msg.group_id,
      body: msg.body,
      created_at: msg.created_at,
      sender_name: `${senderObj?.first_name || ''} ${senderObj?.last_name || ''}`.trim() || 'Alumnus',
      sender_avatar: senderObj?.avatar_url || null,
    });
  } catch (err) { next(err); }
});

// POST /api/messages/groups/:groupId/members - add members (any member can add)
router.post('/groups/:groupId/members', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groupId = req.params.groupId;
    const { profile_id, member_ids } = req.body;
    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: callerMember } = await supabase
      .from('chat_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId)
      .maybeSingle();

    if (!callerMember) {
      throw new AppError('You must be a member of the group to add alumni', 403);
    }

    const toAdd: string[] = [];
    if (profile_id) toAdd.push(profile_id);
    if (Array.isArray(member_ids)) toAdd.push(...member_ids);

    const uniqueToAdd = Array.from(new Set(toAdd)).filter(Boolean);
    if (uniqueToAdd.length === 0) {
      throw new AppError('At least one alumni profile ID is required', 400);
    }

    const { data: existing } = await supabase
      .from('chat_group_members')
      .select('profile_id')
      .eq('group_id', groupId);

    const existingSet = new Set((existing || []).map((e: any) => e.profile_id));
    const newMembers = uniqueToAdd.filter((pid) => !existingSet.has(pid));

    if (newMembers.length > 0) {
      const inserts = newMembers.map((pid) => ({
        group_id: groupId,
        profile_id: pid,
        role: 'member',
      }));

      const { error: insertErr } = await supabase
        .from('chat_group_members')
        .insert(inserts);

      if (insertErr) throw new AppError(insertErr.message, 500);
    }

    const { data: updatedMembers } = await supabase
      .from('chat_group_members')
      .select(`
        id, group_id, profile_id, role, joined_at,
        profile:profiles(id, first_name, last_name, avatar_url)
      `)
      .eq('group_id', groupId);

    const formatted = (updatedMembers || []).map((m: any) => ({
      id: m.id,
      profile_id: m.profile_id,
      role: m.role,
      joined_at: m.joined_at,
      name: `${m.profile?.first_name || ''} ${m.profile?.last_name || ''}`.trim() || 'Alumnus',
      avatar: m.profile?.avatar_url,
    }));

    res.json({ success: true, members: formatted });
  } catch (err) { next(err); }
});

// DELETE /api/messages/groups/:groupId/members/:profileId - remove member (ADMIN ONLY)
router.delete('/groups/:groupId/members/:profileId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { groupId, profileId: targetProfileId } = req.params;
    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: callerMember } = await supabase
      .from('chat_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId)
      .maybeSingle();

    const { data: group } = await supabase
      .from('chat_groups')
      .select('admin_id')
      .eq('id', groupId)
      .maybeSingle();

    const isGroupAdmin = callerMember?.role === 'admin' || group?.admin_id === myProfileId;
    if (!isGroupAdmin) {
      throw new AppError('Only the group admin can remove alumni from this group chat.', 403);
    }

    if (targetProfileId === myProfileId) {
      throw new AppError('Admins cannot remove themselves using this action. Use leave group instead.', 400);
    }

    const { error } = await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', targetProfileId);

    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, message: 'Member removed from group chat' });
  } catch (err) { next(err); }
});

// POST /api/messages/groups/:groupId/leave - leave group at free will
router.post('/groups/:groupId/leave', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const groupId = req.params.groupId;
    const myProfileId = await getProfileIdForUser(req.user!.userId);
    if (!myProfileId) throw new AppError('Profile not found', 404);

    const { data: membership } = await supabase
      .from('chat_group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId)
      .maybeSingle();

    if (!membership) {
      throw new AppError('You are not a member of this group chat', 400);
    }

    await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('profile_id', myProfileId);

    const { data: remainingMembers } = await supabase
      .from('chat_group_members')
      .select('id, profile_id, role, joined_at')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (!remainingMembers || remainingMembers.length === 0) {
      await supabase.from('chat_groups').delete().eq('id', groupId);
    } else if (membership.role === 'admin') {
      const nextAdmin = remainingMembers[0];
      await supabase
        .from('chat_groups')
        .update({ admin_id: nextAdmin.profile_id })
        .eq('id', groupId);

      await supabase
        .from('chat_group_members')
        .update({ role: 'admin' })
        .eq('id', nextAdmin.id);
    }

    res.json({ success: true, message: 'Successfully left the group chat' });
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
