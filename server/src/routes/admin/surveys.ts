import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { createSurveyNotifications } from '../notifications';

const STANDARD_QUESTIONS = [
  { id: 'personal_info', section: 'Personal Information', type: 'section' },
  { id: 'full_name', section: 'personal_info', label: 'Full Name', type: 'text', required: true },
  { id: 'email', section: 'personal_info', label: 'Email Address', type: 'text', required: true },
  { id: 'contact_number', section: 'personal_info', label: 'Contact Number', type: 'text' },
  { id: 'educational_bg', section: 'Educational Background', type: 'section' },
  { id: 'program', section: 'educational_bg', label: 'Program Graduated', type: 'text', required: true },
  { id: 'year_graduated', section: 'educational_bg', label: 'Year Graduated', type: 'text', required: true },
  { id: 'employment_info', section: 'Employment Information', type: 'section' },
  { id: 'employment_status', section: 'employment_info', label: 'Current Employment Status', type: 'choice', options: ['Employed', 'Self-employed', 'Unemployed', 'Seeking Opportunities', 'Retired'], required: true },
  { id: 'company_name', section: 'employment_info', label: 'Company Name', type: 'text' },
  { id: 'position', section: 'employment_info', label: 'Job Title / Position', type: 'text' },
  { id: 'industry', section: 'employment_info', label: 'Industry', type: 'text' },
  { id: 'job_type', section: 'employment_info', label: 'Employment Type', type: 'choice', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'] },
  { id: 'salary_range', section: 'employment_info', label: 'Monthly Salary Range', type: 'text' },
  { id: 'employment_history', section: 'Employment History', type: 'section' },
  { id: 'first_job', section: 'employment_history', label: 'Months from graduation to first job', type: 'text' },
  { id: 'job_tenure', section: 'employment_history', label: 'Months in current position', type: 'text' },
  { id: 'skills', section: 'Skills', type: 'section' },
  { id: 'skills_list', section: 'skills', label: 'Skills acquired from your degree', type: 'text' },
  { id: 'work_alignment', section: 'Work Alignment', type: 'section' },
  { id: 'course_alignment', section: 'work_alignment', label: 'Is your current job aligned with your degree?', type: 'choice', options: ['Closely Aligned', 'Partially Aligned', 'Not Aligned'] },
  { id: 'employment_satisfaction', section: 'Employment Satisfaction', type: 'section' },
  { id: 'satisfaction_rating', section: 'employment_satisfaction', label: 'How satisfied are you with your current employment?', type: 'choice', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
  { id: 'graduate_feedback', section: 'Graduate Feedback', type: 'section' },
  { id: 'curriculum_relevance', section: 'graduate_feedback', label: 'How relevant was the curriculum to your career?', type: 'choice', options: ['Very Relevant', 'Relevant', 'Somewhat Relevant', 'Not Relevant'] },
  { id: 'suggestions', section: 'graduate_feedback', label: 'Suggestions for curriculum improvement', type: 'text' },
];

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as string;
    const academicYear = req.query.academic_year as string;
    const targetBatch = req.query.target_batch as string;

    let query = supabase.from('surveys').select('*');

    if (status === 'active') query = query.eq('is_active', true);
    else if (status === 'closed') query = query.eq('is_closed', true);
    else if (status === 'draft') query = query.eq('is_active', false).eq('is_closed', false);

    if (academicYear) query = query.eq('academic_year', academicYear);
    if (targetBatch) query = query.eq('target_value', targetBatch);

    query = query.order('created_at', { ascending: false });

    const { data: surveys, error } = await query;
    if (error) throw new AppError(error.message, 500);

    const surveysWithCounts = await Promise.all((surveys || []).map(async (survey) => {
      const { count } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.id);
      return { ...survey, questions: STANDARD_QUESTIONS, responseCount: count || 0 };
    }));

    res.json(surveysWithCounts);
  } catch (err) {
    next(err);
  }
});

