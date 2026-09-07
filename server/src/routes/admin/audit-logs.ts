import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { sanitizeFilterInput } from '../../utils/sanitizeFilterInput';

const router = Router();

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function resolveCategory(action: string, entity: string, role?: string): string {
  const a = String(action || '').toLowerCase();
  const e = String(entity || '').toLowerCase();
  const r = String(role || '').toLowerCase();

  if (r === 'admin' || r === 'moderator' || a.startsWith('user_role') || a.startsWith('user_status') || a.includes('admin') || a.includes('settings')) return 'admin';
  if (a.startsWith('auth') || a.includes('login') || a.includes('password') || a.includes('mfa')) return 'auth';
  if (e === 'surveys' || e === 'survey' || a.includes('survey')) return 'survey';
  if (e === 'profiles' || e === 'profile' || e === 'employment' || e === 'education' || a.includes('alumni')) return 'alumni';
  if (e.includes('job') || a.includes('job')) return 'jobs';
  return 'general';
}

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string) || '';
    const action = (req.query.action as string) || '';
    const entity = (req.query.entity as string) || '';
    const severity = (req.query.severity as string) || '';
    const status = (req.query.status as string) || '';
    const category = (req.query.category as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action && action !== 'all') query = query.eq('action', action);
    if (entity && entity !== 'all') query = query.eq('entity', entity);
    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (status && status !== 'all') query = query.eq('status', status);

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) query = query.gte('created_at', fromDate.toISOString());
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) query = query.lte('created_at', toDate.toISOString());
    }

    if (search) {
      const cleanSearch = sanitizeFilterInput(search);
      query = query.or(`action.ilike.%${cleanSearch}%,entity.ilike.%${cleanSearch}%,actor_name.ilike.%${cleanSearch}%,ip_address.ilike.%${cleanSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({ data: [], total: 0, page, limit });
    }
    if (error) throw new AppError(error.message, 500);

    let result = logs || [];

    // Enrich with user email, role & profile avatar if user_id is present
    const logUserIds = [...new Set(result.map((l: any) => l.user_id || l.details?.user_id).filter(Boolean))];
    if (logUserIds.length > 0) {
      const [{ data: users }, { data: profiles }] = await Promise.all([
        supabase.from('users').select('id, email, role').in('id', logUserIds),
        supabase.from('profiles').select('user_id, avatar_url, first_name, last_name').in('user_id', logUserIds),
      ]);
      const userMap = new Map((users || []).map((u: any) => [u.id, u]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      result = result.map((l: any) => {
        const uid = l.user_id || l.details?.user_id;
        const u = uid ? userMap.get(uid) : null;
        const p = uid ? profileMap.get(uid) : null;
        const profileName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : null;
        const resolvedRole = (l.actor_role || u?.role || (u?.email?.includes('admin') ? 'admin' : (l.user_id ? 'user' : 'system'))).toLowerCase();
        const resolvedName = l.actor_name || profileName || (resolvedRole === 'admin' ? 'Administrator' : u?.email || (l.user_id ? 'User' : 'System'));

        return {
          ...l,
          actor_name: resolvedName,
          actor_role: resolvedRole,
          category: resolveCategory(l.action, l.entity, resolvedRole),
          actor_email: u?.email || l.details?.email || null,
          actor_avatar: p?.avatar_url || l.details?.avatar_url || null,
          user: u || { email: null },
        };
      });
    } else {
      result = result.map((l: any) => ({
        ...l,
        actor_name: l.actor_name || (l.actor_role === 'admin' ? 'Administrator' : 'System'),
        actor_role: l.actor_role || 'system',
        category: resolveCategory(l.action, l.entity, l.actor_role),
        actor_email: l.details?.email || null,
        actor_avatar: l.details?.avatar_url || null,
      }));
    }

    // Filter by logical category in memory if requested
    if (category && category !== 'all') {
      result = result.filter((l: any) => {
        if (category === 'admin') {
          return l.actor_role === 'admin' || l.actor_role === 'moderator' || l.category === 'admin';
        }
        return l.category === category;
      });
    }

    res.json({ data: result, total: count || 0, page, limit });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const { data: allLogs, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity, severity, status, actor_role, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return res.json({
        totalEvents: 0,
        securityAlerts: 0,
        failedEvents: 0,
        adminActions: 0,
        todayCount: 0,
        severityDistribution: { info: 0, warning: 0, critical: 0 },
        categoryDistribution: { auth: 0, admin: 0, alumni: 0, survey: 0, jobs: 0, general: 0 },
      });
    }
    if (error) throw new AppError(error.message, 500);

    const logs = allLogs || [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let securityAlerts = 0;
    let failedEvents = 0;
    let adminActions = 0;
    let todayCount = 0;

    const severityDistribution: Record<string, number> = { info: 0, warning: 0, critical: 0 };
    const categoryDistribution: Record<string, number> = { auth: 0, admin: 0, alumni: 0, survey: 0, jobs: 0, general: 0 };

    const logUserIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
    let userRoleMap = new Map();
    if (logUserIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, role, email').in('id', logUserIds);
      userRoleMap = new Map((users || []).map((u: any) => [u.id, u]));
    }

    logs.forEach((l: any) => {
      const u = l.user_id ? userRoleMap.get(l.user_id) : null;
      const resolvedRole = (l.actor_role || u?.role || (u?.email?.includes('admin') ? 'admin' : (l.user_id ? 'user' : 'system'))).toLowerCase();
      const sev = (l.severity || 'info').toLowerCase();
      if (sev === 'warning' || sev === 'critical') securityAlerts++;
      if (l.status === 'failure') failedEvents++;
      if (resolvedRole === 'admin' || resolvedRole === 'moderator') adminActions++;

      const logTime = new Date(l.created_at).getTime();
      if (logTime >= startOfToday) todayCount++;

      severityDistribution[sev] = (severityDistribution[sev] || 0) + 1;

      const cat = resolveCategory(l.action, l.entity, resolvedRole);
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    res.json({
      totalEvents: logs.length,
      securityAlerts,
      failedEvents,
      adminActions,
      todayCount,
      severityDistribution,
      categoryDistribution,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const search = (req.query.search as string) || '';
    const severity = (req.query.severity as string) || '';
    const status = (req.query.status as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (severity && severity !== 'all') query = query.eq('severity', severity);
    if (status && status !== 'all') query = query.eq('status', status);
    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) query = query.lte('created_at', new Date(to).toISOString());
    if (search) {
      const cleanSearch = sanitizeFilterInput(search);
      query = query.or(`action.ilike.%${cleanSearch}%,entity.ilike.%${cleanSearch}%,actor_name.ilike.%${cleanSearch}%,ip_address.ilike.%${cleanSearch}%`);
    }

    const { data: logs, error } = await query;
    if (error) throw new AppError(error.message, 500);

    const rows = logs || [];
    const headers = [
      'Timestamp (UTC)',
      'Severity',
      'Status',
      'Action',
      'Entity',
      'Entity ID',
      'Actor Name',
      'Actor Role',
      'IP Address',
      'User Agent',
      'Event Details',
    ];

    const csvLines = [headers.join(',')];
    rows.forEach((r: any) => {
      csvLines.push([
        escapeCsv(r.created_at),
        escapeCsv(r.severity || 'info'),
        escapeCsv(r.status || 'success'),
        escapeCsv(r.action),
        escapeCsv(r.entity),
        escapeCsv(r.entity_id || ''),
        escapeCsv(r.actor_name || 'System'),
        escapeCsv(r.actor_role || 'user'),
        escapeCsv(r.ip_address || '127.0.0.1'),
        escapeCsv(r.user_agent || ''),
        escapeCsv(r.details || {}),
      ].join(','));
    });

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

export default router;
