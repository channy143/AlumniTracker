import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { createBroadcastNotification, createNotification } from '../notifications';
import { notifyAllAlumniByEmail } from '../../services/email';
import { formatProgramLongName } from '../../utils/formatProgram';

async function dispatchAnnouncementNotifications(ann: any) {
  const sendToAll = ann.send_to_all !== false;
  const targetBatches: string[] = Array.isArray(ann.target_batches)
    ? ann.target_batches.map((b: any) => String(b).trim()).filter(Boolean)
    : [];
  const targetCourses: string[] = Array.isArray(ann.target_courses)
    ? ann.target_courses.map((c: any) => String(c).trim()).filter(Boolean)
    : [];

  const title = `📢 ${ann.title || 'Announcement'}`;
  const message = ann.content?.slice(0, 120)
    ? `${ann.content.slice(0, 120)}...`
    : 'A new announcement has been published.';
  const link = `/announcements?id=${ann.id}`;

  if (sendToAll || (targetBatches.length === 0 && targetCourses.length === 0)) {
    await createBroadcastNotification({
      role: 'alumni',
      type: 'announcement',
      title,
      message,
      link,
    });
    void notifyAllAlumniByEmail({
      kind: 'announcement',
      title: ann.title,
      content: ann.content || '',
    }).catch((err) => console.error('[Announcement Email Error]', err));
    return;
  }

  // Targeted dispatch: resolve active alumni matching selected batches and/or courses
  const [{ data: usersData }, { data: profilesData }, { data: eduData }] = await Promise.all([
    supabase.from('users').select('id, email, is_archived, is_active').eq('role', 'alumni'),
    supabase.from('profiles').select('id, user_id'),
    supabase.from('education').select('profile_id, program, year_graduated'),
  ]);

  const profIdByUserId = new Map((profilesData || []).map((p: any) => [p.user_id, p.id]));
  const eduByProfId = new Map<string, any[]>();
  (eduData || []).forEach((ed: any) => {
    if (!ed.profile_id) return;
    if (!eduByProfId.has(ed.profile_id)) eduByProfId.set(ed.profile_id, []);
    eduByProfId.get(ed.profile_id)!.push(ed);
  });

  const matchedUsers = (usersData || []).filter((u: any) => {
    if (u.is_archived || u.is_active === false) return false;
    const pid = profIdByUserId.get(u.id);
    const edus = pid ? eduByProfId.get(pid) || [] : [];
    return edus.some((ed: any) => {
      const batchOk =
        targetBatches.length === 0 || targetBatches.includes(String(ed.year_graduated || '').trim());
      const progRaw = String(ed.program || '').trim().toLowerCase();
      const progLong = ed.program ? formatProgramLongName(ed.program).toLowerCase() : '';
      const courseOk =
        targetCourses.length === 0 ||
        targetCourses.some((tc) => {
          const tcl = tc.toLowerCase();
          return progRaw === tcl || progLong === formatProgramLongName(tc).toLowerCase() || progLong.includes(tcl);
        });
      return batchOk && courseOk;
    });
  });

  if (matchedUsers.length === 0) return;

  await Promise.all(
    matchedUsers.map((u: any) =>
      createNotification({
        userId: u.id,
        type: 'announcement',
        title,
        message,
        link,
      })
    )
  );
  void notifyAllAlumniByEmail(
    {
      kind: 'announcement',
      title: ann.title,
      content: ann.content || '',
    },
    matchedUsers.map((u: any) => u.email)
  ).catch((err) => console.error('[Announcement Targeted Email Error]', err));
}

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// POST /api/admin/announcements/upload-image - upload announcement graphic / flyer
router.post('/upload-image', upload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new AppError('No image file uploaded', 400);

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppError('Unsupported image format. Please upload JPG, PNG, WEBP, or GIF.', 400);
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `announcements/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    let publicUrl: string | null = null;
    try {
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[Announcement Upload] Storage upload fallback to data URL:', storageErr);
    }

    if (!publicUrl) {
      publicUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    res.json({ url: publicUrl, file_name: file.originalname });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';

    let query = supabase.from('announcements').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: announcements, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ data: [], total: 0, page, limit });
    if (error) throw new AppError(error.message, 500);

    let result = announcements || [];
    const creatorIds = result.map((a: any) => a.created_by).filter(Boolean);
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, email')
        .in('id', creatorIds);
      const creatorMap = new Map((creators || []).map((c: any) => [c.id, c]));
      result = result.map((a: any) => ({ ...a, user: creatorMap.get(a.created_by) || { email: null } }));
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, content, image_url, document_url, is_pinned, is_scheduled, scheduled_at, send_to_all, send_by_batch, send_by_course, target_batches, target_courses, status, linked_survey_id } = req.body;
    if (!title || !content) throw new AppError('Title and content are required', 400);

    const effectiveStatus = status || 'published';
    const { data, error } = await supabase.from('announcements').insert({
      title, content, image_url, document_url, is_pinned: is_pinned || false,
      is_scheduled: is_scheduled || false, scheduled_at,
      send_to_all: send_to_all !== false, send_by_batch: send_by_batch || false, send_by_course: send_by_course || false,
      target_batches: target_batches || [], target_courses: target_courses || [],
      status: effectiveStatus,
      published_at: effectiveStatus === 'published' ? new Date().toISOString() : null,
      created_by: (req as any).user!.userId,
      linked_survey_id: linked_survey_id || null,
    }).select().single();

    if (error) throw new AppError(error.message, 500);

    if (data && data.status === 'published') {
      await dispatchAnnouncementNotifications(data);
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, content, image_url, document_url, is_pinned, is_scheduled, scheduled_at, send_to_all, send_by_batch, send_by_course, target_batches, target_courses, status, linked_survey_id } = req.body;

    const payload: any = {};
    if (title !== undefined) payload.title = title;
    if (content !== undefined) payload.content = content;
    if (image_url !== undefined) payload.image_url = image_url || null;
    if (document_url !== undefined) payload.document_url = document_url || null;
    if (is_pinned !== undefined) payload.is_pinned = is_pinned;
    if (is_scheduled !== undefined) payload.is_scheduled = is_scheduled;
    if (scheduled_at !== undefined) payload.scheduled_at = scheduled_at || null;
    if (send_to_all !== undefined) payload.send_to_all = send_to_all;
    if (send_by_batch !== undefined) payload.send_by_batch = send_by_batch;
    if (send_by_course !== undefined) payload.send_by_course = send_by_course;
    if (target_batches !== undefined) payload.target_batches = target_batches || [];
    if (target_courses !== undefined) payload.target_courses = target_courses || [];
    if (status !== undefined) {
      payload.status = status;
      if (status === 'published') payload.published_at = new Date().toISOString();
    }
    if (linked_survey_id !== undefined) payload.linked_survey_id = linked_survey_id || null;

    payload.updated_at = new Date().toISOString();

    const { data: existing } = await supabase
      .from('announcements')
      .select('status, title, content')
      .eq('id', req.params.id)
      .single();

    const { error } = await supabase.from('announcements').update(payload).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    if (status === 'published' && existing?.status !== 'published') {
      const { data: fullAnn } = await supabase.from('announcements').select('*').eq('id', req.params.id).maybeSingle();
      if (fullAnn) {
        await dispatchAnnouncementNotifications(fullAnn);
      }
    }

    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const isHardDelete = req.query.hard === 'true';
    if (isHardDelete) {
      const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
      if (error) throw new AppError(error.message, 500);
      return res.json({ message: 'Announcement deleted' });
    }
    const { error } = await supabase.from('announcements').update({ status: 'archived' }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Announcement archived' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/restore', async (req, res, next) => {
  try {
    const { status } = req.body;
    const nextStatus = status === 'published' ? 'published' : 'draft';
    const { error } = await supabase.from('announcements').update({
      status: nextStatus,
      published_at: nextStatus === 'published' ? new Date().toISOString() : null,
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: 'Announcement restored', status: nextStatus });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/pin', async (req, res, next) => {
  try {
    const isPinned = req.body.is_pinned !== false;
    const { error } = await supabase.from('announcements').update({ is_pinned: isPinned }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);
    res.json({ message: isPinned ? 'Announcement pinned' : 'Announcement unpinned' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/publish', async (req, res, next) => {
  try {
    const { data: ann } = await supabase.from('announcements').select('*').eq('id', req.params.id).maybeSingle();
    const { error } = await supabase.from('announcements').update({
      status: 'published', published_at: new Date().toISOString(),
    }).eq('id', req.params.id);
    if (error) throw new AppError(error.message, 500);

    if (ann) {
      await dispatchAnnouncementNotifications(ann);
    }

    res.json({ message: 'Announcement published' });
  } catch (err) {
    next(err);
  }
});

export default router;
