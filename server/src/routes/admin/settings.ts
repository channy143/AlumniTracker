import { Router } from 'express';
import { supabase } from '../../services/supabase';
import { AppError } from '../../middleware/errorHandler';
import { authorize } from '../../middleware/auth';
import { requireAdminSudo } from '../../middleware/sudo';
import { adminSensitiveLimiter } from '../../middleware/rateLimiter';
import { clearAdminSecurityPolicyCache } from '../../services/sessionSecurityService';
import { logAudit } from '../../services/auditLogger';
import { AuthenticatedRequest } from '../../types';
import { sendGovernanceDirectiveEmail } from '../../services/email';
import { loadRoleOverrides } from '../../services/roleOverrideService';

const router = Router();

const ROLE_LABELS: Record<string, string> = {
  admin: 'Alumni Chair',
  alumni_officer: 'Alumni Assistant',
  staff: 'Alumni Assistant (Staff)',
  registrar: 'Registrar',
};

const MODULE_LABELS: Record<string, string> = {
  alumni_management: 'Alumni Management & Verification',
  eligible_registry: 'Eligible Registry & Bulk Import',
  ojt_clearance: 'OJT & Clearance Management',
  jobs_companies: 'Job Portal & Partner Companies',
  tracer_surveys: 'Graduate Tracer Surveys (GTS)',
  announcements_events: 'Announcements & Events',
  career_analytics: 'Career Trends & Q-Pro Accreditation',
  curriculum_employer_insights: 'Curriculum & Employer Insights',
  reports_exports: 'Official Reports & Data Exports',
  audit_security: 'Audit Logs & Security Incidents',
  system_governance: 'System Settings & Role Governance',
};

const DEFAULT_SETTINGS = {
  university_name: 'CTU-Naga Extension Campus',
  tagline: 'Bridging Education to Eternity',
  logo_url: '',
  primary_color: '#003366',
  secondary_color: '#D4AF37',
  academic_year_start: 2014,
  courses: ['BEEd', 'BSEd-Math', 'BTLED', 'BIT', 'BSIT'],
  colleges: ['College of Education', 'College of Technology'],
  employment_types: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
  industries: ['Technology', 'Education', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Construction', 'Government'],
  require_admin_mfa: true,
  admin_idle_timeout_minutes: 15,
  require_sudo_for_sensitive: true,
};

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_settings')
      .maybeSingle();

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json(DEFAULT_SETTINGS);
    if (error) throw new AppError(error.message, 500);
    res.json(data?.value || DEFAULT_SETTINGS);
  } catch (err) {
    next(err);
  }
});

router.put('/', authorize('admin'), adminSensitiveLimiter, requireAdminSudo, async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'system_settings')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({ value: req.body })
        .eq('id', existing.id);
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ message: 'Settings table not available' });
      if (error) throw new AppError(error.message, 500);
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ key: 'system_settings', value: req.body });
      if (error && (error.code === '42P01' || error.code === 'PGRST205')) return res.json({ message: 'Settings table not available' });
      if (error) throw new AppError(error.message, 500);
    }

    clearAdminSecurityPolicyCache();
    logAudit(req, {
      action: 'ADMIN_SETTINGS_UPDATED',
      entity: 'settings',
      severity: 'warning',
      status: 'success',
      details: {
        require_admin_mfa: req.body?.require_admin_mfa,
        admin_idle_timeout_minutes: req.body?.admin_idle_timeout_minutes,
        require_sudo_for_sensitive: req.body?.require_sudo_for_sensitive,
      },
    });

    res.json({ message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
});

// Helper to load & save governance directives from settings table
async function loadDirectives(): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'governance_directives')
      .maybeSingle();
    return Array.isArray(data?.value) ? data.value : [];
  } catch {
    return [];
  }
}

async function saveDirectives(list: any[]): Promise<void> {
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('key', 'governance_directives')
    .maybeSingle();

  if (existing) {
    await supabase.from('settings').update({ value: list }).eq('id', existing.id);
  } else {
    await supabase.from('settings').insert({ key: 'governance_directives', value: list });
  }
}

