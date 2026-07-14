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

// POST /api/jobs/seed - insert sample jobs
router.post('/seed', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user!.role !== 'admin') throw new AppError('Admin only', 403);

    const { count } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return res.json({ message: 'Jobs already seeded', count });
    }

    const sampleJobs = [
      {
        company_name: 'Accenture',
        position: 'Senior Software Engineer',
        description: 'We are looking for a Senior Software Engineer with 3+ years of experience in full-stack development. Proficiency in React, Node.js, and cloud services (AWS/Azure) is required. Join our team and work on cutting-edge enterprise projects for global clients.',
        requirements: ['3+ years full-stack experience', 'Proficient in React and Node.js', 'Experience with AWS or Azure', 'Strong problem-solving skills', 'Excellent communication skills'],
        location: 'Cebu City',
        job_type: 'full-time',
        salary_range: '₱80,000 - ₱150,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
      {
        company_name: 'Google',
        position: 'Frontend Developer',
        description: 'Google is hiring a Frontend Developer to join our team in Manila. You will be working on user-facing features for our flagship products. The ideal candidate has a strong foundation in web fundamentals and a passion for creating beautiful, performant interfaces.',
        requirements: ['Strong knowledge of HTML, CSS, JavaScript', 'Experience with React or Angular', 'Understanding of web performance optimization', 'Portfolio of previous work'],
        location: 'Manila',
        job_type: 'full-time',
        salary_range: '₱120,000 - ₱200,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      },
      {
        company_name: 'TechStart Solutions',
        position: 'Junior Web Developer',
        description: 'TechStart Solutions is hiring a Junior Web Developer for their growing team. Ideal candidates are recent IT/CS graduates with knowledge of HTML, CSS, JavaScript, and basic PHP. We offer mentorship and growth opportunities.',
        requirements: ['Fresh graduate of BSIT/BSCS or related', 'Knowledge of HTML, CSS, JavaScript', 'Basic PHP understanding', 'Willing to learn', 'Good communication skills'],
        location: 'Naga City',
        job_type: 'full-time',
        salary_range: '₱25,000 - ₱35,000',
        is_alumni_exclusive: true,
        expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
      },
      {
        company_name: 'IBM',
        position: 'Cloud Solutions Architect',
        description: 'IBM Philippines is seeking a Cloud Solutions Architect to design and implement cloud infrastructure solutions. You will work with enterprise clients to migrate their workloads to the cloud and optimize their cloud architecture.',
        requirements: ['5+ years in cloud architecture', 'AWS or Azure certifications', 'Experience with Kubernetes and Docker', 'Enterprise architecture experience'],
        location: 'Manila',
        job_type: 'full-time',
        salary_range: '₱150,000 - ₱250,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 120 * 86400000).toISOString(),
      },
      {
        company_name: 'CreativeHub PH',
        position: 'Remote Graphic Designer',
        description: 'Our creative agency is expanding and we need a talented graphic designer. Must be proficient in Adobe Creative Suite, Figma, and have a strong portfolio. Work-from-home arrangement with monthly team meetups in Naga City.',
        requirements: ['Proficient in Adobe Creative Suite', 'Experience with Figma', 'Strong portfolio', 'At least 2 years experience', 'Good communication skills'],
        location: 'Naga City (Remote)',
        job_type: 'freelance',
        salary_range: '₱30,000 - ₱60,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      {
        company_name: 'UnionBank',
        position: 'Software Engineer Intern',
        description: 'UnionBank is looking for passionate IT students for our summer internship program. You will work alongside our engineering team on real banking applications. This is a paid internship with potential for full-time employment.',
        requirements: ['Currently enrolled in BSIT/BSCS', 'Knowledge of Java or C#', 'Basic understanding of databases', 'Available for full-time internship'],
        location: 'Makati City',
        job_type: 'internship',
        salary_range: '₱15,000 - ₱20,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 20 * 86400000).toISOString(),
      },
      {
        company_name: 'DOST',
        position: 'Part-Time Research Assistant',
        description: 'DOST is hiring a part-time research assistant for a government-funded technology research project. Ideal for graduate students or professionals looking to contribute to national development through technology research.',
        requirements: ['BS degree in Engineering or IT', 'Research experience', 'Good writing skills', 'Part-time availability'],
        location: 'Quezon City',
        job_type: 'part-time',
        salary_range: '₱20,000 - ₱30,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      },
      {
        company_name: 'Accenture',
        position: 'Cybersecurity Analyst',
        description: 'Join our cybersecurity team to help protect enterprise clients from emerging threats. You will be responsible for security assessments, incident response, and implementing security best practices.',
        requirements: ['Knowledge of cybersecurity fundamentals', 'Experience with security tools', 'CEH or equivalent certification preferred', 'Analytical mindset'],
        location: 'Cebu City',
        job_type: 'full-time',
        salary_range: '₱60,000 - ₱100,000',
        is_alumni_exclusive: false,
        expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
    ];

    const { data, error } = await supabase.from('job_postings').insert(sampleJobs).select();

    if (error) throw new AppError(error.message, 500);

    res.json({ message: 'Jobs seeded successfully', count: data?.length || 0 });
  } catch (err) { next(err); }
});

export default router;
