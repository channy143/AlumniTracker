import { Router } from 'express';
import multer from 'multer';
import { supabase, createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { addActivity } from '../services/activityStore';
import { validateResumeContent } from '../utils/validateResume';
import { normalizeCityName, normalizeProvinceName, normalizePhPhone } from '../utils/formatLocation';
import { validateJobTitle, validateCompanyName, normalizeIndustry, toTitleCaseName, validateStudentId } from '../utils/validateJobTitle';
import { notifyAdmins } from './notifications';
import {
  updateProfileSchema,
  updateCareerSchema,
  addSkillSchema,
  batchSkillsSchema,
  addEducationSchema,
  addCertificationSchema,
  addAchievementSchema,
} from '../middleware/validationSchemas';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function logActivity(name: string, action: string, target: string) {
  await addActivity(name, action, target);
}

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile, error } = await db
      .from('profiles')
      .select('*, education:education(*), skills:skills(*), certifications:certifications(*), employment:employment(*)')
      .eq('user_id', req.user!.userId)
      .single();

    if (error) {
      console.error('[Profile GET] Supabase error:', { code: error.code, message: error.message, details: error.details });
      if (error.code === 'PGRST116') return res.json(null);
      throw new AppError(`Profile query failed: ${error.message}`, 500);
    }

    if (profile?.resume_url) {
      let filePath = profile.resume_url;
      if (filePath.includes('/resumes/')) {
        const parts = filePath.split('/resumes/');
        filePath = 'resumes/' + parts[parts.length - 1].split('?')[0];
      }
      try {
        const { data: signedData } = await supabase.storage
          .from('resumes')
          .createSignedUrl(filePath, 604800); // 7 days
        if (signedData?.signedUrl) {
          profile.resume_url = signedData.signedUrl;
        }
      } catch (e) {
        console.error('[Profile GET] Failed to refresh resume signed URL:', e);
      }
    }

    // Backfill any missing profile fields from the user's onboarding survey response
    if (
      profile &&
      (!profile.phone || !profile.address || !profile.city || !profile.province || !profile.middle_name || !profile.employment_status)
    ) {
      try {
        const { data: onboardingResp } = await supabase
          .from('survey_responses')
          .select('responses')
          .eq('survey_id', '00000000-0000-0000-0000-000000000001')
          .eq('user_id', req.user!.userId)
          .maybeSingle();

        const r = onboardingResp?.responses;
        if (r && typeof r === 'object') {
          const backfill: Record<string, any> = {};
          const combinedAddr = [
            r.street ? String(r.street).trim() : '',
            r.barangay ? `Brgy. ${String(r.barangay).trim().replace(/^brgy\.?\s*/i, '')}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          const resolvedAddress = combinedAddr || (r.address ? String(r.address).trim() : '');

          if (!profile.first_name && r.firstName) backfill.first_name = String(r.firstName).trim();
          if (!profile.last_name && r.lastName) backfill.last_name = String(r.lastName).trim();
          if (!profile.middle_name && r.middleName) backfill.middle_name = String(r.middleName).trim();
          if (!profile.phone && r.phone) backfill.phone = normalizePhPhone(r.phone);
          if (!profile.address && resolvedAddress) backfill.address = resolvedAddress;
          if (!profile.province && r.province) backfill.province = normalizeProvinceName(r.province);
          if (!profile.city && r.city) backfill.city = normalizeCityName(r.city, r.province);
          if (!profile.employment_status) {
            const st = String(r.employmentStatus || '').trim();
            backfill.employment_status = !st || st.toLowerCase() === 'n/a' ? 'Unemployed' : st;
          }

          if (Object.keys(backfill).length > 0) {
            Object.assign(profile, backfill);
            await supabase
              .from('profiles')
              .update({ ...backfill, updated_at: new Date().toISOString() })
              .eq('user_id', req.user!.userId);
          }
        }
      } catch (backfillErr) {
        console.error('[Profile GET] Onboarding backfill error:', backfillErr);
      }
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// GET /api/profile/resume - fresh redirect to resume
router.get('/resume', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('resume_url')
      .eq('user_id', req.user!.userId)
      .maybeSingle();

    if (!profile?.resume_url) {
      throw new AppError('No resume uploaded', 404);
    }

    let filePath = profile.resume_url;
    if (filePath.includes('/resumes/')) {
      const parts = filePath.split('/resumes/');
      filePath = 'resumes/' + parts[parts.length - 1].split('?')[0];
    }

    const { data: signedData, error } = await supabase.storage
      .from('resumes')
      .createSignedUrl(filePath, 3600);

    if (error || !signedData?.signedUrl) {
      throw new AppError('Unable to generate resume link', 500);
    }

    res.redirect(signedData.signedUrl);
  } catch (err) { next(err); }
});

router.put('/', authenticate, validate(updateProfileSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const updates = { ...req.body };
    if (updates.first_name !== undefined && updates.first_name) updates.first_name = toTitleCaseName(updates.first_name);
    if (updates.last_name !== undefined && updates.last_name) updates.last_name = toTitleCaseName(updates.last_name);
    if (updates.middle_name !== undefined) updates.middle_name = updates.middle_name ? toTitleCaseName(updates.middle_name) : null;
    if (updates.id_number !== undefined && updates.id_number) {
      const idCheck = validateStudentId(updates.id_number);
      if (!idCheck.valid) throw new AppError(idCheck.error || 'Invalid Student ID format.', 400);
      updates.id_number = idCheck.cleaned;
    }
    if (updates.phone !== undefined) updates.phone = updates.phone ? normalizePhPhone(updates.phone) : null;
    if (updates.province !== undefined) updates.province = updates.province ? normalizeProvinceName(updates.province) : null;
    if (updates.city !== undefined) updates.city = updates.city ? normalizeCityName(updates.city, updates.province) : null;
    if (!updates.city && !updates.province && updates.country === 'Philippines') {
      updates.country = null;
    }
    if (updates.gender !== undefined && updates.gender) updates.gender = String(updates.gender).slice(0, 10);
    if (updates.current_job_title !== undefined) {
      if (updates.current_job_title === null || String(updates.current_job_title).trim() === '') {
        updates.current_job_title = null;
      } else {
        const check = validateJobTitle(updates.current_job_title);
        if (!check.valid) throw new AppError(check.error || 'Please enter a valid job title.', 400);
        updates.current_job_title = check.cleaned;
      }
    }

    const { data: profile, error } = await db
      .from('profiles')
      .update(updates)
      .eq('user_id', req.user!.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

      const name = profile?.first_name || req.user!.email?.split('@')[0] || 'Someone';
    logActivity(name, 'updated their profile', 'Profile information changed');

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/career', authenticate, validate(updateCareerSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const allowedFields = ['employment_status', 'current_job_title', 'company_name', 'industry', 'salary_range'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'employment_status') {
          if (req.body[field] === null || req.body[field] === '') {
            updates[field] = null;
            continue;
          }
          const lower = String(req.body[field]).trim().toLowerCase();
          const map: Record<string, string> = {
            'employed': 'Employed',
            'unemployed': 'Unemployed',
            'student': 'Unemployed',
            'self-employed': 'Self-employed',
            'self employed': 'Self-employed',
            'seeking opportunities': 'Seeking Opportunities',
            'retired': 'Retired',
          };
          const mapped = map[lower];
          if (!mapped) {
            throw new AppError('Invalid employment status', 400);
          }
          updates[field] = mapped;
          continue;
        }
        updates[field] = req.body[field];
      }
    }
    updates.last_updated_at = new Date().toISOString();

    if (updates.employment_status) {
      const lowerStatus = updates.employment_status.toLowerCase();
      if (lowerStatus === 'unemployed' || lowerStatus === 'seeking opportunities' || lowerStatus === 'retired') {
        updates.current_job_title = null;
        updates.company_name = null;
      } else {
        if (lowerStatus === 'employed') {
          if (!updates.current_job_title || !String(updates.current_job_title).trim()) {
            throw new AppError('Current Position / Job Title is required when Employment Status is Employed.', 400);
          }
          if (!updates.company_name || !String(updates.company_name).trim()) {
            throw new AppError('Company / Organization Name is required when Employment Status is Employed.', 400);
          }
        }
        if (updates.current_job_title !== undefined) {
          if (updates.current_job_title === null || String(updates.current_job_title).trim() === '') {
            updates.current_job_title = null;
          } else {
            const check = validateJobTitle(updates.current_job_title);
            if (!check.valid) throw new AppError(check.error || 'Please enter a valid job title.', 400);
            updates.current_job_title = check.cleaned;
          }
        }
      }
      if (updates.company_name !== undefined && updates.company_name !== null && String(updates.company_name).trim() !== '') {
        const compCheck = validateCompanyName(updates.company_name);
        if (!compCheck.valid) throw new AppError(compCheck.error || 'Please enter a valid company name.', 400);
        updates.company_name = compCheck.cleaned;
      }
      if (updates.industry !== undefined && updates.industry !== null && String(updates.industry).trim() !== '') {
        const normInd = normalizeIndustry(updates.industry);
        if (!normInd) throw new AppError('Please select a valid industry from the list.', 400);
        updates.industry = normInd;
      }
    } else if (updates.current_job_title !== undefined && updates.current_job_title !== null && String(updates.current_job_title).trim() !== '') {
      const check = validateJobTitle(updates.current_job_title);
      if (!check.valid) throw new AppError(check.error || 'Please enter a valid job title.', 400);
      updates.current_job_title = check.cleaned;
    }

    const { data: profile, error } = await db
      .from('profiles')
      .update(updates)
      .eq('user_id', req.user!.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    if (updates.employment_status && profile) {
      const lowerStatus = updates.employment_status.toLowerCase();
      if (lowerStatus !== 'employed' && lowerStatus !== 'self-employed') {
        const today = new Date().toISOString().slice(0, 10);
        await db.from('employment').update({ is_current: false, end_date: today }).eq('profile_id', profile.id).eq('is_current', true);
      } else if (profile.current_job_title && profile.company_name) {
        const { data: openRows } = await supabase
          .from('employment')
          .select('id, company_name, position, start_date, is_current, end_date')
          .eq('profile_id', profile.id)
          .or('is_current.eq.true,end_date.is.null');

        const existingEmp = (openRows || [])[0] || null;
        const normNewComp = String(profile.company_name).trim().toLowerCase();
        const normNewPos = String(profile.current_job_title).trim().toLowerCase();
        const isSameRole =
          existingEmp &&
          String(existingEmp.company_name || '').trim().toLowerCase() === normNewComp &&
          String(existingEmp.position || '').trim().toLowerCase() === normNewPos;

        const today = new Date().toISOString().slice(0, 10);
        const empSyncPayload = {
          profile_id: profile.id,
          company_name: profile.company_name,
          position: profile.current_job_title,
          company_industry: profile.industry || null,
          salary_range: profile.salary_range || null,
          employment_status: lowerStatus,
          job_type: 'full-time',
          end_date: null,
          is_current: true,
        };

        if (isSameRole) {
          await supabase.from('employment').update(empSyncPayload).eq('id', existingEmp.id);
        } else {
          // Close all previous active positions instead of overwriting history
          for (const prev of openRows || []) {
            const prevStart = prev.start_date ? String(prev.start_date).slice(0, 10) : '';
            const closeDate = prevStart && today < prevStart ? prevStart : today;
            await supabase
              .from('employment')
              .update({ is_current: false, end_date: closeDate })
              .eq('id', prev.id);
          }
          await supabase.from('employment').insert({ ...empSyncPayload, start_date: today });
        }
      }
    }

    const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : (req.user!.email?.split('@')[0] || 'Someone');
    logActivity(name, 'updated their career info', `Status: ${updates.employment_status || 'unchanged'}`);

    if (updates.employment_status) {
      notifyAdmins({
        type: 'employment',
        title: `💼 Career Status Update: ${name}`,
        message: `${name} updated employment status to "${updates.employment_status}"${updates.company_name ? ` at ${updates.company_name}` : ''}${updates.current_job_title ? ` as ${updates.current_job_title}` : ''}.`,
        link: `/admin/alumni?search=${encodeURIComponent(profile?.last_name || name)}`,
      });
    }

    res.json(profile);
  } catch (err) { next(err); }
});

router.post('/photo', authenticate, upload.single('photo'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const db = createUserScopedClient(req.token!);
    const parts = req.file.originalname.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'jpg';
    const fileName = `avatars/${req.user!.userId}.${ext}`;

    console.log(`[Profile Photo] Uploading to profiles/${fileName} (${req.file.size} bytes, ${req.file.mimetype})`);

    const { data: uploadData, error: uploadError } = await db.storage
      .from('profiles')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Profile Photo] Upload error:', uploadError);
      throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    console.log('[Profile Photo] Upload successful:', uploadData?.path);

    const { data: urlData } = db.storage
      .from('profiles')
      .getPublicUrl(fileName);

    const { error: updateError } = await db
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('user_id', req.user!.userId);

    if (updateError) {
      console.error('[Profile Photo] Profile update error:', updateError);
    }

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    next(err);
  }
});

router.post('/resume', authenticate, upload.single('resume'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    // Validate the actual file content, not just the client-supplied MIME header.
    const validation = await validateResumeContent(req.file.buffer);
    if (!validation.ok) {
      throw new AppError(validation.error || 'Invalid resume file', 400);
    }

    const db = createUserScopedClient(req.token!);
    const fileName = `resumes/${req.user!.userId}.${validation.ext}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, req.file.buffer, {
        contentType: validation.mime,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData, error: signedError } = await supabase.storage
      .from('resumes')
      .createSignedUrl(fileName, 604800);
    if (signedError || !urlData?.signedUrl) {
      throw new AppError('Failed to generate resume link', 500);
    }

    const { error: updateError } = await db
      .from('profiles')
      .update({ resume_url: fileName })
      .eq('user_id', req.user!.userId);

    if (updateError) {
      throw new AppError(`Profile update failed: ${updateError.message}`, 500);
    }

    res.json({ url: urlData.signedUrl, path: fileName, expiresIn: 604800 });
  } catch (err) { next(err); }
});

router.delete('/resume', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const basePath = `resumes/${req.user!.userId}`;
    await supabase.storage.from('resumes').remove([`${basePath}.pdf`, `${basePath}.doc`, `${basePath}.docx`]);

    const { error: updateError } = await db
      .from('profiles')
      .update({ resume_url: null })
      .eq('user_id', req.user!.userId);

    if (updateError) throw new AppError(updateError.message, 500);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Skills ---

// Comprehensive skill suggestions across all professions
const SKILL_SUGGESTIONS = [
  // Information Technology
  'React', 'Angular', 'Vue.js', 'Next.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
  'Node.js', 'Express', 'Python', 'Django', 'Java', 'Spring Boot', 'C#', '.NET',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'Git',
  'REST API', 'GraphQL', 'Linux', 'CI/CD', 'Agile', 'Scrum',

  // Teaching & Education
  'Lesson Planning', 'Curriculum Development', 'Classroom Management', 'Student Assessment',
  'Differentiated Instruction', 'Educational Technology', 'Child Development', 'Special Education',
  'Behavior Management', 'Learning Theory', 'Instructional Design', 'Reading Intervention',
  'ESL Teaching', 'Science Education', 'Mathematics Instruction', 'Educational Research',
  'Parent Communication', 'Coaching & Mentoring', 'Training & Facilitation', 'Test Preparation',

  // Business & Management
  'Project Management', 'Team Leadership', 'Strategic Planning', 'Business Development',
  'Operations Management', 'Financial Analysis', 'Budgeting', 'Human Resources',
  'Customer Relationship Management', 'Sales Management', 'Marketing Strategy',
  'Digital Marketing', 'Content Creation', 'Social Media Management', 'Data Analysis',
  'Risk Management', 'Negotiation', 'Conflict Resolution', 'Public Speaking',

  // Accounting & Finance
  'Bookkeeping', 'Tax Preparation', 'Auditing', 'Financial Reporting', 'QuickBooks',
  'Payroll Management', 'Accounts Payable', 'Accounts Receivable', 'Financial Planning',
  'Internal Controls', 'Cost Accounting', 'Budget Analysis', 'Excel', 'SAP',

  // Engineering & Trades
  'AutoCAD', 'SolidWorks', 'Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering',
  'Electronics', 'HVAC', 'Plumbing', 'Welding', 'Carpentry', 'Blueprint Reading',
  'Quality Control', 'Safety Compliance', 'Technical Drawing', 'Surveying',

  // Healthcare & Science
  'Patient Care', 'Nursing', 'First Aid', 'Laboratory Skills', 'Medical Terminology',
  'Pharmacology', 'Anatomy', 'Physiology', 'Microbiology', 'Chemistry', 'Biology',
  'Physics', 'Research Methodology', 'Data Collection', 'Statistical Analysis',

  // Hospitality & Home Economics
  'Food Preparation', 'Baking & Pastry', 'Culinary Arts', 'Restaurant Management',
  'Housekeeping', 'Event Planning', 'Interior Design', 'Fashion Design', 'Sewing',
  'Nutrition', 'Food Safety', 'Hotel Management', 'Tourism Management', 'Customer Service',

  // General Professional Skills
  'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Critical Thinking',
  'Time Management', 'Adaptability', 'Creativity', 'Collaboration', 'Decision Making',
  'Interpersonal Skills', 'Emotional Intelligence', 'Organizational Skills', 'Writing',
  'Research', 'Presentation Skills', 'Multitasking', 'Attention to Detail',
];

router.get('/skills/suggestions', async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = req.token ? createUserScopedClient(req.token) : supabase;
    const { data: dbSkills } = await db
      .from('skills')
      .select('name')
      .not('name', 'is', null);

    const dbSkillNames = [...new Set((dbSkills || []).map((s: any) => s.name).filter(Boolean))];

    // Merge with predefined suggestions, deduplicate, and sort
    const all = [...new Set([...SKILL_SUGGESTIONS, ...dbSkillNames])].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    res.json(all);
  } catch (err) { next(err); }
});

