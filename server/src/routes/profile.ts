import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*, education:education(*), skills:skills(*), certifications:certifications(*)')
      .eq('user_id', req.user!.userId)
      .single();

    if (error) {
      console.error('[Profile GET] Supabase error:', { code: error.code, message: error.message, details: error.details });
      if (error.code === 'PGRST116') return res.json(null);
      throw new AppError(`Profile query failed: ${error.message}`, 500);
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(req.body)
      .eq('user_id', req.user!.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/career', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const allowedFields = ['employment_status', 'current_job_title', 'company_name', 'industry', 'salary_range'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'employment_status' && req.body[field] !== null) {
          const valid = ['Employed', 'Unemployed', 'Self-employed', 'Student', 'Seeking Opportunities', 'Retired'];
          if (!valid.includes(req.body[field])) {
            throw new AppError('Invalid employment status', 400);
          }
        }
        updates[field] = req.body[field];
      }
    }
    updates.last_updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', req.user!.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.json(profile);
  } catch (err) { next(err); }
});

router.post('/photo', authenticate, upload.single('photo'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const parts = req.file.originalname.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'jpg';
    const fileName = `avatars/${req.user!.userId}.${ext}`;

    console.log(`[Profile Photo] Uploading to profiles/${fileName} (${req.file.size} bytes, ${req.file.mimetype})`);

    const { data: uploadData, error: uploadError } = await supabase.storage
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

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
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

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(req.file.mimetype)) {
      throw new AppError('Only PDF and DOC/DOCX files are allowed', 400);
    }

    const parts = req.file.originalname.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'pdf';
    const fileName = `resumes/${req.user!.userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ resume_url: urlData.publicUrl })
      .eq('user_id', req.user!.userId);

    if (updateError) {
      throw new AppError(`Profile update failed: ${updateError.message}`, 500);
    }

    res.json({ url: urlData.publicUrl });
  } catch (err) { next(err); }
});

router.delete('/resume', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const basePath = `resumes/${req.user!.userId}`;
    await supabase.storage.from('profiles').remove([`${basePath}.pdf`, `${basePath}.doc`, `${basePath}.docx`]);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ resume_url: null })
      .eq('user_id', req.user!.userId);

    if (updateError) throw new AppError(updateError.message, 500);

    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Skills ---

router.post('/skills', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { name, category, proficiency_level } = req.body;
    if (!name) throw new AppError('Skill name is required', 400);

    const { data: skill, error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/skills/batch', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { skills } = req.body;
    if (!Array.isArray(skills)) throw new AppError('skills must be an array', 400);

    // Delete existing, then insert new
    await supabase.from('skills').delete().eq('profile_id', profile.id);

    if (skills.length > 0) {
      const rows = skills.map((s: any) => ({
        profile_id: profile.id,
        name: s.name || s,
        category: s.category || null,
        proficiency_level: s.proficiency_level || 1,
      }));
      const { data: inserted, error } = await supabase.from('skills').insert(rows).select();
      if (error) throw new AppError(error.message, 500);
      return res.json(inserted);
    }

    res.json([]);
  } catch (err) { next(err); }
});

// --- Education ---

router.post('/education', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { program, major, year_started, year_graduated, campus, honors, institution } = req.body;
    if (!program) throw new AppError('Program is required', 400);

    const { data: edu, error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
      .from('education')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Certifications ---

router.post('/certifications', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { name, issuer, issue_date, expiry_date, credential_url } = req.body;
    if (!name || !issuer || !issue_date) throw new AppError('name, issuer, and issue_date are required', 400);

    const { data: cert, error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { data: achievements, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('profile_id', profile.id)
      .order('date_achieved', { ascending: false, nullsFirst: false });

    if (error) throw new AppError(error.message, 500);
    res.json(achievements || []);
  } catch (err) { next(err); }
});

router.post('/achievements', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { title, description, category, date_achieved } = req.body;
    if (!title) throw new AppError('title is required', 400);

    const { data: achievement, error } = await supabase
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();
    if (!profile) throw new AppError('Profile not found', 404);

    const { error } = await supabase
      .from('achievements')
      .delete()
      .eq('id', req.params.id)
      .eq('profile_id', profile.id);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
