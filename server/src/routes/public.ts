import { Router } from 'express';
import { supabase } from '../services/supabase';
import { formatProgramLongName } from '../utils/formatProgram';
import {
  getFeaturedPesoFacebookJobs,
  getAllPesoFacebookJobs,
  PESO_FB_PAGE_URL,
} from '../services/pesoFacebookService';

const router = Router();

// Public aggregate stats for the marketing/landing page. Returns real counts
// derived from the database; fields with no data return 0 so the UI can show
// honest values instead of fabricated numbers.
router.get('/stats', async (_req, res, next) => {
  try {
    const [usersRes, profilesRes, employmentRes, educationRes, whitelistRes, connectionsRes, jobsRes] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'alumni'),
      supabase.from('profiles').select('id, user_id, first_name, last_name, avatar_url, headline, employment_status'),
      supabase.from('employment').select('profile_id, record_category, job_type, company_name, position, employment_status, is_current, end_date'),
      supabase.from('education').select('profile_id, program, year_graduated'),
      supabase.from('graduate_whitelist').select('program'),
      supabase.from('connections').select('id').eq('status', 'accepted'),
      supabase
        .from('job_postings')
        .select('id, position, company_name, description, requirements, industry, required_skills, location, job_type, is_remote, is_alumni_exclusive, expires_at, salary_range, experience_level, created_at, vacancies_count, poster_url, posted_by')
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
    const isOjtOrPlaceholder = (e: any) => {
      const cat = String(e?.record_category || '').toLowerCase();
      const jt = String(e?.job_type || '').toLowerCase();
      const st = String(e?.employment_status || '').toLowerCase();
      const comp = String(e?.company_name || '').trim().toLowerCase();
      const pos = String(e?.position || '').trim().toLowerCase();
      if (cat === 'ojt' || jt === 'internship' || st === 'ojt') return true;
      if (comp.length < 2 || pos.length < 2 || ['organization', 'company', 'n/a', 'na', 'none', 'null'].includes(comp) || ['position', 'current position', 'n/a', 'na', 'none', 'null'].includes(pos)) {
        return true;
      }
      return false;
    };
    const regularCurrentEmp = employment.filter(
      (e: any) => (e.is_current || !e.end_date) && !isOjtOrPlaceholder(e)
    );
    const employedIds = new Set(
      regularCurrentEmp
        .filter((e: any) => ['employed', 'self-employed', 'entrepreneur'].includes(String(e.employment_status || '').toLowerCase()))
        .map((e: any) => e.profile_id)
    );
    const unemployedIds = new Set(
      regularCurrentEmp
        .filter((e: any) => String(e.employment_status || '').toLowerCase() === 'unemployed')
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

    const toShortProgram = (raw?: string): string => {
      if (!raw) return 'CTU-Naga Alumni';
      const lower = raw.toLowerCase();
      if (lower.includes('information technology')) return 'BSIT';
      if (lower.includes('industrial technology')) return 'BIT';
      if (lower.includes('elementary education')) return 'BEEd';
      if (lower.includes('secondary education')) return 'BSEd';
      if (lower.includes('technology and livelihood')) return 'BTLED';
      if (lower.includes('computer science')) return 'BSCS';
      return raw.trim();
    };

    const isChristianSalinas = (p: any) =>
      /christian/i.test(String(p.first_name || '')) && /salinas/i.test(String(p.last_name || ''));
    const isAshlieManacap = (p: any) =>
      /ashlie/i.test(String(p.first_name || '')) && /ma[nñ]acap/i.test(String(p.last_name || ''));

    const eligibleFeatured = profiles.filter(
      (p: any) => p.first_name && p.avatar_url && !isAshlieManacap(p)
    );
    const prioritizedFeatured = [
      ...eligibleFeatured.filter(isChristianSalinas),
      ...eligibleFeatured.filter((p: any) => !isChristianSalinas(p)),
    ];

    const featuredAlumni = prioritizedFeatured
      .slice(0, 6)
      .map((p: any) => {
        const edu = eduByProfileId.get(String(p.id));
        const programPart = toShortProgram(edu?.program);
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
    const featuredJobs = await getFeaturedPesoFacebookJobs();
    const allPesoJobs = await getAllPesoFacebookJobs();

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
      activeJobsCount: allPesoJobs.length + activeJobs.length,
      featuredJobs,
      featuredAlumni,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