router.get('/standard-questions', (_req, res) => {
  res.json(STANDARD_QUESTIONS);
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, academic_year, target_type, target_value, opens_at, closes_at, status, notes } = req.body;
    if (!title) throw new AppError('Survey title is required', 400);

    if (status === 'published') {
      const targetKey = target_type || 'all';
      const targetVal = target_type === 'batch' || target_type === 'course' ? target_value : null;
      let activeQuery = supabase.from('surveys')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'published')
        .eq('target_type', targetKey);
      if (targetVal) activeQuery = activeQuery.eq('target_value', targetVal);
      const { data: active } = await activeQuery;
      if (active && active.length > 0) {
        throw new AppError(`There is already an active survey for this target (${targetKey}${targetVal ? ': ' + targetVal : ''}). Close it first.`, 400);
      }
    }

    const { data, error } = await supabase.from('surveys').insert({
      title,
      description: description || '',
      questions: STANDARD_QUESTIONS,
      academic_year: academic_year || null,
      target_type: target_type || 'all',
      target_value: target_value || null,
      starts_at: opens_at || new Date().toISOString(),
      expires_at: closes_at || null,
      status: status || 'draft',
      is_active: status === 'published',
      notes: notes || null,
    }).select().single();

    if (error) throw new AppError(error.message, 500);

    if (status === 'published' && data) {
      createSurveyNotifications(data);
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: survey, error } = await supabase.from('surveys').select('*').eq('id', req.params.id).single();
    if (error) throw new AppError('Survey not found', 404);

    const { count: responseCount } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', survey.id);

    const { count: targetCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'alumni');

    res.json({ ...survey, questions: STANDARD_QUESTIONS, responseCount: responseCount || 0, targetCount: targetCount || 0 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, description, academic_year, target_type, target_value, opens_at, closes_at, status, notes } = req.body;
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (academic_year !== undefined) updates.academic_year = academic_year;
    if (target_type !== undefined) updates.target_type = target_type;
    if (target_value !== undefined) updates.target_value = target_value;
    if (opens_at !== undefined) updates.starts_at = opens_at;
    if (closes_at !== undefined) updates.expires_at = closes_at;
    if (status !== undefined) { updates.status = status; updates.is_active = status === 'published'; }
    if (notes !== undefined) updates.notes = notes;

    if (status === 'published') {
      const { data: current } = await supabase.from('surveys').select('target_type, target_value').eq('id', req.params.id).single();
      const targetKey = (target_type || current?.target_type) || 'all';
      const targetVal = target_value || current?.target_value;
      let activeQuery = supabase.from('surveys')
        .select('id')
        .eq('is_active', true)
        .eq('status', 'published')
        .eq('target_type', targetKey)
        .neq('id', req.params.id);
      if (targetVal) activeQuery = activeQuery.eq('target_value', targetVal);
      const { data: active } = await activeQuery;
      if (active && active.length > 0) {
        throw new AppError(`There is already an active survey for this target. Close it first.`, 400);
      }
    }

    const { error } = await supabase.from('surveys').update(updates).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    if (status === 'published') {
      const { data: survey } = await supabase.from('surveys').select('*').eq('id', req.params.id).single();
      if (survey) createSurveyNotifications(survey);
    }

    res.json({ message: 'Survey updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').delete().eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey deleted' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/activate', async (req, res, next) => {
  try {
    const { data: survey } = await supabase.from('surveys').select('*').eq('id', req.params.id).single();
    if (!survey) throw new AppError('Survey not found', 404);

    const targetKey = survey.target_type || 'all';
    const targetVal = survey.target_value;
    let activeQuery = supabase.from('surveys')
      .select('id')
      .eq('is_active', true)
      .eq('status', 'published')
      .eq('target_type', targetKey)
      .neq('id', req.params.id);
    if (targetVal) activeQuery = activeQuery.eq('target_value', targetVal);
    const { data: active } = await activeQuery;
    if (active && active.length > 0) {
      throw new AppError(`There is already an active survey for this target. Close it first.`, 400);
    }

    const { error } = await supabase.from('surveys').update({ is_active: true, status: 'published' }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    createSurveyNotifications(survey);

    res.json({ message: 'Survey activated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/deactivate', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey deactivated' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/close', async (req, res, next) => {
  try {
    const { error } = await supabase.from('surveys').update({ is_active: false, is_closed: true, status: 'closed' }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Survey closed' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const { data: original } = await supabase.from('surveys').select('*').eq('id', req.params.id).single();
    if (!original) throw new AppError('Survey not found', 404);

    const { data, error } = await supabase.from('surveys').insert({
      title: `${original.title} (Copy)`,
      description: original.description,
      questions: STANDARD_QUESTIONS,
      academic_year: original.academic_year,
      target_type: original.target_type,
      target_value: original.target_value,
      is_active: false,
      status: 'draft',
      notes: original.notes,
    }).select().single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/responses', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';

    let query = supabase
      .from('survey_responses')
      .select('*', { count: 'exact' })
      .eq('survey_id', req.params.id)
      .order('submitted_at', { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data: responses, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = responses || [];
    const userIds = result.map((r: any) => r.user_id).filter(Boolean);

    if (userIds.length > 0) {
      const [{ data: users }, { data: profiles }] = await Promise.all([
        supabase.from('users').select('id, email').in('id', userIds),
        supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', userIds),
      ]);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      result = result.map((r: any) => ({
        ...r,
        user: {
          ...(userMap.get(r.user_id) || { id: r.user_id, email: null }),
          profile: profileMap.get(r.user_id) || null,
        },
      }));
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((r: any) =>
        r.user?.email?.toLowerCase().includes(s) ||
        r.user?.profile?.first_name?.toLowerCase().includes(s) ||
        r.user?.profile?.last_name?.toLowerCase().includes(s)
      );
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/responses/export', async (req, res, next) => {
  try {
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', req.params.id);

    const { data: survey } = await supabase.from('surveys').select('title').eq('id', req.params.id).single();

    let result = responses || [];
    const userIds = result.map((r: any) => r.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, email').in('id', userIds);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const { data: profiles } = await supabase.from('profiles').select('user_id, first_name, last_name').in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      result = result.map((r: any) => ({
        ...r,
        user: {
          ...(userMap.get(r.user_id) || { email: null }),
          profile: profileMap.get(r.user_id) || null,
        },
      }));
    }

    const csvRows = (result || []).map((r: any) => {
      const row: Record<string, string> = {
        'Name': r.user?.profile ? `${r.user.profile.first_name || ''} ${r.user.profile.last_name || ''}`.trim() : '',
        'Email': r.user?.email || '',
      };
      (STANDARD_QUESTIONS || []).forEach((q: any) => {
        if (q.type === 'section') return;
        row[q.label || q.id] = r.responses?.[q.id] || '';
      });
      return row;
    });

    if (csvRows.length === 0) return res.json([]);

    const headers = Object.keys(csvRows[0]);
    const csv = csvRows.map((r: any) => headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=survey-${req.params.id.slice(0, 8)}-responses.csv`);
    return res.send(`${headers.join(',')}\n${csv}`);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('responses')
      .eq('survey_id', req.params.id);

    if (!responses || responses.length === 0) {
      return res.json({ total: 0, employmentStatus: [], industryDistribution: [], workAlignment: [], satisfaction: [], curriculumRelevance: [] });
    }

    const employmentStatus: Record<string, number> = {};
    const industryDistribution: Record<string, number> = {};
    const workAlignment: Record<string, number> = {};
    const satisfaction: Record<string, number> = {};
    const curriculumRelevance: Record<string, number> = {};

    responses.forEach((r: any) => {
      const data = r.responses || {};
      const status = data.employment_status;
      if (status) employmentStatus[status] = (employmentStatus[status] || 0) + 1;
      const industry = data.industry;
      if (industry) industryDistribution[industry] = (industryDistribution[industry] || 0) + 1;
      const alignment = data.course_alignment;
      if (alignment) workAlignment[alignment] = (workAlignment[alignment] || 0) + 1;
      const sat = data.satisfaction_rating;
      if (sat) satisfaction[sat] = (satisfaction[sat] || 0) + 1;
      const relevance = data.curriculum_relevance;
      if (relevance) curriculumRelevance[relevance] = (curriculumRelevance[relevance] || 0) + 1;
    });

    const toArray = (map: Record<string, number>) => Object.entries(map).map(([label, count]) => ({ label, count }));

    res.json({
      total: responses.length,
      employmentStatus: toArray(employmentStatus),
      industryDistribution: toArray(industryDistribution),
      workAlignment: toArray(workAlignment),
      satisfaction: toArray(satisfaction),
      curriculumRelevance: toArray(curriculumRelevance),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
