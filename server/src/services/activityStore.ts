import { supabase } from './supabase';
import { logAudit } from './auditLogger';

interface Activity {
  id: string | number;
  user: string;
  action: string;
  target: string;
  created_at: string;
  severity?: string;
  status?: string;
}

const memoryStore: Activity[] = [];
let idCounter = 1;

export async function addActivity(userName: string, action: string, target: string) {
  const entry = { id: idCounter++, user: userName, action, target, created_at: new Date().toISOString() };
  memoryStore.unshift(entry);
  if (memoryStore.length > 50) memoryStore.length = 50;

  try {
    await supabase.from('activity_log').insert({ user_name: userName, action, target });
  } catch {
    // DB not available, in-memory fallback works
  }

  // Also record into secure audit_logs table
  await logAudit(null, {
    action: action.toUpperCase().replace(/\s+/g, '_'),
    entity: 'activity',
    actorName: userName,
    details: { actionDescription: `${userName} ${action} ${target}`, target },
    severity: 'info',
    status: 'success',
  });
}

export async function getRecentActivities(limit = 10) {
  try {
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auditData && auditData.length > 0) {
      return auditData.map((a: any) => ({
        id: a.id,
        user: a.actor_name || a.details?.new?.email || a.details?.email || 'System User',
        action: a.action,
        target: a.entity ? `${a.entity}${a.entity_id ? ` #${a.entity_id.slice(0, 8)}` : ''}` : (a.details?.target || ''),
        created_at: a.created_at,
        severity: a.severity || 'info',
        status: a.status || 'success',
      }));
    }

    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data && data.length > 0) {
      return data.map((a: any) => ({
        id: a.id,
        user: a.user_name,
        action: a.action,
        target: a.target,
        created_at: a.created_at,
      }));
    }
  } catch {
    // DB not available, fall through to memory
  }

  return memoryStore.slice(0, limit);
}
