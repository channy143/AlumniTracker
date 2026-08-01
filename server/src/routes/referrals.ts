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
      .from('referral_requests')
      .select('*, requester:profiles!referral_requests_requester_id_fkey(id, first_name, last_name, avatar_url, headline), recipient:profiles!referral_requests_recipient_id_fkey(id, first_name, last_name, avatar_url, headline), job:job_postings(id, position, company_name)')
      .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  } catch (err) { next(err); }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { recipient_id, job_id, company_id, position_title, company_name, message } = req.body;
    if (!recipient_id) throw new AppError('Recipient is required', 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);
    if (profile.id === recipient_id) throw new AppError('Cannot request referral from yourself', 400);

    const { data, error } = await supabase
      .from('referral_requests')
      .insert({
        requester_id: profile.id,
        recipient_id,
        job_id: job_id || null,
        company_id: company_id || null,
        position_title: position_title || null,
        company_name: company_name || null,
        message: message || null,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/:id/respond', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['accepted', 'declined', 'completed'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: referral } = await supabase
      .from('referral_requests')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (!referral) throw new AppError('Referral request not found', 404);
    if (referral.recipient_id !== profile.id) throw new AppError('Not authorized', 403);

    const { error } = await supabase
      .from('referral_requests')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: `Referral ${status}` });
  } catch (err) { next(err); }
});

router.get('/count', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { count, error } = await supabase
      .from('referral_requests')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', profile.id)
      .eq('status', 'pending');
    if (error) throw new AppError(error.message, 500);
    res.json({ count: count || 0 });
  } catch (err) { next(err); }
});

export default router;
