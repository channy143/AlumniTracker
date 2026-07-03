import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

function buildCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const csv = rows.map((r) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...csv].join('\n');
}

router.get('/alumni', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: users } = await supabase
      .from('users')
      .select('*, profile:profiles(*), education:education(*), employment:employment(*)')
      .eq('role', 'alumni');

    if (format === 'csv') {
      const rows = (users || []).map((u: any) => ({
        email: u.email, first_name: u.profile?.first_name, last_name: u.profile?.last_name,
        id_number: u.profile?.id_number, program: u.education?.[0]?.program, year_graduated: u.education?.[0]?.year_graduated,
        company: u.employment?.[0]?.company_name, position: u.employment?.[0]?.position,
        is_verified: u.is_verified, created_at: u.created_at,
      }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=alumni-report.csv');
      return res.send(buildCsv(rows));
    }
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/employment', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: employment } = await supabase
      .from('employment')
      .select('*, profile:profiles!employment_profile_id_fkey(first_name, last_name, email, id_number), education:education!profile_id(program, year_graduated)')
      .order('start_date', { ascending: false });

    if (format === 'csv') {
      const rows = (employment || []).map((e: any) => ({
        first_name: e.profile?.first_name, last_name: e.profile?.last_name, email: e.profile?.email,
        id_number: e.profile?.id_number, program: e.education?.[0]?.program, year_graduated: e.education?.[0]?.year_graduated,
        company: e.company_name, position: e.position, industry: e.company_industry,
        status: e.employment_status, job_type: e.job_type, start_date: e.start_date, is_current: e.is_current,
      }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employment-report.csv');
      return res.send(buildCsv(rows));
    }
    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.get('/employer', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: companies } = await supabase.from('companies').select('*').order('name');
    if (!companies) return res.json([]);

    if (format === 'csv') {
      const rows = (companies || []).map((c: any) => ({
        name: c.name, industry: c.industry, website: c.website, city: c.city, province: c.province,
        contact_email: c.contact_email, is_verified: c.is_verified, created_at: c.created_at,
      }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=employer-report.csv');
      return res.send(buildCsv(rows));
    }
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

router.get('/survey/:id', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('*, user:users!survey_responses_user_id_fkey(email)')
      .eq('survey_id', req.params.id);

    const { data: survey } = await supabase.from('surveys').select('title').eq('id', req.params.id).single();

    if (format === 'csv') {
      const rows = (responses || []).map((r: any, i: number) => ({
        respondent: r.user?.email, submitted_at: r.submitted_at, response: JSON.stringify(r.responses),
      }));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=survey-${survey?.title?.replace(/\s+/g, '-').slice(0, 30) || 'report'}.csv`);
      return res.send(buildCsv(rows));
    }
    res.json({ survey, responses });
  } catch (err) {
    next(err);
  }
});

router.get('/career-progress', async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const { data: employment } = await supabase
      .from('employment')
      .select('*, profile:profiles!employment_profile_id_fkey(first_name, last_name, email)')
      .order('profile_id')
      .order('start_date', { ascending: true });

    const careerPaths: Record<string, any> = {};
    (employment || []).forEach((e: any) => {
      const pid = e.profile_id;
      if (!careerPaths[pid]) careerPaths[pid] = { profile: e.profile, positions: [] };
      careerPaths[pid].positions.push({ company: e.company_name, position: e.position, start: e.start_date, end: e.end_date });
    });

    const result = Object.values(careerPaths);

    if (format === 'csv') {
      const rows = result.flatMap((cp: any) =>
        cp.positions.map((p: any) => ({
          first_name: cp.profile?.first_name, last_name: cp.profile?.last_name, email: cp.profile?.email,
          company: p.company, position: p.position, start_date: p.start, end_date: p.end || 'Present',
        }))
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=career-progress-report.csv');
      return res.send(buildCsv(rows));
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
