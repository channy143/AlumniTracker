import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/alumni-at-company/:companyId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: employment } = await supabase
      .from('employment')
      .select('profile_id, position, start_date, company_name, employment_status')
      .eq('company_name', req.params.companyId)
      .eq('is_current', true);

    if (!employment || employment.length === 0) {
      return res.json([]);
    }

    const profileIds = employment.map((e: any) => e.profile_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, headline, bio, privacy_settings, available_for_referral, available_for_mentoring')
      .in('id', profileIds);

    const { data: education } = await supabase
      .from('education')
      .select('profile_id, program, year_graduated')
      .in('profile_id', profileIds);

    const { data: skills } = await supabase
      .from('skills')
      .select('profile_id, name')
      .in('profile_id', profileIds);

    const eduMap = new Map<string, any[]>();
    education?.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push(e);
    });

    const skillsMap = new Map<string, string[]>();
    skills?.forEach((s: any) => {
      if (!skillsMap.has(s.profile_id)) skillsMap.set(s.profile_id, []);
      skillsMap.get(s.profile_id)!.push(s.name);
    });

    const empMap = new Map<string, any>();
    employment?.forEach((e: any) => {
      if (!empMap.has(e.profile_id)) empMap.set(e.profile_id, e);
    });

    const result = (profiles || []).map((p: any) => {
      const privacy = p.privacy_settings || {};
      const emp = empMap.get(p.id);
      const hide = !privacy.show_employment;
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        headline: hide ? null : p.headline,
        bio: hide ? null : p.bio,
        current_position: hide ? null : emp?.position,
        company_name: hide ? null : emp?.company_name,
        years_at_company: hide ? null : emp?.start_date ? Math.floor((Date.now() - new Date(emp.start_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
        graduation_year: eduMap.get(p.id)?.[0]?.year_graduated || null,
        program: eduMap.get(p.id)?.[0]?.program || null,
        skills: hide ? [] : skillsMap.get(p.id) || [],
        available_for_referral: p.available_for_referral,
        available_for_mentoring: p.available_for_mentoring,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/alumni-at-company-name/:companyName', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const companyName = req.params.companyName;
    const { data: employment } = await supabase
      .from('employment')
      .select('profile_id, position, start_date, company_name')
      .ilike('company_name', `%${companyName}%`)
      .eq('is_current', true);

    if (!employment || employment.length === 0) return res.json([]);

    const profileIds = [...new Set(employment.map((e: any) => e.profile_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, headline, privacy_settings, available_for_referral')
      .in('id', profileIds);

    const { data: education } = await supabase
      .from('education')
      .select('profile_id, program, year_graduated')
      .in('profile_id', profileIds);

    const eduMap = new Map<string, any[]>();
    education?.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push(e);
    });

    const empMap = new Map<string, any[]>();
    employment?.forEach((e: any) => {
      if (!empMap.has(e.profile_id)) empMap.set(e.profile_id, []);
      empMap.get(e.profile_id)!.push(e);
    });

    const result = (profiles || []).map((p: any) => {
      const privacy = p.privacy_settings || {};
      const hide = !privacy.show_employment;
      const emp = empMap.get(p.id)?.[0];
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        headline: hide ? null : p.headline,
        current_position: hide ? null : emp?.position,
        company_name: hide ? null : emp?.company_name,
        graduation_year: eduMap.get(p.id)?.[0]?.year_graduated || null,
        program: eduMap.get(p.id)?.[0]?.program || null,
        available_for_referral: p.available_for_referral,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

router.get('/stats', authenticate, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const [
      { count: totalAlumni },
      { count: totalProfiles },
      { count: activeConnections },
      { count: pendingReferrals },
      { count: alumniAvailableForReferral },
      { count: companiesCount },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'alumni'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('connections').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('available_for_referral', true),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    ]);

    res.json({
      totalAlumni: totalAlumni || 0,
      totalProfiles: totalProfiles || 0,
      activeConnections: activeConnections || 0,
      pendingReferrals: pendingReferrals || 0,
      alumniAvailableForReferral: alumniAvailableForReferral || 0,
      verifiedCompanies: companiesCount || 0,
    });
  } catch (err) { next(err); }
});

router.get('/company/:companyId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.params.companyId)
      .single();
    if (!company) throw new AppError('Company not found', 404);

    const { data: employment } = await supabase
      .from('employment')
      .select('profile_id, position, employment_status, salary_range')
      .eq('company_name', company.name)
      .eq('is_current', true);

    const alumniCount = employment?.length || 0;
    const positions = [...new Set(employment?.map((e: any) => e.position) || [])];
    const departments = [...new Set(employment?.map((e: any) => e.employment_status) || [])];

    const { data: jobPostings } = await supabase
      .from('job_postings')
      .select('id, position, job_type, location, salary_range, created_at, expires_at')
      .eq('company_name', company.name)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    const followersResult = await supabase
      .from('company_followers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id);

    res.json({
      ...company,
      alumni_count: alumniCount,
      current_openings: jobPostings || [],
      common_positions: positions.slice(0, 10),
      departments_hiring: departments.slice(0, 10),
      follower_count: followersResult.count || 0,
    });
  } catch (err) { next(err); }
});

router.get('/job-alumni/:jobId', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: job } = await supabase
      .from('job_postings')
      .select('company_name')
      .eq('id', req.params.jobId)
      .single();
    if (!job) throw new AppError('Job not found', 404);

    const { data: employment } = await supabase
      .from('employment')
      .select('profile_id, position, start_date')
      .eq('company_name', job.company_name)
      .eq('is_current', true);

    if (!employment || employment.length === 0) return res.json([]);

    const profileIds = employment.map((e: any) => e.profile_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, headline, privacy_settings, available_for_referral, available_for_mentoring')
      .in('id', profileIds);

    const { data: education } = await supabase
      .from('education')
      .select('profile_id, program, year_graduated')
      .in('profile_id', profileIds);

    const eduMap = new Map<string, any[]>();
    education?.forEach((e: any) => {
      if (!eduMap.has(e.profile_id)) eduMap.set(e.profile_id, []);
      eduMap.get(e.profile_id)!.push(e);
    });

    const empMap = new Map(employment?.map((e: any) => [e.profile_id, e]) || []);

    const result = (profiles || []).map((p: any) => {
      const privacy = p.privacy_settings || {};
      const hide = !privacy.show_employment;
      const emp = empMap.get(p.id);
      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        current_position: hide ? null : emp?.position,
        years_at_company: hide ? null : emp?.start_date ? Math.floor((Date.now() - new Date(emp.start_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
        graduation_year: eduMap.get(p.id)?.[0]?.year_graduated || null,
        program: eduMap.get(p.id)?.[0]?.program || null,
        available_for_referral: p.available_for_referral,
        available_for_mentoring: p.available_for_mentoring,
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

export default router;
