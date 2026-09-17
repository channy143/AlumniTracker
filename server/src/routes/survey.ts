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

export async function closeExpiredSurveys() {
  const now = new Date().toISOString();
  const { data: expired, error } = await supabase
    .from('surveys')
    .select('id')
    .eq('is_active', true)
    .eq('is_closed', false)
    .eq('status', 'published')
    .lt('expires_at', now);

  if (error || !expired || expired.length === 0) return;

  const ids = expired.map((s: any) => s.id);

  await supabase
    .from('surveys')
    .update({ is_active: false, is_closed: true, status: 'closed' })
    .in('id', ids);

  await supabase.from('notifications').delete().eq('type', 'survey').in('survey_id', ids);
}

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
    await closeExpiredSurveys();
    const now = new Date().toISOString();
    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('is_active', true)
      .eq('is_closed', false)
      .eq('status', 'published')
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
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
      survey: { ...eligible, questions: eligible.questions || STANDARD_QUESTIONS },
      completed: !!existing,
    });
  } catch (err) { next(err); }
});

const ONBOARDING_SURVEY_ID = '00000000-0000-0000-0000-000000000001';

router.get('/onboarding', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: userRec } = await supabase
      .from('users')
      .select('survey_completed')
      .eq('id', req.user!.userId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, education(*)')
      .eq('user_id', req.user!.userId)
      .single();

    const { data: existingResponse } = await supabase
      .from('survey_responses')
      .select('id, responses, submitted_at')
      .eq('survey_id', ONBOARDING_SURVEY_ID)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const isCompleted = !!(userRec?.survey_completed || existingResponse);

    res.json({
      surveyId: ONBOARDING_SURVEY_ID,
      title: 'CTU-Naga Graduate Tracer & Alumni Registration Survey',
      completed: isCompleted,
      existingResponse: existingResponse?.responses || null,
      profile: {
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        middleName: profile?.middle_name || '',
        email: profile?.email || req.user!.email,
        phone: profile?.phone || '',
        studentId: profile?.id_number || '',
        gender: profile?.gender || '',
        civilStatus: profile?.civil_status || '',
        address: profile?.address || '',
        city: profile?.city || '',
        province: profile?.province || '',
        country: profile?.country || 'Philippines',
        program: profile?.education?.[0]?.program || '',
        yearGraduated: profile?.education?.[0]?.year_graduated || '',
        honors: profile?.education?.[0]?.honors || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/onboarding', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { consent, responses } = req.body;

    if (!consent || !consent.agreed) {
      throw new AppError('You must accept the Data Privacy Consent to complete your alumni registration', 400);
    }

    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', ONBOARDING_SURVEY_ID)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    const fullPayload = {
      consent,
      ...responses,
      submitted_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('survey_responses')
        .update({ responses: fullPayload, submitted_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      const { error: insErr } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: ONBOARDING_SURVEY_ID,
          user_id: req.user!.userId,
          responses: fullPayload,
          submitted_at: new Date().toISOString(),
        });
      if (insErr) {
        console.error('[Survey Onboarding] Insert error:', insErr);
        throw new AppError('Failed to record survey response', 500);
      }
    }

    // Mark survey_completed = true on users table
    await supabase
      .from('users')
      .update({ survey_completed: true })
      .eq('id', req.user!.userId);

    // Sync relevant profile information if provided
    const profileUpdates: Record<string, any> = {};
    if (responses?.phone) profileUpdates.phone = responses.phone;
    if (responses?.gender) profileUpdates.gender = responses.gender;
    if (responses?.civilStatus) profileUpdates.civil_status = responses.civilStatus;
    if (responses?.address) profileUpdates.address = responses.address;
    if (responses?.city) profileUpdates.city = responses.city;
    if (responses?.province) profileUpdates.province = responses.province;
    if (responses?.middleName) profileUpdates.middle_name = responses.middleName;

    // Sync employment fields if provided
    if (responses?.employmentStatus) profileUpdates.employment_status = responses.employmentStatus;
    if (responses?.currentJobTitle) profileUpdates.current_job_title = responses.currentJobTitle;
    if (responses?.companyName) profileUpdates.company_name = responses.companyName;
    if (responses?.industry) profileUpdates.industry = responses.industry;
    if (responses?.salaryRange) profileUpdates.salary_range = responses.salaryRange;
    if (responses?.jobType) profileUpdates.job_type = String(responses.jobType).toLowerCase();

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString();
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', req.user!.userId);
    }

    // Sync honors to education if provided
    if (responses?.honors !== undefined) {
      const honorsValue = responses.honors === 'None' || responses.honors === '' ? null : responses.honors;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', req.user!.userId)
        .single();
      if (profile) {
        await supabase
          .from('education')
          .update({ honors: honorsValue })
          .eq('profile_id', profile.id);

        // If employed, create or update current employment record
        if (
          (responses.employmentStatus === 'Employed' || responses.employmentStatus === 'Self-employed') &&
          (responses.companyName || responses.currentJobTitle)
        ) {
          const { data: existingEmp } = await supabase
            .from('employment')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('is_current', true)
            .maybeSingle();

          const empPayload = {
            profile_id: profile.id,
            company_name: responses.companyName || 'Self-Employed / Independent',
            position: responses.currentJobTitle || 'Professional',
            company_industry: responses.industry || null,
            employment_status: responses.employmentStatus,
            job_type: responses.jobType ? String(responses.jobType).toLowerCase() : 'full-time',
            salary_range: responses.salaryRange || null,
            is_current: true,
            start_date: new Date().toISOString().split('T')[0],
          };

          if (existingEmp) {
            await supabase.from('employment').update(empPayload).eq('id', existingEmp.id);
          } else {
            await supabase.from('employment').insert(empPayload);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Onboarding survey and consent successfully recorded.',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await closeExpiredSurveys();
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw new AppError('Survey not found', 404);

    const now = new Date();
    const isOpen = survey.is_active && survey.status === 'published'
      && (!survey.starts_at || new Date(survey.starts_at) <= now)
      && (!survey.expires_at || new Date(survey.expires_at) >= now);

    if (!isOpen) {
      return res.json({ ...survey, questions: survey.questions || STANDARD_QUESTIONS, completed: false, closed: true });
    }

    const { data: existing } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('survey_id', survey.id)
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    res.json({
      ...survey,
      questions: survey.questions || STANDARD_QUESTIONS,
      completed: !!existing,
      closed: false,
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
