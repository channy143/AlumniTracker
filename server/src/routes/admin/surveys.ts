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

export const ONBOARDING_SURVEY_ID = '00000000-0000-0000-0000-000000000001';

export const ONBOARDING_QUESTIONS = [
  { id: 'consent_section', section: 'User Consent (RA 10173 Data Privacy)', type: 'section' },
  { id: 'agreed', section: 'consent_section', label: 'Data Privacy Consent Acceptance', type: 'choice', required: true },
  { id: 'collectProcess', section: 'consent_section', label: 'Collect & Process Information Authorization', type: 'choice', required: true },
  { id: 'storeRetain', section: 'consent_section', label: 'Store & Retain Information Authorization', type: 'choice', required: true },
  { id: 'congratulatoryBanners', section: 'consent_section', label: 'Congratulatory Banners Authorization', type: 'choice', required: true },
  { id: 'promotionalDiscounts', section: 'consent_section', label: 'Alumni Activities & Promotional Discounts Authorization', type: 'choice', required: true },
  { id: 'jobOpportunities', section: 'consent_section', label: 'Employment Opportunities Referral Authorization', type: 'choice', required: true },

  { id: 'personal_section', section: 'Personal & Contact Details', type: 'section' },
  { id: 'firstName', section: 'personal_section', label: 'First Name', type: 'text', required: true },
  { id: 'lastName', section: 'personal_section', label: 'Last Name', type: 'text', required: true },
  { id: 'middleName', section: 'personal_section', label: 'Middle Name', type: 'text' },
  { id: 'studentId', section: 'personal_section', label: 'Student / Alumni ID', type: 'text' },
  { id: 'email', section: 'personal_section', label: 'Email Address', type: 'text', required: true },
  { id: 'phone', section: 'personal_section', label: 'Contact / Mobile Number', type: 'text', required: true },
  { id: 'gender', section: 'personal_section', label: 'Gender', type: 'choice' },
  { id: 'civilStatus', section: 'personal_section', label: 'Civil Status', type: 'choice' },
  { id: 'city', section: 'personal_section', label: 'City / Municipality', type: 'text', required: true },
  { id: 'province', section: 'personal_section', label: 'Province', type: 'text' },
  { id: 'address', section: 'personal_section', label: 'Street / Barangay Address', type: 'text' },
  { id: 'currentResidenceLocation', section: 'personal_section', label: 'Current Living Location', type: 'choice' },

  { id: 'academic_section', section: 'Educational Background & Licensure', type: 'section' },
  { id: 'program', section: 'academic_section', label: 'Degree / Program Graduated at CTU', type: 'text', required: true },
  { id: 'yearGraduated', section: 'academic_section', label: 'Graduation Year', type: 'text', required: true },
  { id: 'honors', section: 'academic_section', label: 'Academic Honors', type: 'choice' },
  { id: 'licensureStatus', section: 'academic_section', label: 'Professional Licensure / Board Exam Status', type: 'choice' },
  { id: 'licensureExamName', section: 'academic_section', label: 'Exam / License Title', type: 'text' },
  { id: 'reasonsForEnrolling', section: 'academic_section', label: 'Primary Reasons for Enrolling at CTU', type: 'multi-choice' },

  { id: 'skills_section', section: 'Skills & Lifelong Learning', type: 'section' },
  { id: 'furtherStudies', section: 'skills_section', label: 'Post-Graduate / Further Studies Status', type: 'choice' },
  { id: 'postGradCertifications', section: 'skills_section', label: 'Post-Grad Certifications & Seminars', type: 'text' },
  { id: 'competenciesDeveloped', section: 'skills_section', label: 'Core Competencies Acquired from CTU', type: 'multi-choice' },

  { id: 'feedback_section', section: 'Graduate Feedback & Institutional Evaluation', type: 'section' },
  { id: 'curriculumRelevance', section: 'feedback_section', label: 'Curriculum Relevance to Professional Readiness', type: 'choice' },
  { id: 'facultyRating', section: 'feedback_section', label: 'Faculty Evaluation Rating (1-5)', type: 'choice' },
  { id: 'facilitiesRating', section: 'feedback_section', label: 'Laboratories & Facilities Rating (1-5)', type: 'choice' },
  { id: 'studentServicesRating', section: 'feedback_section', label: 'Student Guidance & Services Rating (1-5)', type: 'choice' },
  { id: 'engagementPreferences', section: 'feedback_section', label: 'Ways to Stay Engaged with CTU-Naga', type: 'multi-choice' },
  { id: 'suggestions', section: 'feedback_section', label: 'Suggestions for Curriculum / Institutional Improvement', type: 'text' },
];

