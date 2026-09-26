import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../types';
import { logAudit } from '../../services/auditLogger';

import { createNotification } from '../notifications';

const router = Router();

function clientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

// GET /api/admin/security-incidents
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, severity } = req.query;

    let query = supabase
      .from('security_incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status as string);
    }
    if (severity && severity !== 'all') {
      query = query.eq('severity', severity as string);
    }

    const { data: incidents, error } = await query;
    if (error) throw error;

    // Attach reporter user email & profile info if available
    const reporterIds = (incidents || [])
      .map((inc: any) => inc.reported_by)
      .filter(Boolean);

    let profileMap = new Map();
    if (reporterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', reporterIds);

      profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    }

    const enriched = (incidents || []).map((inc: any) => ({
      ...inc,
      reporter: profileMap.get(inc.reported_by) || null,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/security-incidents/:id
router.patch('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, severity } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updates.status = status;
      if (status === 'resolved' || status === 'dismissed') {
        updates.resolved_by = req.user!.userId;
        updates.resolved_at = new Date().toISOString();
      }
    }
    if (adminNotes !== undefined) {
      updates.admin_notes = adminNotes;
    }
    if (severity) {
      updates.severity = severity;
    }

    const { data: incident, error } = await supabase
      .from('security_incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Automatically notify the reporting alumnus that their incident has been reviewed/resolved
    if (incident?.reported_by) {
      try {
        const statusLabel = status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Updated';
        await createNotification({
          userId: incident.reported_by,
          type: 'system',
          title: `Security Report Status: ${statusLabel}`,
          message: adminNotes
            ? `Admin response: "${adminNotes}"`
            : `Your reported security incident (${(incident.incident_type || 'activity').replace(/_/g, ' ')}) is now marked as ${statusLabel}.`,
          link: '/notifications',
        });
      } catch (notifErr) {
        console.error('Failed to notify incident reporter:', notifErr);
      }
    }

    await logAudit(req, {
      actorId: req.user!.userId,
      actorName: req.user?.email || 'Administrator',
      actorRole: 'admin',
      action: 'SECURITY_INCIDENT_UPDATED',
      entity: 'security_incidents',
      entityId: id,
      details: { updates },
      severity: 'info',
      status: 'success',
    });

    res.json(incident);
  } catch (err) {
    next(err);
  }
});

export default router;
