import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  } catch (err) { next(err); }
});

router.get('/conversations', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: sent } = await supabase
      .from('messages')
      .select(`
        receiver_id,
        receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url),
        body, created_at, is_read
      `)
      .eq('sender_id', profile.id)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('messages')
      .select(`
        sender_id,
        sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url),
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
    });

    res.json(Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    ));
  } catch (err) { next(err); }
});

router.get('/:profileId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, first_name, last_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(id, first_name, last_name, avatar_url)')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${req.params.profileId}),and(sender_id.eq.${req.params.profileId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    if (error) throw new AppError(error.message, 500);

    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('receiver_id', profile.id)
      .eq('sender_id', req.params.profileId)
      .eq('is_read', false);

    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { receiver_id, subject, body, connection_id } = req.body;
    if (!receiver_id || !body) throw new AppError('Receiver and message body are required', 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: profile.id,
        receiver_id,
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', profile.id)
      .eq('is_read', false);
    if (error) throw new AppError(error.message, 500);
    res.json({ count: count || 0 });
  } catch (err) { next(err); }
});

export default router;