router.post('/skills', authenticate, validate(addSkillSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { name, category, proficiency_level } = req.body;
    if (!name) throw new AppError('Skill name is required', 400);

    const { data: skill, error } = await db
      .from('skills')
      .insert({ profile_id: profile.id, name, category, proficiency_level: proficiency_level || 1 })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(skill);
  } catch (err) { next(err); }
});

router.delete('/skills/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('skills')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/skills/batch', authenticate, validate(batchSkillsSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { skills } = req.body;
    if (!Array.isArray(skills)) throw new AppError('skills must be an array', 400);

    // Delete existing, then insert new
    await db.from('skills').delete().eq('profile_id', profile.id);

    if (skills.length > 0) {
      const rows = skills.map((s: any) => ({
        profile_id: profile.id,
        name: s.name || s,
        category: s.category || null,
        proficiency_level: s.proficiency_level || 1,
      }));
      const { data: inserted, error } = await db.from('skills').insert(rows).select();
      if (error) throw new AppError(error.message, 500);

      const name = profile.first_name || req.user!.email?.split('@')[0] || 'Someone';
      logActivity(name, 'updated their skills', `${skills.length} skill${skills.length !== 1 ? 's' : ''} updated`);

      return res.json(inserted);
    }

    res.json([]);
  } catch (err) { next(err); }
});

