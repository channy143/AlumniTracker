import { Router } from 'express';
import { supabase } from '../services/supabase';
import { formatProgramLongName } from '../utils/formatProgram';

const router = Router();

// Public aggregate stats for the marketing/landing page. Returns real counts
// derived from the database; fields with no data return 0 so the UI can show
// honest values instead of fabricated numbers.
router.get('/stats', async (_req, res, next) => {
  try {
    const [usersRes, profilesRes, employmentRes, educationRes, whitelistRes, connectionsRes, jobsRes] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'alumni'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, headline, employment_status'),
      supabase.from('employment').select('profile_id, employment_status, is_current'),
      supabase.from('education').select('profile_id, program, year_graduated'),
      supabase.from('graduate_whitelist').select('program'),
      supabase.from('connections').select('id').eq('status', 'accepted'),
      supabase
        .from('job_postings')
        .select('id, position, company_name, location, job_type, is_remote, is_alumni_exclusive, expires_at, salary_range, experience_level, created_at, vacancies_count, poster_url, posted_by')
        .order('created_at', { ascending: false }),
    ]);

    const alumniUsers = usersRes.data || [];
    const profiles = profilesRes.data || [];
    const employment = employmentRes.data || [];
    const programs = educationRes.data || [];
    const whitelistPrograms = whitelistRes.data || [];
    const matches = connectionsRes.data || [];

    const totalAlumni = profiles.length || alumniUsers.length;
    const profileIds = new Set(profiles.map((p: any) => p.id));
    const employedIds = new Set(
      employment
        .filter((e: any) => e.is_current && ['employed', 'self-employed', 'entrepreneur'].includes(e.employment_status))
        .map((e: any) => e.profile_id)
    );
    const unemployedIds = new Set(
      employment
        .filter((e: any) => e.is_current && String(e.employment_status || '').toLowerCase() === 'unemployed')
        .map((e: any) => e.profile_id)
    );
    profiles.forEach((p: any) => {
      const s = String(p.employment_status || '').toLowerCase();
      if (['employed', 'self-employed', 'entrepreneur'].includes(s)) employedIds.add(p.id);
      else if (s === 'unemployed') unemployedIds.add(p.id);
    });
    const employed = profileIds.size > 0
      ? [...employedIds].filter((id) => profileIds.has(id)).length
      : employedIds.size;
    const unemployedCount = profileIds.size > 0
      ? [...unemployedIds].filter((id) => profileIds.has(id) && !employedIds.has(id)).length
      : 0;
    const unreportedCount = Math.max(0, totalAlumni - employed - unemployedCount);
    const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;
    const trackedProgramSet = new Set([
      ...programs.map((p: any) => (p.program ? formatProgramLongName(String(p.program).trim()) : '')).filter(Boolean),
      ...whitelistPrograms.map((w: any) => (w.program ? formatProgramLongName(String(w.program).trim()) : '')).filter(Boolean),
    ]);
    const programsTracked = trackedProgramSet.size;
    const now = Date.now();
    const avatarByUserId = new Map<string, string>();
    profiles.forEach((p: any) => {
      if (p.user_id && p.avatar_url) avatarByUserId.set(String(p.user_id), p.avatar_url);
    });
    const eduByProfileId = new Map<string, { program?: string; year_graduated?: number }>();
    programs.forEach((e: any) => {
      if (e.profile_id && !eduByProfileId.has(String(e.profile_id))) {
        eduByProfileId.set(String(e.profile_id), { program: e.program, year_graduated: e.year_graduated });
      }
    });

    const featuredAlumni = profiles
      .filter((p: any) => p.first_name && p.avatar_url)
      .slice(0, 6)
      .map((p: any) => {
        const edu = eduByProfileId.get(String(p.id));
        const programPart = edu?.program || 'CTU-Naga Alumni';
        const yearPart = edu?.year_graduated ? ` '${String(edu.year_graduated).slice(-2)}` : '';
        const rolePart = p.headline ? ` · ${p.headline}` : '';
        return {
          id: String(p.id),
          name: `${p.first_name} ${p.last_name || ''}`.trim(),
          avatar_url: p.avatar_url as string,
          batch: `${programPart}${yearPart}${rolePart}`,
        };
      });

    const activeJobs = (jobsRes.data || []).filter((j: any) => !j.expires_at || new Date(j.expires_at).getTime() > now);
    const featuredJobs = activeJobs.slice(0, 3).map((j: any) => ({
      id: j.id,
      position: j.position,
      company_name: j.company_name,
      location: j.location,
      job_type: j.job_type,
      is_remote: Boolean(j.is_remote),
      is_alumni_exclusive: Boolean(j.is_alumni_exclusive),
      salary_range: j.salary_range || null,
      experience_level: j.experience_level || null,
      created_at: j.created_at || null,
      vacancies_count: j.vacancies_count || null,
      poster_url: j.poster_url || null,
      poster_avatar_url: j.posted_by ? avatarByUserId.get(String(j.posted_by)) || null : null,
    }));

    res.json({
      totalAlumni,
      employmentRate,
      employmentBreakdown: {
        employedCount: employed,
        unemployedCount,
        unreportedCount,
      },
      mentorshipMatches: matches.length || 0,
      programsTracked,
      activeJobsCount: activeJobs.length,
      featuredJobs,
      featuredAlumni,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
