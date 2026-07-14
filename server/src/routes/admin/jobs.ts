import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';

    let query = supabase.from('job_postings').select('*', { count: 'exact' });

    if (status === 'active') query = query.gte('expires_at', new Date().toISOString());
    else if (status === 'expired') query = query.lt('expires_at', new Date().toISOString());
    if (search) query = query.or(`position.ilike.%${search}%,company_name.ilike.%${search}%`);

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: jobs, count, error } = await query;
    if (error && error.code === '42P01') return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = jobs || [];
    const posterIds = result.map((j: any) => j.posted_by).filter(Boolean);
    if (posterIds.length > 0) {
      const { data: posters } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', posterIds);
      const posterMap = new Map((posters || []).map((p: any) => [p.id, p]));
      result = result.map((j: any) => ({ ...j, profiles: posterMap.get(j.posted_by) || null }));
    }

    const jobIds = result.map((j: any) => j.id).filter(Boolean);
    const referralCounts: Record<string, number> = {};
    if (jobIds.length > 0) {
      const { data: referrals } = await supabase
        .from('referral_requests')
        .select('job_id')
        .in('job_id', jobIds);
      referrals?.forEach((r: any) => {
        referralCounts[r.job_id] = (referralCounts[r.job_id] || 0) + 1;
      });
    }
    result = result.map((j: any) => ({ ...j, referral_count: referralCounts[j.id] || 0 }));

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { company_name, position, description, requirements, location, job_type, salary_range, application_url, is_alumni_exclusive, expires_at, industry, required_skills, experience_level, is_remote } = req.body;
    if (!company_name || !position || !description || !location) {
      throw new AppError('Company name, position, description, and location are required', 400);
    }
    const { data, error } = await supabase.from('job_postings').insert({
      company_name, position, description, requirements: requirements || [],
      location, job_type: job_type || 'full-time', salary_range: salary_range || null,
      application_url: application_url || null, is_alumni_exclusive: is_alumni_exclusive || false,
      posted_by: null,
      industry: industry || null,
      required_skills: required_skills || [],
      experience_level: experience_level || 'entry',
      is_remote: is_remote || false,
      expires_at: expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single();
    if (error && error.code === '42P01') throw new AppError('Job postings table not available', 400);
    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').update(req.body).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/close', async (req, res, next) => {
  try {
    const { error } = await supabase.from('job_postings').update({ expires_at: new Date().toISOString() }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Job posting closed' });
  } catch (err) {
    next(err);
  }
});

export default router;
