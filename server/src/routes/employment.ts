import { Router } from 'express';
import multer from 'multer';
import { createUserScopedClient } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { logAudit } from '../services/auditLogger';

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
      .select('id')
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
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    if (req.body.proof_url) {
      const trimmed = String(req.body.proof_url).trim();
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new AppError('Invalid proof link. The URL must start with http:// or https://', 400);
      }
    }

    const hasProof = Boolean(req.body.proof_url);
    const payload = {
      ...req.body,
      profile_id: profile.id,
      is_verified: false,
      verification_status: hasProof ? 'pending' : 'unverified',
    };

    const { data: employment, error } = await db
      .from('employment')
      .insert(payload)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);

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
      .select('id')
      .eq('user_id', req.user!.userId)
      .single();

    if (!profile) throw new AppError('Profile not found', 404);

    // Rule 2 – Authorized Access: Verify ownership before update
    const { data: existing, error: findError } = await db
      .from('employment')
      .select('id, profile_id, proof_url')
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
      .select('id')
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