// --- Education ---

router.post('/education', authenticate, validate(addEducationSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { program, major, year_started, year_graduated, campus, honors, institution } = req.body;
    if (!program) throw new AppError('Program is required', 400);

    const { data: edu, error } = await db
      .from('education')
      .insert({
        profile_id: profile.id,
        program,
        major: major || null,
        year_started: year_started || null,
        year_graduated: year_graduated || null,
        campus: campus || institution || null,
        honors: honors || null,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(edu);
  } catch (err) { next(err); }
});

router.put('/education/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('education')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/education/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('education')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Certifications ---

router.post('/certifications', authenticate, validate(addCertificationSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { name, issuer, issue_date, expiry_date, credential_url } = req.body;
    if (!name || !issuer || !issue_date) throw new AppError('name, issuer, and issue_date are required', 400);

    const { data: cert, error } = await db
      .from('certifications')
      .insert({ profile_id: profile.id, name, issuer, issue_date, expiry_date: expiry_date || null, credential_url: credential_url || null })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(cert);
  } catch (err) { next(err); }
});

router.put('/certifications/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('certifications')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/certifications/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('certifications')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Achievements ---

router.get('/achievements', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: achievements, error } = await db
      .from('achievements')
      .select('*')
      .eq('profile_id', profile.id)
      .order('date_achieved', { ascending: false, nullsFirst: false });

    if (error) throw new AppError(error.message, 500);
    res.json(achievements || []);
  } catch (err) { next(err); }
});

router.post('/achievements', authenticate, validate(addAchievementSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { title, description, category, date_achieved } = req.body;
    if (!title) throw new AppError('title is required', 400);

    const { data: achievement, error } = await db
      .from('achievements')
      .insert({ profile_id: profile.id, title, description: description || null, category: category || 'other', date_achieved: date_achieved || null })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(achievement);
  } catch (err) { next(err); }
});

router.delete('/achievements/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await db
      .from('achievements')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
