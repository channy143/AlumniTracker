import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export type GovernanceRoleKey = 'admin' | 'alumni_officer' | 'registrar';
export type AccessLevel = 'full' | 'view' | 'none';

export const GOVERNANCE_MODULES: Array<{ key: string; label: string; desc: string }> = [
  {
    key: 'alumni_management',
    label: 'Alumni Management & Verification',
    desc: 'Approve, edit, archive, and verify alumni profiles & employment proofs',
  },
  {
    key: 'eligible_registry',
    label: 'Eligible Registry & Bulk Import',
    desc: 'Manage graduation lists, CSV/Excel bulk imports, and student ID matching',
  },
  {
    key: 'ojt_clearance',
    label: 'OJT & Clearance Management',
    desc: 'Track student internship completion and graduation clearance status',
  },
  {
    key: 'jobs_companies',
    label: 'Job Portal & Partner Companies',
    desc: 'Publish job openings, manage partner employers, and review applications',
  },
  {
    key: 'tracer_surveys',
    label: 'Graduate Tracer Surveys (GTS)',
    desc: 'Create surveys, monitor completion rates, and export survey responses',
  },
  {
    key: 'announcements_events',
    label: 'Announcements & Events',
    desc: 'Publish institutional announcements, homecoming events, and RSVPs',
  },
  {
    key: 'career_analytics',
    label: 'Career Trends & Q-Pro Accreditation',
    desc: 'View employment outcomes, PRC/LET passers, and CHED accreditation ledgers',
  },
  {
    key: 'curriculum_employer_insights',
    label: 'Curriculum & Employer Insights',
    desc: 'Evaluate curriculum competency alignment and top employer hiring performance',
  },
  {
    key: 'reports_exports',
    label: 'Official Reports & Data Exports',
    desc: 'Generate institutional CHED/Q-Pro reports and official data exports',
  },
  {
    key: 'audit_security',
    label: 'Audit Logs & Security Incidents',
    desc: 'Inspect system audit trails, suspicious activity reports, and login history',
  },
  {
    key: 'system_governance',
    label: 'System Settings & Role Governance',
    desc: 'Configure MFA/Sudo security policies and assign institutional roles',
  },
];

export const MODULE_LABELS: Record<string, string> = GOVERNANCE_MODULES.reduce(
  (acc, mod) => {
    acc[mod.key] = mod.label;
    return acc;
  },
  {} as Record<string, string>
);

export const DEFAULT_ROLE_PERMISSIONS: Record<GovernanceRoleKey, Record<string, AccessLevel>> = {
  admin: {
    alumni_management: 'full',
    eligible_registry: 'full',
    ojt_clearance: 'full',
    jobs_companies: 'full',
    tracer_surveys: 'full',
    announcements_events: 'full',
    career_analytics: 'full',
    curriculum_employer_insights: 'full',
    reports_exports: 'full',
    audit_security: 'full',
    system_governance: 'full',
  },
  alumni_officer: {
    alumni_management: 'view',
    eligible_registry: 'view',
    ojt_clearance: 'none',
    jobs_companies: 'full',
    tracer_surveys: 'full',
    announcements_events: 'full',
    career_analytics: 'full',
    curriculum_employer_insights: 'none',
    reports_exports: 'none',
    audit_security: 'none',
    system_governance: 'none',
  },
  registrar: {
    alumni_management: 'view',
    eligible_registry: 'full',
    ojt_clearance: 'none',
    jobs_companies: 'none',
    tracer_surveys: 'none',
    announcements_events: 'none',
    career_analytics: 'none',
    curriculum_employer_insights: 'none',
    reports_exports: 'full',
    audit_security: 'none',
    system_governance: 'none',
  },
};

export const DEFAULT_PROPOSED_DELEGATION_PERMS: Record<GovernanceRoleKey, Record<string, AccessLevel>> = {
  admin: { ...DEFAULT_ROLE_PERMISSIONS.admin },
  alumni_officer: {
    alumni_management: 'full',
    eligible_registry: 'full',
    ojt_clearance: 'full',
    jobs_companies: 'full',
    tracer_surveys: 'full',
    announcements_events: 'full',
    career_analytics: 'full',
    curriculum_employer_insights: 'view',
    reports_exports: 'full',
    audit_security: 'view',
    system_governance: 'none',
  },
  registrar: {
    alumni_management: 'view',
    eligible_registry: 'full',
    ojt_clearance: 'view',
    jobs_companies: 'none',
    tracer_surveys: 'view',
    announcements_events: 'none',
    career_analytics: 'view',
    curriculum_employer_insights: 'none',
    reports_exports: 'full',
    audit_security: 'none',
    system_governance: 'none',
  },
};

export function normalizeGovernanceRole(role?: string): GovernanceRoleKey {
  if (role === 'admin') return 'admin';
  if (role === 'registrar') return 'registrar';
  return 'alumni_officer';
}

export function getEffectiveRolePermissions(
  role?: string,
  savedRolePermissions?: Record<string, Record<string, AccessLevel>> | null
): Record<string, AccessLevel> {
  const roleKey = normalizeGovernanceRole(role);
  if (roleKey === 'admin') {
    return { ...DEFAULT_ROLE_PERMISSIONS.admin };
  }
  const defaults = DEFAULT_ROLE_PERMISSIONS[roleKey];
  const saved = savedRolePermissions?.[roleKey] || {};
  return {
    ...defaults,
    ...saved,
  };
}

export interface NavAccessInfo {
  level: AccessLevel;
  locked: boolean;
  moduleKey: string;
  moduleLabel: string;
}

