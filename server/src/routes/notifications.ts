import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

const router = Router();

let lastPurgeTime = 0;
export async function purgeOrphanedSurveyNotifications(force = false) {
  const now = Date.now();
  if (!force && now - lastPurgeTime < 60000) return;
  lastPurgeTime = now;
  try {
    const { data: surveys } = await supabase.from('surveys').select('id, is_active, status');
    // Only published and active surveys should have active notifications
    const activeSurveyIds = new Set(
      (surveys || [])
        .filter((s: any) => s.is_active && s.status === 'published')
        .map((s: any) => s.id)
    );

    const { data: surveyNotifs } = await supabase
      .from('notifications')
      .select('id, survey_id, link')
      .or('type.eq.survey,link.ilike.%/surveys/%');

    if (!surveyNotifs || surveyNotifs.length === 0) return;

    const toDeleteIds: string[] = [];
    for (const notif of surveyNotifs) {
      let refId = notif.survey_id;
      if (!refId && notif.link && notif.link.includes('/surveys/')) {
        const match = notif.link.match(/\/surveys\/([a-zA-Z0-9_-]+)/);
        if (match) refId = match[1];
      }

      if (refId && !activeSurveyIds.has(refId)) {
        toDeleteIds.push(notif.id);
      }
    }

    if (toDeleteIds.length > 0) {
      await supabase.from('notifications').delete().in('id', toDeleteIds);
    }
  } catch (err) {
    // Non-blocking cleanup
  }
}

router.get('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await purgeOrphanedSurveyNotifications();
    if (req.user?.role === 'admin') {
      await ensureAdminNotifications(req.user.userId);
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string;
    const unreadOnly = req.query.unread === 'true';

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user!.userId)
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, count, error } = await query;

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ notifications: [], total: 0 });
    if (error) throw new AppError(error.message, 500);

    // If client requested via older array contract (e.g. Header), we can return array or object.
    // To maintain backward compatibility with `res.json(notifications || [])` in Header:
    // If query has `all` or `page` or `count`, we can return both or array with property.
    // But in JS, res.json(notifications) is an array. To avoid breaking Header.tsx `setNotifications(data)` which expects an Array:
    // Let's check: if req.query.envelope === 'true' return { notifications, total: count }, otherwise res.json(notifications || []).
    if (req.query.envelope === 'true') {
      return res.json({ notifications: notifications || [], total: count || 0 });
    }

    res.json(notifications || []);
  } catch (err) { next(err); }
});

router.get('/unread-count', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await purgeOrphanedSurveyNotifications();
    if (req.user?.role === 'admin') {
      await ensureAdminNotifications(req.user.userId);
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user!.userId)
      .eq('is_read', false);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ count: 0 });
    if (error) throw new AppError(error.message, 500);
    res.json({ count: count || 0 });
  } catch (err) { next(err); }
});

router.post('/:id/read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.userId);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/mark-all-read', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user!.userId)
      .eq('is_read', false);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.userId);

    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const readOnly = req.query.read_only === 'true';
    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', req.user!.userId);

    if (readOnly) {
      query = query.eq('is_read', true);
    }

    const { error } = await query;
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export interface CreateNotificationParams {
  userId: string;
  type?: 'survey' | 'job' | 'application' | 'mentorship' | 'connection' | 'post' | 'announcement' | 'event' | 'system' | string;
  title: string;
  message?: string;
  link?: string;
  surveyId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type || 'system',
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      survey_id: params.surveyId || null,
      is_read: false,
    });
    if (error) console.error('Failed to create notification:', error);
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

export interface BroadcastNotificationParams {
  role?: string;
  type?: 'survey' | 'job' | 'application' | 'mentorship' | 'announcement' | 'event' | 'system';
  title: string;
  message?: string;
  link?: string;
  surveyId?: string;
}

export async function createBroadcastNotification(params: BroadcastNotificationParams) {
  try {
    let query = supabase.from('users').select('id').eq('is_active', true);
    if (params.role) {
      query = query.eq('role', params.role);
    } else {
      query = query.eq('role', 'alumni');
    }
    const { data: users, error } = await query;
    if (error || !users || users.length === 0) return;

    const rows = users.map((u: any) => ({
      user_id: u.id,
      type: params.type || 'system',
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      survey_id: params.surveyId || null,
      is_read: false,
    }));

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await supabase.from('notifications').insert(batch);
    }
  } catch (err) {
    console.error('Failed to broadcast notifications:', err);
  }
}

export async function createSurveyNotifications(survey: any) {
  try {
    await createBroadcastNotification({
      role: 'alumni',
      type: 'survey',
      title: `📋 ${survey.title}`,
      message: `Please complete the tracer survey before ${survey.expires_at ? new Date(survey.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the closing date'}.`,
      link: `/surveys/${survey.id}`,
      surveyId: survey.id,
    });
  } catch (err) {
    console.error('Failed to create survey notifications:', err);
  }
}

export interface AdminNotificationParams {
  type: 'alumni' | 'survey' | 'application' | 'security' | 'employment' | 'moderation' | 'system' | 'company' | string;
  title: string;
  message?: string;
  link?: string;
  surveyId?: string;
  createdAt?: string;
}

export async function notifyAdmins(params: AdminNotificationParams) {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error || !admins || admins.length === 0) return;

    const rows = admins.map((admin: any) => ({
      user_id: admin.id,
      type: params.type || 'system',
      title: params.title,
      message: params.message || null,
      link: params.link || null,
      survey_id: params.surveyId || null,
      is_read: false,
      ...(params.createdAt ? { created_at: params.createdAt } : {}),
    }));

    const { error: insErr } = await supabase.from('notifications').insert(rows);
    if (insErr) console.error('[notifyAdmins] Insert error:', insErr);
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

