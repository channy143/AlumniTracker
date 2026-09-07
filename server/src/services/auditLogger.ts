import { Request } from 'express';
import { supabase } from './supabase';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  details?: Record<string, any>;
  severity?: 'info' | 'warning' | 'critical';
  status?: 'success' | 'failure';
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEY_REGEX = /password|hash|token|secret|authorization|otp|cookie|credential/i;

/**
 * Recursively redacts sensitive keys from an object or array.
 */
export function sanitizeDetails(obj: any, depth = 0): any {
  if (depth > 6) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeDetails(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeDetails(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Extracts the true client IP from request, respecting proxy headers.
 */
export function extractClientIp(req?: Request | any): string {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * Centralized, secure audit logging service.
 * Appends immutable audit records with complete actor and environment context.
 */
export async function logAudit(req: Request | any | null, entry: AuditEntry): Promise<void> {
  try {
    const user = req?.user || null;
    const resolvedUserId = entry.actorId || user?.id || null;
    const resolvedActorRole = entry.actorRole || user?.role || (resolvedUserId ? 'user' : 'system');

    // Attempt to resolve display name if not explicitly provided
    let resolvedActorName = entry.actorName || user?.name || user?.email || null;
    if (!resolvedActorName && user?.first_name) {
      resolvedActorName = `${user.first_name} ${user.last_name || ''}`.trim();
    }
    if (!resolvedActorName && !resolvedUserId) {
      resolvedActorName = 'System';
    }

    const ipAddress = entry.ipAddress || (req ? extractClientIp(req) : '127.0.0.1');
    const userAgent = entry.userAgent || (req?.headers?.['user-agent'] as string) || null;

    const payload = {
      user_id: resolvedUserId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId || null,
      actor_name: resolvedActorName,
      actor_role: resolvedActorRole,
      severity: entry.severity || 'info',
      status: entry.status || 'success',
      details: sanitizeDetails(entry.details || {}),
      ip_address: ipAddress,
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) {
      console.error('[AuditLogger] Error inserting audit log:', error.message);
    }
  } catch (err: any) {
    console.error('[AuditLogger] Unexpected failure recording audit event:', err?.message || err);
  }
}