export function getNavAccessInfo(
  href: string,
  role?: string,
  savedRolePermissions?: Record<string, Record<string, AccessLevel>> | null
): NavAccessInfo {
  const roleKey = normalizeGovernanceRole(role);
  if (roleKey === 'admin') {
    return {
      level: 'full',
      locked: false,
      moduleKey: 'all',
      moduleLabel: 'Full Institutional Governance',
    };
  }

  const perms = getEffectiveRolePermissions(role, savedRolePermissions);

  // Check exact href or prefix match
  if (href === '/admin') {
    if (roleKey === 'registrar') {
      const anyDashboardMod =
        perms.career_analytics !== 'none' ||
        perms.tracer_surveys !== 'none' ||
        perms.jobs_companies !== 'none' ||
        perms.announcements_events !== 'none';
      return {
        level: anyDashboardMod ? 'view' : 'none',
        locked: !anyDashboardMod,
        moduleKey: 'career_analytics',
        moduleLabel: 'Executive Admin Dashboard & Analytics',
      };
    }
    return {
      level: 'full',
      locked: false,
      moduleKey: 'dashboard',
      moduleLabel: 'Admin Dashboard',
    };
  }

  if (href.includes('tab=eligible') || href.startsWith('/admin/document-requests')) {
    const lvl = perms.eligible_registry || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'eligible_registry',
      moduleLabel: MODULE_LABELS.eligible_registry,
    };
  }

  if (href.startsWith('/admin/alumni')) {
    const alumLvl = perms.alumni_management || 'none';
    const eligLvl = perms.eligible_registry || 'none';
    const effectiveLvl: AccessLevel =
      alumLvl === 'full' || eligLvl === 'full'
        ? 'full'
        : alumLvl === 'view' || eligLvl === 'view'
        ? 'view'
        : 'none';
    return {
      level: effectiveLvl,
      locked: effectiveLvl === 'none',
      moduleKey: 'alumni_management',
      moduleLabel: MODULE_LABELS.alumni_management,
    };
  }

  if (href.startsWith('/admin/ojt')) {
    const lvl = perms.ojt_clearance || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'ojt_clearance',
      moduleLabel: MODULE_LABELS.ojt_clearance,
    };
  }

  if (href.startsWith('/admin/companies') || href.startsWith('/admin/jobs')) {
    const lvl = perms.jobs_companies || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'jobs_companies',
      moduleLabel: MODULE_LABELS.jobs_companies,
    };
  }

  if (href.startsWith('/admin/surveys')) {
    const lvl = perms.tracer_surveys || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'tracer_surveys',
      moduleLabel: MODULE_LABELS.tracer_surveys,
    };
  }

  if (href.startsWith('/admin/announcements') || href.startsWith('/admin/events')) {
    const lvl = perms.announcements_events || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'announcements_events',
      moduleLabel: MODULE_LABELS.announcements_events,
    };
  }

  if (href.startsWith('/admin/analytics') || href.startsWith('/admin/accreditation')) {
    const lvl = perms.career_analytics || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'career_analytics',
      moduleLabel: MODULE_LABELS.career_analytics,
    };
  }

  if (
    href.startsWith('/admin/curriculum') ||
    href.startsWith('/admin/employers') ||
    href.startsWith('/admin/employer-dashboard')
  ) {
    const lvl = perms.curriculum_employer_insights || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'curriculum_employer_insights',
      moduleLabel: MODULE_LABELS.curriculum_employer_insights,
    };
  }

  if (href.startsWith('/admin/reports')) {
    const lvl = perms.reports_exports || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'reports_exports',
      moduleLabel: MODULE_LABELS.reports_exports,
    };
  }

  if (href.startsWith('/admin/activity')) {
    const lvl = perms.audit_security || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'audit_security',
      moduleLabel: MODULE_LABELS.audit_security,
    };
  }

  if (href.startsWith('/admin/settings')) {
    const lvl = perms.system_governance || 'none';
    return {
      level: lvl,
      locked: lvl === 'none',
      moduleKey: 'system_governance',
      moduleLabel: MODULE_LABELS.system_governance,
    };
  }

  return {
    level: 'full',
    locked: false,
    moduleKey: 'general',
    moduleLabel: 'Admin Operations',
  };
}

let cachedRolePermissions: Record<string, Record<string, AccessLevel>> | null = null;

export function useRolePermissions() {
  const { user } = useAuthStore();
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, AccessLevel>> | null>(
    cachedRolePermissions
  );
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const isInstitutional = ['admin', 'alumni_officer', 'staff', 'registrar'].includes(user?.role || '');

  const refreshRolePermissions = useCallback(async () => {
    if (!user || !isInstitutional) return;
    setLoadingPermissions(true);
    try {
      const settings = await adminApi.settingsGet();
      const rp = settings?.role_permissions || null;
      cachedRolePermissions = rp;
      setRolePermissions(rp);
    } catch {
      // Keep fallback defaults on error
    } finally {
      setLoadingPermissions(false);
    }
  }, [user, isInstitutional]);

  useEffect(() => {
    refreshRolePermissions();
    const handler = () => {
      refreshRolePermissions();
    };
    window.addEventListener('governance-directives-updated', handler);
    window.addEventListener('role-permissions-updated', handler);
    return () => {
      window.removeEventListener('governance-directives-updated', handler);
      window.removeEventListener('role-permissions-updated', handler);
    };
  }, [refreshRolePermissions]);

  return {
    rolePermissions,
    loadingPermissions,
    refreshRolePermissions,
    getNavAccess: (href: string) => getNavAccessInfo(href, user?.role, rolePermissions),
    effectivePermissions: getEffectiveRolePermissions(user?.role, rolePermissions),
  };
}
