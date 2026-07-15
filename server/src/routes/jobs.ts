import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.get('/', authenticate, async (_req, res, next) => {
  try {
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const result = await Promise.all((jobs || []).map(async (job: any) => {
      let companyInfo: any = null;
      if (job.company_name) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, website, contact_email, logo, industry')
          .ilike('name', job.company_name)
          .maybeSingle();
        companyInfo = company;
      }
      return {
        id: job.id,
        company_name: job.company_name,
        position: job.position,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        job_type: job.job_type,
        salary_range: job.salary_range,
        is_alumni_exclusive: job.is_alumni_exclusive,
        created_at: job.created_at,
        expires_at: job.expires_at,
        company_website: companyInfo?.website || null,
        company_email: companyInfo?.contact_email || null,
        company_logo: companyInfo?.logo || null,
        company_industry: companyInfo?.industry || null,
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { data: job, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw new AppError(error.message, 500);
    if (!job) throw new AppError('Job not found', 404);

    let companyInfo: any = null;
    if (job.company_name) {
      const { data: company } = await supabase
        .from('companies')
        .select('name, website, contact_email, logo, industry')
        .ilike('name', job.company_name)
        .maybeSingle();
      companyInfo = company;
    }

    res.json({
      id: job.id,
      company_name: job.company_name,
      position: job.position,
      description: job.description,
      requirements: job.requirements,
      location: job.location,
      job_type: job.job_type,
      salary_range: job.salary_range,
      is_alumni_exclusive: job.is_alumni_exclusive,
      created_at: job.created_at,
      expires_at: job.expires_at,
      company_website: companyInfo?.website || null,
      company_email: companyInfo?.contact_email || null,
      company_logo: companyInfo?.logo || null,
      company_industry: companyInfo?.industry || null,
    });
  } catch (err) { next(err); }
});
export default router;