router.get('/directives', async (_req: AuthenticatedRequest, res, next) => {
  try {
    const [directives, sysRes] = await Promise.all([
      loadDirectives(),
      supabase.from('settings').select('value').eq('key', 'system_settings').maybeSingle(),
    ]);
    const sysVal = sysRes?.data?.value || DEFAULT_SETTINGS;
    res.json({
      directives,
      role_permissions: sysVal?.role_permissions || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/directives', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      type = 'general_directive',
      targetRole,
      targetEmail,
      title,
      reason,
      documentType,
      proposedPermissions,
    } = req.body || {};

    if (!targetRole || !['admin', 'alumni_officer', 'registrar'].includes(targetRole)) {
      throw new AppError('Valid target institutional role is required', 400);
    }
    if (!reason || !String(reason).trim()) {
      throw new AppError('Please provide a reason or message for this directive', 400);
    }

    const senderId = req.user!.userId;
    const senderRole = req.user!.role || 'admin';
    const senderRoleLabel = ROLE_LABELS[senderRole] || 'Institutional Admin';

    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', senderId)
      .maybeSingle();

    const senderName =
      senderRole === 'admin'
        ? (senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : '') || 'Sheila Marie C Lopez'
        : (senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : '') || req.user!.email;

    const recipientRoleLabel = ROLE_LABELS[targetRole] || targetRole;
    const defaultTitle =
      type === 'access_delegation'
        ? `Role Access Adjustment for ${recipientRoleLabel}`
        : type === 'document_request'
        ? `Official Document Request: ${documentType || 'Institutional File'}`
        : `Governance Message from ${senderRoleLabel}`;

    const cleanTitle = (title && String(title).trim()) || defaultTitle;
    const cleanReason = String(reason).trim();

    const directive = {
      id: `dir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      senderId,
      senderEmail: req.user!.email,
      senderName,
      senderRole,
      senderRoleLabel,
      targetRole,
      recipientRoleLabel,
      targetEmail: targetEmail ? String(targetEmail).trim() : null,
      title: cleanTitle,
      reason: cleanReason,
      documentType: documentType ? String(documentType).trim() : null,
      proposedPermissions: type === 'access_delegation' && proposedPermissions ? proposedPermissions : null,
      status: 'pending',
      created_at: new Date().toISOString(),
      responded_at: null,
      responded_by: null,
      response_note: null,
    };

    const existingList = await loadDirectives();
    const updatedList = [directive, ...existingList].slice(0, 100);
    await saveDirectives(updatedList);

    // Find all active users in targetRole (include 'staff' when targetRole === 'alumni_officer' and respect role overrides)
    const targetRolesSet = new Set(targetRole === 'alumni_officer' ? ['alumni_officer', 'staff'] : [targetRole]);
    const [allUsersRes, roleOverrides] = await Promise.all([
      supabase.from('users').select('id, email, role, is_active'),
      loadRoleOverrides(),
    ]);

    const activeTargets = (allUsersRes.data || []).filter((u: any) => {
      if (u.is_active === false) return false;
      const effectiveRole = roleOverrides[u.id] || u.role;
      return targetRolesSet.has(effectiveRole);
    });
    const recipientEmails = activeTargets.map((u: any) => u.email).filter(Boolean);
    if (targetEmail && String(targetEmail).trim()) {
      recipientEmails.push(String(targetEmail).trim());
    }

    // Also check if targetEmail matches a user in DB who should get an in-app notification
    const targetUserIds = new Set(activeTargets.map((u: any) => u.id));
    if (targetEmail && String(targetEmail).trim()) {
      const { data: extraUser } = await supabase
        .from('users')
        .select('id')
        .ilike('email', String(targetEmail).trim())
        .maybeSingle();
      if (extraUser?.id) targetUserIds.add(extraUser.id);
    }

    // Create in-app notifications for all target users
    const notifTitle =
      type === 'access_delegation'
        ? `🔑 Role Access Delegation from ${senderName} (${senderRoleLabel})`
        : type === 'document_request'
        ? `📄 Document Request from ${senderName}: ${documentType || cleanTitle}`
        : `💬 Governance Directive from ${senderName}: ${cleanTitle}`;

    const notifMessage =
      type === 'access_delegation'
        ? `Reason: "${cleanReason}" — Please review and accept your updated role access permissions.`
        : type === 'document_request'
        ? `Requested: ${documentType || cleanTitle}. Note: "${cleanReason}"`
        : `"${cleanReason}"`;

    if (targetUserIds.size > 0) {
      const notifRows = Array.from(targetUserIds).map((uid) => ({
        user_id: uid,
        type: 'system',
        title: notifTitle,
        message: notifMessage,
        link: `/admin?directive=${directive.id}`,
        is_read: false,
      }));
      await supabase.from('notifications').insert(notifRows);
    }

    // Format proposed permissions summary for Gmail
    const proposedPermissionsSummary: string[] = [];
    if (type === 'access_delegation' && proposedPermissions && typeof proposedPermissions === 'object') {
      Object.entries(proposedPermissions).forEach(([modKey, lvl]) => {
        const modName = MODULE_LABELS[modKey] || modKey;
        const lvlLabel = lvl === 'full' ? 'FULL ACCESS' : lvl === 'view' ? 'VIEW ONLY' : 'RESTRICTED';
        proposedPermissionsSummary.push(`${modName}: ${lvlLabel}`);
      });
    }

    const emailResult = await sendGovernanceDirectiveEmail({
      toEmails: recipientEmails,
      recipientRoleLabel,
      senderName,
      senderRoleLabel,
      directiveType: type,
      title: cleanTitle,
      reason: cleanReason,
      documentType: directive.documentType || undefined,
      proposedPermissionsSummary,
    });

    logAudit(req, {
      action: 'GOVERNANCE_DIRECTIVE_SENT',
      entity: 'settings',
      entityId: directive.id,
      severity: 'info',
      status: 'success',
      details: {
        type,
        targetRole,
        title: cleanTitle,
        emailRecipients: emailResult.recipients,
      },
    });

    res.status(201).json({
      directive,
      notifiedUsers: targetUserIds.size,
      emailSent: emailResult.sent,
      emailRecipients: emailResult.recipients,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/directives/:id/respond', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { action, responseNote } = req.body || {};
    if (!['accepted', 'fulfilled', 'declined'].includes(action)) {
      throw new AppError('Action must be accepted, fulfilled, or declined', 400);
    }

    const list = await loadDirectives();
    const idx = list.findIndex((d: any) => d.id === req.params.id);
    if (idx === -1) {
      throw new AppError('Governance directive not found', 404);
    }

    const directive = list[idx];
    const responderId = req.user!.userId;
    const { data: responderProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', responderId)
      .maybeSingle();
    const responderName =
      (responderProfile ? `${responderProfile.first_name || ''} ${responderProfile.last_name || ''}`.trim() : '') ||
      req.user!.email;

    directive.status = action;
    directive.responded_at = new Date().toISOString();
    directive.responded_by = responderName;
    directive.response_note = responseNote ? String(responseNote).trim() : null;

    list[idx] = directive;
    await saveDirectives(list);

    // If this is an access_delegation and the recipient ACCEPTED it, apply proposedPermissions to system_settings!
    if (directive.type === 'access_delegation' && action === 'accepted' && directive.proposedPermissions) {
      const { data: existingSys } = await supabase
        .from('settings')
        .select('id, value')
        .eq('key', 'system_settings')
        .maybeSingle();

      const currentSys = existingSys?.value || { ...DEFAULT_SETTINGS };
      const nextSys = {
        ...currentSys,
        role_permissions: {
          ...(currentSys.role_permissions || {}),
          [directive.targetRole]: directive.proposedPermissions,
        },
      };

      if (existingSys) {
        await supabase.from('settings').update({ value: nextSys }).eq('id', existingSys.id);
      } else {
        await supabase.from('settings').insert({ key: 'system_settings', value: nextSys });
      }
    }

    // Notify the original sender in-app
    if (directive.senderId) {
      const actionVerb =
        action === 'accepted'
          ? 'accepted the role access changes'
          : action === 'fulfilled'
          ? 'fulfilled the document request'
          : 'declined the directive';

      await supabase.from('notifications').insert({
        user_id: directive.senderId,
        type: 'system',
        title: `✅ Governance Update: ${responderName} (${directive.recipientRoleLabel}) ${actionVerb}`,
        message: `${directive.title}${directive.response_note ? ` — Note: "${directive.response_note}"` : ''}`,
        link: '/admin/settings',
        is_read: false,
      });
    }

    // Also send email confirmation to sender if available
    if (directive.senderEmail) {
      await sendGovernanceDirectiveEmail({
        toEmails: [directive.senderEmail],
        recipientRoleLabel: directive.senderRoleLabel || 'Alumni Chair',
        senderName: responderName,
        senderRoleLabel: directive.recipientRoleLabel || 'Institutional Role',
        directiveType: 'general_directive',
        title: `Directive ${action.toUpperCase()}: ${directive.title}`,
        reason: `${responderName} has ${action} your directive "${directive.title}".${
          directive.response_note ? `\n\nResponse Note: "${directive.response_note}"` : ''
        }`,
      });
    }

    logAudit(req, {
      action: 'GOVERNANCE_DIRECTIVE_RESPONDED',
      entity: 'settings',
      entityId: directive.id,
      severity: 'info',
      status: 'success',
      details: { action, responderName, directiveType: directive.type },
    });

    res.json({ directive });
  } catch (err) {
    next(err);
  }
});

export default router;

