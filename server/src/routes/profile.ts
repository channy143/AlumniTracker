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

    if (error) throw new AppError('Profile not found', 404);

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

router.post('/photo', authenticate, upload.single('photo'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const ext = req.file.originalname.split('.').pop();
    const fileName = `avatars/${req.user!.userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new AppError(uploadError.message, 500);

    const { data: urlData } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('user_id', req.user!.userId);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
