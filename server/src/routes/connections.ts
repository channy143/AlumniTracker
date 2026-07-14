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

    const status = (req.query.status as string) || '';
    let query = supabase
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

router.post('/request', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { recipient_id, message } = req.body;
    if (!recipient_id) throw new AppError('Recipient is required', 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);
    if (profile.id === recipient_id) throw new AppError('Cannot connect with yourself', 400);

    const { data, error } = await supabase
      .from('connections')
      .insert({ requester_id: profile.id, recipient_id, message: message || null })
      .select()
      .single();
    if (error && error.code === '23505') throw new AppError('Connection request already exists', 400);
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/:id/respond', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['accepted', 'declined'].includes(status)) throw new AppError('Invalid status', 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!connection) throw new AppError('Connection not found', 404);
    if (connection.recipient_id !== profile.id) throw new AppError('Not authorized', 403);

    const { error } = await supabase
      .from('connections')
      .update({ status, connected_at: status === 'accepted' ? new Date().toISOString() : null })
      .eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: `Connection ${status}` });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: connection } = await supabase
      .from('connections')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!connection) throw new AppError('Connection not found', 404);
    if (connection.requester_id !== profile.id && connection.recipient_id !== profile.id) {
      throw new AppError('Not authorized', 403);
    }
    await supabase.from('connections').delete().eq('id', req.params.id);
    res.json({ message: 'Connection removed' });
  } catch (err) { next(err); }
});

router.get('/suggestions', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: existing } = await supabase
      .from('connections')
      .select('requester_id, recipient_id')
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
    const connectedIds = new Set<string>();
    existing?.forEach((c: any) => {
      connectedIds.add(c.requester_id);
      connectedIds.add(c.recipient_id);
    });
    connectedIds.add(profile.id);

    const { data: suggestions } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, headline')
      .not('id', 'in', `(${[...connectedIds].join(',')})`)
      .limit(10);
    res.json(suggestions || []);
  } catch (err) { next(err); }
});

export default router;