export function getQuestionsForSurvey(survey: any) {
  if (survey.id === ONBOARDING_SURVEY_ID) {
    return ONBOARDING_QUESTIONS;
  }
  if (Array.isArray(survey.questions) && survey.questions.length > 0) {
    return survey.questions;
  }
  return STANDARD_QUESTIONS;
}

const router = Router();

async function getTargetCount(survey: any): Promise<number> {
  const { target_type, target_value } = survey;

  if (target_type === 'batch' && target_value) {
    const { data: education } = await supabase
      .from('education')
      .select('profile_id')
      .eq('year_graduated', parseInt(target_value, 10));
    if (!education || education.length === 0) return 0;
    const profileIds = education.map((e: any) => e.profile_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .in('id', profileIds);
    if (!profiles || profiles.length === 0) return 0;
    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);
    if (userIds.length === 0) return 0;
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('id', userIds)
      .eq('role', 'alumni');
    return count || 0;
  }

  if (target_type === 'course' && target_value) {
    const { data: education } = await supabase
      .from('education')
      .select('profile_id')
      .eq('program', target_value);
    if (!education || education.length === 0) return 0;
    const profileIds = education.map((e: any) => e.profile_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .in('id', profileIds);
    if (!profiles || profiles.length === 0) return 0;
    const userIds = profiles.map((p: any) => p.user_id).filter(Boolean);
    if (userIds.length === 0) return 0;
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('id', userIds)
      .eq('role', 'alumni');
    return count || 0;
  }

  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'alumni');
  return count || 0;
}

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
      const [responseCount, targetCount] = await Promise.all([count || 0, getTargetCount(survey)]);
      const questions = getQuestionsForSurvey(survey);
      return { ...survey, questions, responseCount, targetCount };
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

    const targetCount = await getTargetCount(survey);

    const questions = getQuestionsForSurvey(survey);
    res.json({ ...survey, questions, responseCount: responseCount || 0, targetCount });
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
        supabase.from('profiles').select('user_id, first_name, last_name, id_number').in('user_id', userIds),
      ]);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      result = result.map((r: any) => {
        const u = userMap.get(r.user_id) || { id: r.user_id, email: null };
        const p = profileMap.get(r.user_id) || null;
        const resp = r.responses || {};
        const firstName = p?.first_name || resp.firstName || '';
        const lastName = p?.last_name || resp.lastName || '';
        const email = u.email || resp.email || null;
        return {
          ...r,
          user: {
            ...u,
            email,
            profile: {
              first_name: firstName,
              last_name: lastName,
              id_number: p?.id_number || resp.studentId || '',
              ...(p || {}),
            },
          },
        };
      });
    }

    if (search) {
      const s = search.toLowerCase();
      result = result.filter((r: any) =>
        r.user?.email?.toLowerCase().includes(s) ||
        r.user?.profile?.first_name?.toLowerCase().includes(s) ||
        r.user?.profile?.last_name?.toLowerCase().includes(s) ||
        r.responses?.program?.toLowerCase().includes(s)
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

    const { data: survey } = await supabase.from('surveys').select('*').eq('id', req.params.id).single();
    const isOnboarding = req.params.id === ONBOARDING_SURVEY_ID || (survey && survey.title?.includes('Registration'));
    const questions = survey ? getQuestionsForSurvey(survey) : STANDARD_QUESTIONS;

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
      const p = r.user?.profile;
      const resp = r.responses || {};
      const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `${resp.firstName || ''} ${resp.lastName || ''}`.trim();
      const email = r.user?.email || resp.email || '';

      if (isOnboarding) {
        const consent = resp.consent || {};
        return {
          'Name': name,
          'Email': email,
          'Phone': resp.phone || '',
          'Student ID': resp.studentId || '',
          'Gender': resp.gender || '',
          'Civil Status': resp.civilStatus || '',
          'City / Municipality': resp.city || '',
          'Province': resp.province || '',
          'Address': resp.address || '',
          'Current Residence Location': resp.currentResidenceLocation || '',
          'Degree Program': resp.program || '',
          'Graduation Year': resp.yearGraduated ? String(resp.yearGraduated) : '',
          'Academic Honors': resp.honors || '',
          'Licensure Status': resp.licensureStatus || '',
          'Licensure Exam Name': resp.licensureExamName || '',
          'Reasons for Enrolling at CTU': Array.isArray(resp.reasonsForEnrolling) ? resp.reasonsForEnrolling.join('; ') : '',
          'Post-Grad / Further Studies': resp.furtherStudies || '',
          'Certifications': resp.postGradCertifications || '',
          'Core Competencies Acquired': Array.isArray(resp.competenciesDeveloped) ? resp.competenciesDeveloped.join('; ') : '',
          'Curriculum Relevance': resp.curriculumRelevance || '',
          'Faculty Evaluation Rating': resp.facultyRating ? `${resp.facultyRating} / 5` : '',
          'Facilities Rating': resp.facilitiesRating ? `${resp.facilitiesRating} / 5` : '',
          'Student Services Rating': resp.studentServicesRating ? `${resp.studentServicesRating} / 5` : '',
          'Engagement Preferences': Array.isArray(resp.engagementPreferences) ? resp.engagementPreferences.join('; ') : '',
          'Suggestions': resp.suggestions || '',
          'DPA Consent Agreed': consent.agreed ? 'Yes' : 'No',
          'Auth - Collect & Process': consent.collectProcess ? 'Yes' : 'No',
          'Auth - Store & Retain': consent.storeRetain ? 'Yes' : 'No',
          'Auth - Congratulatory Banners': consent.congratulatoryBanners ? 'Yes' : 'No',
          'Auth - Promotional Discounts': consent.promotionalDiscounts ? 'Yes' : 'No',
          'Auth - Job Opportunities': consent.jobOpportunities ? 'Yes' : 'No',
          'Submitted At': r.submitted_at || resp.submitted_at || '',
        };
      }

      const row: Record<string, string> = {
        'Name': name,
        'Email': email,
      };
      (questions || []).forEach((q: any) => {
        if (q.type === 'section') return;
        const val = resp[q.id];
        row[q.label || q.id] = Array.isArray(val) ? val.join('; ') : String(val ?? '');
      });
      row['Submitted At'] = r.submitted_at || '';
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
      return res.json({
        total: 0,
        isOnboarding: req.params.id === ONBOARDING_SURVEY_ID,
        employmentStatus: [],
        industryDistribution: [],
        workAlignment: [],
        satisfaction: [],
        curriculumRelevance: [],
        ratings: {
          faculty: { average: 0, distribution: [] },
          facilities: { average: 0, distribution: [] },
          studentServices: { average: 0, distribution: [] },
        },
        reasonsForEnrolling: [],
        competenciesDeveloped: [],
        licensureStatus: [],
        furtherStudies: [],
        engagementPreferences: [],
        residenceDistribution: [],
      });
    }

    const isOnboarding = req.params.id === ONBOARDING_SURVEY_ID || responses.some((r: any) => r.responses?.reasonsForEnrolling || r.responses?.competenciesDeveloped || r.responses?.facultyRating);

    const employmentStatus: Record<string, number> = {};
    const industryDistribution: Record<string, number> = {};
    const workAlignment: Record<string, number> = {};
    const satisfaction: Record<string, number> = {};
    const curriculumRelevance: Record<string, number> = {};

    const reasonsForEnrolling: Record<string, number> = {};
    const competenciesDeveloped: Record<string, number> = {};
    const licensureStatus: Record<string, number> = {};
    const furtherStudies: Record<string, number> = {};
    const engagementPreferences: Record<string, number> = {};
    const residenceDistribution: Record<string, number> = {};
    const civilStatusDistribution: Record<string, number> = {};

    const facultyScores: number[] = [];
    const facilitiesScores: number[] = [];
    const servicesScores: number[] = [];
    let dpaConsentAgreed = 0;

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

      const relevance = data.curriculum_relevance || data.curriculumRelevance;
      if (relevance) curriculumRelevance[relevance] = (curriculumRelevance[relevance] || 0) + 1;

      if (Array.isArray(data.reasonsForEnrolling)) {
        data.reasonsForEnrolling.forEach((reason: string) => {
          if (reason) reasonsForEnrolling[reason] = (reasonsForEnrolling[reason] || 0) + 1;
        });
      }

      if (Array.isArray(data.competenciesDeveloped)) {
        data.competenciesDeveloped.forEach((comp: string) => {
          if (comp) competenciesDeveloped[comp] = (competenciesDeveloped[comp] || 0) + 1;
        });
      }

      if (Array.isArray(data.engagementPreferences)) {
        data.engagementPreferences.forEach((item: string) => {
          if (item) engagementPreferences[item] = (engagementPreferences[item] || 0) + 1;
        });
      }

      if (data.licensureStatus) {
        licensureStatus[data.licensureStatus] = (licensureStatus[data.licensureStatus] || 0) + 1;
      }

      if (data.furtherStudies) {
        furtherStudies[data.furtherStudies] = (furtherStudies[data.furtherStudies] || 0) + 1;
      }

      if (data.currentResidenceLocation) {
        residenceDistribution[data.currentResidenceLocation] = (residenceDistribution[data.currentResidenceLocation] || 0) + 1;
      }

      if (data.civilStatus) {
        civilStatusDistribution[data.civilStatus] = (civilStatusDistribution[data.civilStatus] || 0) + 1;
      }

      if (data.facultyRating) {
        const score = Number(data.facultyRating);
        if (!isNaN(score)) facultyScores.push(score);
      }
      if (data.facilitiesRating) {
        const score = Number(data.facilitiesRating);
        if (!isNaN(score)) facilitiesScores.push(score);
      }
      if (data.studentServicesRating) {
        const score = Number(data.studentServicesRating);
        if (!isNaN(score)) servicesScores.push(score);
      }

      if (data.consent?.agreed) {
        dpaConsentAgreed++;
      }
    });

    const toArray = (map: Record<string, number>) =>
      Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);

    const calcRatingStats = (scores: number[]) => {
      if (scores.length === 0) return { average: 0, distribution: [] };
      const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      const countMap: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      scores.forEach((s) => { countMap[s] = (countMap[s] || 0) + 1; });
      const distribution = [5, 4, 3, 2, 1].map((rating) => ({
        label: `${rating} Star${rating > 1 ? 's' : ''}`,
        count: countMap[rating] || 0,
        percentage: Math.round(((countMap[rating] || 0) / scores.length) * 100),
      }));
      return { average: avg, distribution };
    };

    res.json({
      total: responses.length,
      isOnboarding,
      employmentStatus: toArray(employmentStatus),
      industryDistribution: toArray(industryDistribution),
      workAlignment: toArray(workAlignment),
      satisfaction: toArray(satisfaction),
      curriculumRelevance: toArray(curriculumRelevance),
      ratings: {
        faculty: calcRatingStats(facultyScores),
        facilities: calcRatingStats(facilitiesScores),
        studentServices: calcRatingStats(servicesScores),
      },
      reasonsForEnrolling: toArray(reasonsForEnrolling),
      competenciesDeveloped: toArray(competenciesDeveloped),
      licensureStatus: toArray(licensureStatus),
      furtherStudies: toArray(furtherStudies),
      engagementPreferences: toArray(engagementPreferences),
      residenceDistribution: toArray(residenceDistribution),
      civilStatusDistribution: toArray(civilStatusDistribution),
      dpaCompliance: {
        total: responses.length,
        agreed: dpaConsentAgreed,
        rate: responses.length > 0 ? Math.round((dpaConsentAgreed / responses.length) * 100) : 100,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