export async function ensureAdminNotifications(adminUserId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', adminUserId);

    if (error) return;
    if (count && count >= 5) return;

    const newRows: any[] = [];

    // 1. Recent Alumni Registrations
    const { data: alumniUsers } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('role', 'alumni')
      .order('created_at', { ascending: false })
      .limit(5);

    if (alumniUsers && alumniUsers.length > 0) {
      const userIds = alumniUsers.map((u: any) => u.id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, education(program, year_graduated)')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      for (const u of alumniUsers) {
        const prof: any = profileMap.get(u.id);
        const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : u.email.split('@')[0];
        const edu = prof?.education?.[0];
        const programInfo = edu?.program ? `${edu.program} - Class of ${edu.year_graduated || 'N/A'}` : 'Alumni Graduate';

        newRows.push({
          user_id: adminUserId,
          type: 'alumni',
          title: `🎓 New Alumni Registered: ${name}`,
          message: `${name} (${programInfo}) registered in the portal.`,
          link: `/admin/alumni?search=${encodeURIComponent(prof?.last_name || u.email)}`,
          is_read: false,
          created_at: u.created_at || new Date().toISOString(),
        });
      }
    }

    // 2. Recent Tracer Survey Responses
    const { data: surveyResponses } = await supabase
      .from('survey_responses')
      .select('id, survey_id, user_id, submitted_at, surveys(title)')
      .order('submitted_at', { ascending: false })
      .limit(5);

    if (surveyResponses && surveyResponses.length > 0) {
      const respUserIds = surveyResponses.map((r: any) => r.user_id).filter(Boolean);
      let respProfileMap = new Map();
      if (respUserIds.length > 0) {
        const { data: respProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', respUserIds);
        respProfileMap = new Map((respProfiles || []).map((p: any) => [p.user_id, p]));
      }

      for (const r of surveyResponses) {
        const prof: any = respProfileMap.get(r.user_id);
        const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Alumnus';
        const surveyTitle = (r.surveys as any)?.title || 'Graduate Tracer Survey';

        newRows.push({
          user_id: adminUserId,
          type: 'survey',
          title: `📋 Survey Response: ${surveyTitle}`,
          message: `${name} submitted their response for "${surveyTitle}".`,
          link: '/admin/surveys',
          survey_id: r.survey_id,
          is_read: false,
          created_at: r.submitted_at || new Date().toISOString(),
        });
      }
    }

    // 3. Recent Job Applications
    const { data: jobApps } = await supabase
      .from('job_applications')
      .select('id, job_id, user_id, applied_at, job_postings(position, company_name)')
      .order('applied_at', { ascending: false })
      .limit(3);

    if (jobApps && jobApps.length > 0) {
      const appUserIds = jobApps.map((a: any) => a.user_id).filter(Boolean);
      let appProfileMap = new Map();
      if (appUserIds.length > 0) {
        const { data: appProfiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', appUserIds);
        appProfileMap = new Map((appProfiles || []).map((p: any) => [p.user_id, p]));
      }

      for (const a of jobApps) {
        const prof: any = appProfileMap.get(a.user_id);
        const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Applicant';
        const job = a.job_postings as any;
        const pos = job?.position || 'Position';
        const comp = job?.company_name || 'Partner Company';

        newRows.push({
          user_id: adminUserId,
          type: 'application',
          title: `💼 Job Application: ${pos}`,
          message: `${name} submitted an application for ${pos} at ${comp}.`,
          link: '/admin/jobs',
          is_read: false,
          created_at: a.applied_at || new Date().toISOString(),
        });
      }
    }

    // 4. Recent Security Incidents
    const { data: incidents } = await supabase
      .from('security_incidents')
      .select('id, incident_type, severity, description, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (incidents && incidents.length > 0) {
      for (const inc of incidents) {
        const incType = (inc.incident_type || 'Activity').replace(/_/g, ' ');
        newRows.push({
          user_id: adminUserId,
          type: 'security',
          title: `🛡️ Security Incident: ${incType.toUpperCase()}`,
          message: `Severity: ${(inc.severity || 'medium').toUpperCase()}. ${inc.description?.slice(0, 100) || 'Reported incident under investigation.'}`,
          link: '/admin/activity',
          is_read: false,
          created_at: inc.created_at || new Date().toISOString(),
        });
      }
    }

    // 5. Recent Career / Employment Updates
    const { data: empProfiles } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, employment_status, current_job_title, company_name, updated_at')
      .not('employment_status', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(3);

    if (empProfiles && empProfiles.length > 0) {
      for (const ep of empProfiles) {
        const name = `${ep.first_name || ''} ${ep.last_name || ''}`.trim() || 'Alumnus';
        newRows.push({
          user_id: adminUserId,
          type: 'employment',
          title: `💼 Career Status Update: ${name}`,
          message: `${name} reported status as "${ep.employment_status}"${ep.company_name ? ` at ${ep.company_name}` : ''}${ep.current_job_title ? ` (${ep.current_job_title})` : ''}.`,
          link: `/admin/alumni?search=${encodeURIComponent(ep.last_name || name)}`,
          is_read: false,
          created_at: ep.updated_at || new Date().toISOString(),
        });
      }
    }

    // 6. Institutional System Status
    newRows.push({
      user_id: adminUserId,
      type: 'system',
      title: '⚙️ CTU Naga Alumni Portal Online',
      message: 'All alumni registry records, graduate tracer pipelines, and institutional audit monitors are operational.',
      link: '/admin/settings',
      is_read: true,
      created_at: new Date().toISOString(),
    });

    if (newRows.length > 0) {
      await supabase.from('notifications').insert(newRows);
    }
  } catch (err) {
    console.error('Failed to seed admin initial notifications:', err);
  }
}

export default router;

