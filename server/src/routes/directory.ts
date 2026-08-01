import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/stats', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    const adminUserIds = (adminUsers || []).map((u: any) => u.id);

    const { data: allProfiles } = await supabase.from('profiles').select('id, user_id, employment_status');
    const filtered = (allProfiles || []).filter((p: any) => !adminUserIds.includes(p.user_id));
    const totalAlumni = filtered.length;
    const employed = filtered.filter((p: any) => p.employment_status === 'Employed' || p.employment_status === 'Self-employed').length;
    const employmentRate = totalAlumni > 0 ? Math.round((employed / totalAlumni) * 100) : 0;

    const { data: education } = await supabase.from('education').select('program');
    const programs = [...new Set((education || []).map((e: any) => e.program).filter(Boolean))].length;

    res.json({ totalAlumni, currentlyEmployed: employed, employmentRate, programs });
  } catch (err) { next(err); }
});

router.get('/search', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;
    const program = (req.query.program as string) || '';
    const batch = (req.query.batch as string) || '';
    const employmentStatus = (req.query.employment_status as string) || '';
    const industry = (req.query.industry as string) || '';
    const company = (req.query.company as string) || '';
    const location = (req.query.location as string) || '';
    const sort = (req.query.sort as string) || 'name';

    // Get admin user ids to exclude from directory
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    const adminUserIds = (adminUsers || []).map((u: any) => u.id);

    // Get current user's profile id to exclude
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    // Pre-filter by education (program / batch) if needed
    let educationFilterIds: string[] | null = null;
    if (program || batch) {
      let eduQuery = supabase.from('education').select('profile_id');
      if (program) {
        const PROGRAM_MAP: Record<string, string[]> = {
          'BSIT': ['BSIT', 'BS Information Technology', 'Bachelor of Science in Information Technology'],
          'BEEd': ['BEEd', 'Bachelor of Elementary Education'],
          'BSEd-Math': ['BSEd-Math', 'BSEd Math', 'Bachelor of Secondary Education'],
          'BTLED-HE': ['BTLED-HE', 'BTLED HE', 'Bachelor of Technology and Livelihood Education'],
          'BTLED-ICT': ['BTLED-ICT', 'BTLED ICT', 'Bachelor of Technology and Livelihood Education'],
          'BIT': ['BIT', 'Bachelor of Industrial Technology'],
        };
        const programs = program.split(',').map(s => s.trim()).filter(Boolean);
        const allVariants = programs.flatMap(p => PROGRAM_MAP[p] || [p]);
        eduQuery = eduQuery.in('program', allVariants);
      }
      if (batch) {
        const batches = batch.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (batches.length === 1) {
          eduQuery = eduQuery.eq('year_graduated', batches[0]);
        } else if (batches.length > 1) {
          eduQuery = eduQuery.in('year_graduated', batches);
        }
      }
      const { data } = await eduQuery;
      educationFilterIds = [...new Set((data || []).map((e: any) => e.profile_id))];
    }

    // Pre-filter by employment (company) if needed
    let employmentFilterIds: string[] | null = null;
    if (company) {
      let empQuery = supabase.from('employment').select('profile_id')
        .eq('is_current', true)
        .ilike('company_name', `%${company}%`);
      const { data } = await empQuery;
      employmentFilterIds = [...new Set((data || []).map((e: any) => e.profile_id))];
    }

    let profileQuery = supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, middle_name, avatar_url, headline, bio, linkedin_url, github_url, portfolio_url, city, province, industry, employment_status', { count: 'exact' });

    if (currentProfile) {
      profileQuery = profileQuery.neq('id', currentProfile.id);
    }

    if (q) {
      const sanitized = q.replace(/[*%_]/g, '');
      profileQuery = profileQuery.or(
        `first_name.ilike.${sanitized}%,last_name.ilike.${sanitized}%,headline.ilike.%${sanitized}%`
      );
    }

    if (employmentStatus) {
      profileQuery = profileQuery.eq('employment_status', employmentStatus);
    }

    if (industry) {
      profileQuery = profileQuery.eq('industry', industry);
    }

    if (location) {
      profileQuery = profileQuery.or(
        `city.ilike.%${location}%,province.ilike.%${location}%`
      );
    }

    if (educationFilterIds) {
      profileQuery = profileQuery.in('id', educationFilterIds);
    }

    if (employmentFilterIds) {
      profileQuery = profileQuery.in('id', employmentFilterIds);
    }

    // Sort
    if (sort === 'name') {
      profileQuery = profileQuery.order('first_name', { ascending: true });
    } else if (sort === 'name_desc') {
      profileQuery = profileQuery.order('first_name', { ascending: false });
    }

    const { data: results, count, error } = await profileQuery.range(offset, offset + limit - 1);

    if (error) {
      console.error('[Directory Search] Supabase error:', error);
      throw new AppError(error.message, 500);
    }

    const filteredProfiles = adminUserIds.length > 0
      ? (results || []).filter((p: any) => !adminUserIds.includes(p.user_id))
      : (results || []);
    const adminInPage = (results || []).length - filteredProfiles.length;
    const total = (count || 0) - adminInPage;
    const profiles = filteredProfiles;

    console.log(`[Directory Search] query="${q}" returned ${profiles.length} profiles (total: ${total})`);

    const profileIds = profiles.map((p: any) => p.id) || [];
    let employmentMap = new Map();
    let educationMap = new Map();

    if (profileIds.length > 0) {
      const [{ data: employment }, { data: education }] = await Promise.all([
        supabase.from('employment').select('profile_id, company_name, position, employment_status, is_current')
          .in('profile_id', profileIds).eq('is_current', true),
        supabase.from('education').select('profile_id, program, year_graduated, honors')
          .in('profile_id', profileIds),
      ]);

      (employment || []).forEach((e: any) => {
        employmentMap.set(e.profile_id, e);
      });
      (education || []).forEach((e: any) => {
        if (!educationMap.has(e.profile_id)) educationMap.set(e.profile_id, e);
      });
    }

    const result = profiles.map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      first_name: p.first_name,
      last_name: p.last_name,
      middle_name: p.middle_name,
      avatar_url: p.avatar_url,
      headline: p.headline,
      bio: p.bio,
      linkedin_url: p.linkedin_url,
      github_url: p.github_url,
      portfolio_url: p.portfolio_url,
      available_for_referral: p.available_for_referral ?? false,
      available_for_mentoring: p.available_for_mentoring ?? false,
      current_employment: employmentMap.get(p.id) || null,
      education: educationMap.get(p.id) || null,
      is_admin: adminUserIds.includes(p.user_id),
      location: [p.city, p.province].filter(Boolean).join(', ') || null,
      industry: p.industry || null,
    }));

    res.json({ data: result, total, page, limit });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');
    const adminUserIds = (adminUsers || []).map((u: any) => u.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, employment(*), education(*), skills(*), certifications(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !profile) throw new AppError('Profile not found', 404);

    const [achievementsRes, feedbackRes] = await Promise.all([
      supabase.from('achievements').select('*').eq('profile_id', req.params.id).order('date_achieved', { ascending: false }),
      supabase.from('career_feedback').select('*').eq('profile_id', req.params.id).maybeSingle(),
    ]);

    const privacy = (typeof profile.privacy_settings === 'string'
      ? JSON.parse(profile.privacy_settings)
      : profile.privacy_settings) || {};

    const employment = (profile.employment || []).sort((a: any, b: any) => {
      if (a.is_current) return -1;
      if (b.is_current) return 1;
      return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
    });

    const result: any = {
      id: profile.id,
      user_id: profile.user_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      middle_name: profile.middle_name,
      avatar_url: profile.avatar_url,
      headline: profile.headline,
      bio: profile.bio,
      city: profile.city,
      province: profile.province,
      industry: profile.industry,
      employment_status: profile.employment_status,
      linkedin_url: profile.linkedin_url,
      github_url: profile.github_url,
      portfolio_url: profile.portfolio_url,
      behance_url: profile.behance_url,
      google_scholar_url: profile.google_scholar_url,
      personal_website_url: profile.personal_website_url,
      available_for_referral: profile.available_for_referral ?? false,
      available_for_mentoring: profile.available_for_mentoring ?? false,
      is_admin: adminUserIds.includes(profile.user_id),
      education: profile.education || [],
      skills: profile.skills || [],
      certifications: profile.certifications || [],
      employment,
      achievements: achievementsRes.data || [],
      career_feedback: feedbackRes.data || null,
    };

    if (privacy.show_email) result.email = profile.email;
    if (privacy.show_phone) result.phone = profile.phone;
    if (privacy.show_address) {
      result.address = profile.address;
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (currentProfile) {
      const { data: connectionStatus } = await supabase
        .from('connections')
        .select('id, status')
        .or(`and(requester_id.eq.${currentProfile.id},recipient_id.eq.${req.params.id}),and(requester_id.eq.${req.params.id},recipient_id.eq.${currentProfile.id})`)
        .maybeSingle();
      result.connection_status = connectionStatus?.status || null;
      result.connection_id = connectionStatus?.id || null;
    }

    res.json(result);
  } catch (err) { next(err); }
});

export default router;
