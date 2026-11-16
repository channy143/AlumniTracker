import { Router } from 'express';
import multer from 'multer';
import { createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { logAudit } from '../services/auditLogger';
import { validateJobTitle, validateCompanyName, normalizeIndustry, normalizeSalaryRange } from '../utils/validateJobTitle';
import { notifyAdmins } from './notifications';

async function notifyAdminOjtUpdate(params: {
  profile: { first_name?: string | null; last_name?: string | null } | null;
  fallbackEmail?: string;
  companyName: string;
  position: string;
  isActive: boolean;
}) {
  const fullName =
    `${params.profile?.first_name || ''} ${params.profile?.last_name || ''}`.trim() ||
    params.fallbackEmail?.split('@')[0] ||
    'Student';
  const searchTerm = params.profile?.last_name?.trim() || fullName;
  const link = `/admin/alumni?search=${encodeURIComponent(searchTerm)}`;

  if (params.isActive) {
    await notifyAdmins({
      type: 'employment',
      title: `🎓 OJT / Practice Teaching Update: ${fullName}`,
      message: `${fullName} updated Currently Deployed for OJT / Practice Teaching as "${params.position}" at ${params.companyName}.`,
      link,
    });
  } else {
    await notifyAdmins({
      type: 'employment',
      title: `🎓 OJT / Practice Teaching Ended: ${fullName}`,
      message: `${fullName} unmarked Currently Deployed for OJT / Practice Teaching at ${params.companyName}.`,
      link,
    });
  }
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const ALLOWED_PROOF_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

router.post('/upload-proof', authenticate, upload.single('proof'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No document uploaded', 400);

    if (!ALLOWED_PROOF_MIMES.includes(req.file.mimetype)) {
      throw new AppError('Unsupported file type. Please upload a PDF, JPG, or PNG document.', 400);
    }

    const buf = req.file.buffer;
    const isPdf = buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
    const isJpg = buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isWebp = buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';

    if (!isPdf && !isJpg && !isPng && !isWebp) {
      throw new AppError('File content signature does not match an allowed format (PDF, JPG, or PNG).', 400);
    }

    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50);
    const fileName = `employment-proofs/${req.user!.userId}/${Date.now()}_${sanitizedName}`;

    const db = createUserScopedClient(req.token!);
    const { error: uploadError } = await db.storage
      .from('profiles')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    const { data: urlData } = db.storage
      .from('profiles')
      .getPublicUrl(fileName);

    logAudit(req, {
      action: 'EMPLOYMENT_PROOF_UPLOAD',
      entity: 'employment',
      severity: 'info',
      status: 'success',
      details: { file_name: req.file.originalname, size: req.file.size, path: fileName }
    });

    res.json({
      url: urlData.publicUrl,
      file_name: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const { data: employment, error } = await db
      .from('employment')
      .select('*')
      .eq('profile_id', profile.id)
      .order('start_date', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    const posCheck = validateJobTitle(req.body.position);
    if (!posCheck.valid) throw new AppError(posCheck.error || 'Please enter a valid job title.', 400);

    const companyCheck = validateCompanyName(req.body.company_name);
    if (!companyCheck.valid) throw new AppError(companyCheck.error || 'Please enter a valid company name.', 400);

    const normalizedIndustry = normalizeIndustry(req.body.company_industry);
    if (!normalizedIndustry) {
      throw new AppError('Please select a valid industry from the list.', 400);
    }

    const startDateStr = req.body.start_date ? String(req.body.start_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const rawEnd = req.body.end_date && String(req.body.end_date).trim().toLowerCase() !== 'present'
      ? String(req.body.end_date).slice(0, 10)
      : null;
    const isCurrent = req.body.is_current !== undefined ? Boolean(req.body.is_current) : rawEnd === null;
    const endDateStr = isCurrent ? null : rawEnd;

    if (endDateStr && startDateStr && endDateStr < startDateStr) {
      throw new AppError('End date cannot be earlier than start date.', 400);
    }

    const normalizedSalary = normalizeSalaryRange(req.body.salary_range);
    const isOjt =
      String(req.body.record_category || '').toLowerCase() === 'ojt' ||
      String(req.body.job_type || '').toLowerCase() === 'internship';
    const recordCategory = isOjt ? 'ojt' : 'employment';

    // Check for existing employment record with the same (company_name, position) for this alumnus
    const { data: existingRows } = await db
      .from('employment')
      .select('id, company_name, position, job_type, employment_status, start_date, end_date, is_current')
      .eq('profile_id', profile.id);

    const isRowOjt = (r: any) =>
      String(r?.record_category || '').toLowerCase() === 'ojt' ||
      String(r?.job_type || '').toLowerCase() === 'internship' ||
      String(r?.employment_status || '').toLowerCase() === 'ojt';

    const normComp = companyCheck.cleaned.toLowerCase();
    const normPos = posCheck.cleaned.toLowerCase();
    const existingSameRole = (existingRows || []).find((r: any) => {
      const sameComp = String(r.company_name || '').trim().toLowerCase() === normComp;
      const samePos = String(r.position || '').trim().toLowerCase() === normPos;
      return sameComp && samePos && isRowOjt(r) === isOjt;
    });

    if (req.body.proof_url) {
      const trimmed = String(req.body.proof_url).trim();
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new AppError('Invalid proof link. The URL must start with http:// or https://', 400);
      }
    }

    // Auto-close previous active rows in the SAME category only (so working students keep both real work AND OJT active)
    if (isCurrent) {
      const activeRows = (existingRows || []).filter(
        (r: any) =>
          (r.is_current || !r.end_date) &&
          isRowOjt(r) === isOjt &&
          (!existingSameRole || r.id !== existingSameRole.id)
      );
      for (const prev of activeRows) {
        const prevStart = prev.start_date ? String(prev.start_date).slice(0, 10) : '';
        const closeDate = prevStart && startDateStr < prevStart ? prevStart : startDateStr;
        await db
          .from('employment')
          .update({ is_current: false, end_date: closeDate })
          .eq('id', prev.id);
      }
    }

    const rawStatus = String(req.body.employment_status || '').trim().toLowerCase();
    const allowedEmpStatuses = ['employed', 'self-employed', 'unemployed', 'seeking opportunities', 'retired'];
    const validEmpStatus = allowedEmpStatuses.includes(rawStatus)
      ? rawStatus
      : isOjt
        ? 'unemployed'
        : 'employed';

    const hasProof = Boolean(req.body.proof_url);
    const { record_category: _omitCat, ...safeBody } = req.body || {};
    const basePayload: Record<string, any> = {
      ...safeBody,
      company_name: companyCheck.cleaned,
      position: posCheck.cleaned,
      company_industry: normalizedIndustry,
      salary_range: normalizedSalary,
      employment_status: validEmpStatus,
      job_type: isOjt ? 'internship' : (req.body.job_type ? String(req.body.job_type).toLowerCase() : 'full-time'),
      start_date: existingSameRole?.start_date ? String(existingSameRole.start_date).slice(0, 10) : startDateStr,
      end_date: endDateStr,
      is_current: endDateStr === null,
      profile_id: profile.id,
      is_verified: false,
      verification_status: hasProof ? 'pending' : 'unverified',
    };
    const payloadWithCat = { ...basePayload, record_category: recordCategory };

    // If the alumnus already has a row for the same company + position in this category, update it in place
    if (existingSameRole) {
      let { data: updatedEmp, error: updErr } = await db
        .from('employment')
        .update(payloadWithCat)
        .eq('id', existingSameRole.id)
        .select()
        .single();
      if (updErr && (updErr.code === '42703' || updErr.code === 'PGRST204')) {
        ({ data: updatedEmp, error: updErr } = await db
          .from('employment')
          .update(basePayload)
          .eq('id', existingSameRole.id)
          .select()
          .single());
      }
      if (updErr) throw new AppError(updErr.message, 500);
      if (isOjt) {
        notifyAdminOjtUpdate({
          profile,
          fallbackEmail: req.user?.email,
          companyName: companyCheck.cleaned,
          position: posCheck.cleaned,
          isActive: Boolean(updatedEmp?.is_current ?? isCurrent),
        }).catch(() => {});
      }
      return res.status(200).json(updatedEmp);
    }

    let { data: employment, error } = await db
      .from('employment')
      .insert(payloadWithCat)
      .select()
      .single();

    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      ({ data: employment, error } = await db
        .from('employment')
        .insert(basePayload)
        .select()
        .single());
    }

    if (error) throw new AppError(error.message, 500);

    if (isOjt) {
      notifyAdminOjtUpdate({
        profile,
        fallbackEmail: req.user?.email,
        companyName: companyCheck.cleaned,
        position: posCheck.cleaned,
        isActive: Boolean(employment?.is_current ?? isCurrent),
      }).catch(() => {});
    }

    res.status(201).json(employment);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Rule 2 – Authorized Access: Verify ownership before update
    const { data: existing, error: findError } = await db
      .from('employment')
      .select('id, profile_id, company_name, position, company_industry, proof_url, start_date, end_date, is_current, record_category, job_type, employment_status')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!existing) throw new AppError('Employment record not found', 404);

    if (existing.profile_id !== profile.id && req.user!.role !== 'admin') {
      logAudit(req, {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'employment',
        severity: 'warning',
        status: 'failure',
        details: { target_employment_id: req.params.id, reason: 'Alumni attempted to update another user\'s employment record' },
      });
      throw new AppError('Unauthorized: Users may only access and manage information allowed by their account role.', 403);
    }

    const updatePayload: any = { ...req.body };
    if (updatePayload.employment_status !== undefined) {
      const rawUpdStatus = String(updatePayload.employment_status || '').trim().toLowerCase();
      updatePayload.employment_status = ['employed', 'self-employed', 'unemployed', 'seeking opportunities', 'retired'].includes(rawUpdStatus)
        ? rawUpdStatus
        : 'employed';
    }
    if (updatePayload.salary_range !== undefined) {
      updatePayload.salary_range = normalizeSalaryRange(updatePayload.salary_range);
    }
    if (updatePayload.position !== undefined) {
      const check = validateJobTitle(updatePayload.position);
      if (!check.valid) throw new AppError(check.error || 'Please enter a valid job title.', 400);
      updatePayload.position = check.cleaned;
    }
    if (updatePayload.company_name !== undefined) {
      const check = validateCompanyName(updatePayload.company_name);
      if (!check.valid) throw new AppError(check.error || 'Please enter a valid company name.', 400);
      updatePayload.company_name = check.cleaned;
    }
    if (updatePayload.company_industry !== undefined) {
      const normalizedIndustry = normalizeIndustry(updatePayload.company_industry);
      if (!normalizedIndustry) {
        throw new AppError('Please select a valid industry from the list.', 400);
      }
      updatePayload.company_industry = normalizedIndustry;
    }

    const effectiveIsCurrent = updatePayload.is_current !== undefined ? Boolean(updatePayload.is_current) : Boolean(existing.is_current);
    const effectiveStartDate = updatePayload.start_date !== undefined
      ? String(updatePayload.start_date).slice(0, 10)
      : (existing.start_date ? String(existing.start_date).slice(0, 10) : '');
    if (effectiveIsCurrent) {
      updatePayload.end_date = null;
    } else if (updatePayload.end_date !== undefined && updatePayload.end_date !== null) {
      const endStr = String(updatePayload.end_date).slice(0, 10);
      if (effectiveStartDate && endStr && endStr < effectiveStartDate) {
        throw new AppError('End date cannot be earlier than start date.', 400);
      }
      updatePayload.end_date = endStr || null;
    }

    const isThisOjt =
      String(updatePayload.record_category || existing.record_category || '').toLowerCase() === 'ojt' ||
      String(updatePayload.job_type || existing.job_type || '').toLowerCase() === 'internship' ||
      String(updatePayload.employment_status || existing.employment_status || '').toLowerCase() === 'ojt';
    if (isThisOjt) {
      updatePayload.job_type = 'internship';
      const upSt = String(updatePayload.employment_status || '').trim().toLowerCase();
      if (upSt && !['employed', 'self-employed', 'unemployed', 'seeking opportunities', 'retired'].includes(upSt)) {
        delete updatePayload.employment_status;
      }
    }

    if (updatePayload.is_current === true) {
      const closeDate = effectiveStartDate || new Date().toISOString().slice(0, 10);
      const { data: peerActive } = await db
        .from('employment')
        .select('id, record_category, job_type, employment_status')
        .eq('profile_id', existing.profile_id)
        .eq('is_current', true)
        .neq('id', req.params.id);
      for (const peer of peerActive || []) {
        const peerIsOjt =
          String(peer.record_category || '').toLowerCase() === 'ojt' ||
          String(peer.job_type || '').toLowerCase() === 'internship' ||
          String(peer.employment_status || '').toLowerCase() === 'ojt';
        if (peerIsOjt === isThisOjt) {
          await db.from('employment').update({ is_current: false, end_date: closeDate }).eq('id', peer.id);
        }
      }
    }
    if (updatePayload.proof_url) {
      const trimmed = String(updatePayload.proof_url).trim();
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new AppError('Invalid proof link. The URL must start with http:// or https://', 400);
      }
    }
    // Non-admin alumni cannot self-verify employment proof
    if (req.user!.role !== 'admin') {
      delete updatePayload.is_verified;
      delete updatePayload.verified_at;
      delete updatePayload.verified_by;
      // If proof was provided or updated, put verification into pending status
      if (updatePayload.proof_url && updatePayload.proof_url !== existing.proof_url) {
        updatePayload.verification_status = 'pending';
      }
    }

    const { data: employment, error } = await db
      .from('employment')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

    if (isThisOjt) {
      const nextComp = String(employment?.company_name ?? existing.company_name ?? '').trim();
      const nextPos = String(employment?.position ?? existing.position ?? '').trim();
      const nextInd = String(employment?.company_industry ?? existing.company_industry ?? '').trim();
      const nextStart = String(employment?.start_date ?? existing.start_date ?? '').slice(0, 10);
      const nextProof = String(employment?.proof_url ?? existing.proof_url ?? '').trim();
      const nextCurrent = Boolean(employment?.is_current);

      const hasOjtChange =
        nextCurrent !== Boolean(existing.is_current) ||
        nextComp !== String(existing.company_name ?? '').trim() ||
        nextPos !== String(existing.position ?? '').trim() ||
        nextInd !== String(existing.company_industry ?? '').trim() ||
        nextStart !== String(existing.start_date ?? '').slice(0, 10) ||
        nextProof !== String(existing.proof_url ?? '').trim();

      if (hasOjtChange) {
        notifyAdminOjtUpdate({
          profile,
          fallbackEmail: req.user?.email,
          companyName: nextComp || 'OJT Site',
          position: nextPos || 'OJT Intern',
          isActive: nextCurrent,
        }).catch(() => {});
      }
    }

    res.json(employment);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = createUserScopedClient(req.token!);
    const { data: profile } = await db
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Rule 2 – Authorized Access: Verify ownership before deletion
    const { data: existing, error: findError } = await db
      .from('employment')
      .select('id, profile_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 500);
    if (!existing) throw new AppError('Employment record not found', 404);

    if (existing.profile_id !== profile.id && req.user!.role !== 'admin') {
      logAudit(req, {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entity: 'employment',
        severity: 'warning',
        status: 'failure',
        details: { target_employment_id: req.params.id, reason: 'Alumni attempted to delete another user\'s employment record' },
      });
      throw new AppError('Unauthorized: Users may only access and manage information allowed by their account role.', 403);
    }

    const { error } = await db
      .from('employment')
      .delete()
      .eq('id', req.params.id);

    if (error) throw new AppError(error.message, 500);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
