import { Router } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

// Public aggregate stats for the marketing/landing page. Returns real counts
// derived from the database; fields with no data return 0 so the UI can show
// honest values instead of fabricated numbers.
router.get('/stats', async (_req, res, next) => {
  try {
    const [usersRes, profilesRes, employmentRes, educationRes, connectionsRes] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'alumni'),
      supabase.from('profiles').select('id, employment_status'),
      supabase.from('employment').select('profile_id, employment_status, is_current'),
      supabase.from('education').select('program'),
      supabase.from('connections').select('id').eq('status', 'accepted'),
    ]);

    const alumniUsers = usersRes.data || [];
    const profiles = profilesRes.data || [];
    const employment = employmentRes.data || [];
    const programs = educationRes.data || [];
    const matches = connectionsRes.data || [];

    const totalAlumni = profiles.length || alumniUsers.length;
    const profileIds = new Set(profiles.map((p: any) => p.id));
    const employedIds = new Set(
      employment
        .filter((e: any) => e.is_current && ['employed', 'self-employed', 'entrepreneur'].includes(e.employment_status))
        .map((e: any) => e.profile_id)
    );
    profiles.forEach((p: any) => {
      const s = String(p.employment_status || '').toLowerCase();
      if (['employed', 'self-employed', 'entrepreneur'].includes(s)) employedIds.add(p.id);
    });
    const employed = profileIds.size > 0
      ? [...employedIds].filter((id) => profileIds.has(id)).length
      : employedIds.size;
    const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;
    const programsTracked = new Set(programs.map((p: any) => p.program).filter(Boolean)).size;

    res.json({
      totalAlumni,
      employmentRate,
      mentorshipMatches: matches.length || 0,
      programsTracked,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
