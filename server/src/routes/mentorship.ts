import { Router } from 'express';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { mentorshipApplySchema, mentorshipUpdateSchema } from '../middleware/validationSchemas';

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

    const { data: mentorships, error } = await db
      .from('mentorships')
      .select('*, mentor:profiles!mentor_id(*), mentee:profiles!mentee_id(*)')
      .or(`mentor_id.eq.${profile.id},mentee_id.eq.${profile.id}`);

    if (error) throw new AppError(error.message, 500);

    res.json(mentorships);
  } catch (err) {
    next(err);
  }
});

router.post('/apply', authenticate, validate(mentorshipApplySchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: mentorship, error } = await db
      .from('mentorships')
      .insert({
        mentee_id: profile.id,
        mentor_id: req.body.mentor_id,
        goals: req.body.goals,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.status(201).json(mentorship);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, validate(mentorshipUpdateSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: mentorship, error } = await db
      .from('mentorships')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(mentorship);
  } catch (err) {
    next(err);
  }
});

router.get('/discover', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, user_id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Get profiles that are available for mentoring, excluding current user
    const { data: mentors, error } = await db
      .from('profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        headline,
        bio,
        avatar_url,
        employment!employment_profile_id (
          id,
          company_name,
          position,
          company_industry,
          is_current
        ),
        skills (
          name,
          category
        )
      `)
      .eq('available_for_mentoring', true)
      .neq('user_id', profile.user_id);

    if (error) throw new AppError(error.message, 500);

    // For each mentor, count active mentees
    const mentorIds = mentors?.map(m => m.id) || [];
    let menteeCounts: Record<string, number> = {};
    
    if (mentorIds.length > 0) {
      const { data: counts } = await db
        .from('mentorships')
        .select('mentor_id')
        .in('mentor_id', mentorIds)
        .eq('status', 'active');
      
      menteeCounts = (counts || []).reduce((acc: any, m: any) => {
        acc[m.mentor_id] = (acc[m.mentor_id] || 0) + 1;
        return acc;
      }, {});
    }

    // Transform to mentor cards format
    const mentorCards = (mentors || []).map((m: any) => {
      const currentJob = m.employment?.find((e: any) => e.is_current) || m.employment?.[0];
      const skills = (m.skills || []).map((s: any) => s.name);
      
      return {
        id: m.id,
        mentor_profile: {
          first_name: m.first_name,
          last_name: m.last_name,
          headline: m.headline,
          bio: m.bio,
          avatar_url: m.avatar_url,
          current_position: currentJob?.position,
          company_name: currentJob?.company_name,
          company_industry: currentJob?.company_industry,
        },
        expertise: skills.slice(0, 5),
        mentee_count: menteeCounts[m.id] || 0,
      };
    });

    res.json(mentorCards);
  } catch (err) {
    next(err);
  }
});

export default router;
