import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

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

function isUserEligible(survey: any, userProfile: any): boolean {
  if (survey.target_type === 'all') return true;
  if (survey.target_type === 'batch' && survey.target_value) {
    const education = userProfile?.education || [];
    return education.some((e: any) => String(e.year_graduated) === String(survey.target_value));
  }
  if (survey.target_type === 'course' && survey.target_value) {
    const education = userProfile?.education || [];
    return education.some((e: any) => e.program === survey.target_value);
  }
  return true;
}

router.get('/active', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .eq('is_closed', false)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json(null);
    if (error) throw new AppError(error.message, 500);

    if (!surveys || surveys.length === 0) return res.json(null);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, education(*)')
      .eq('user_id', req.user!.userId)
      .single();

    const eligible = surveys.find((s) => isUserEligible(s, profile));
    if (!eligible) return res.json(null);

    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', eligible.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    res.json({
      survey: { ...eligible, questions: STANDARD_QUESTIONS },
      completed: !!existing,
    });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Survey not found', 404);
    if (!survey.is_active && survey.status !== 'published') throw new AppError('Survey not available', 404);

    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', survey.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    res.json({
      ...survey,
      questions: STANDARD_QUESTIONS,
      completed: !!existing,
    });
  } catch (err) { next(err); }
});

router.post('/:id/respond', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { responses } = req.body;

    if (!responses) throw new AppError('Responses are required', 400);

    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', req.params.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    if (existing) throw new AppError('You have already completed this survey', 400);

    const { data: surveyResponse, error } = await supabase
      .from('survey_responses')
      .insert({
        survey_id: req.params.id,
        user_id: req.user!.userId,
        responses,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('survey_id', req.params.id)
      .eq('user_id', req.user!.userId)
      .eq('type', 'survey');

    res.status(201).json({ success: true, response: surveyResponse });
  } catch (err) {
    next(err);
  }
});

export default router;
