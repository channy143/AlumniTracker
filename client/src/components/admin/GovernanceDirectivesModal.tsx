import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi, notificationsApi, authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { resolveNotificationLink } from '@/utils/notificationHelpers';
import {
  MODULE_LABELS,
  DEFAULT_PROPOSED_DELEGATION_PERMS as DEFAULT_PROPOSED_PERMS,
  GovernanceRoleKey,
  AccessLevel,
} from '@/utils/rolePermissions';
import {
  XMarkIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  KeyIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const ALL_GOVERNANCE_ROLES: Array<{
  value: GovernanceRoleKey;
  label: string;
  shortLabel: string;
}> = [
  {
    value: 'admin',
    label: 'Alumni Chair (Sheila Marie C Lopez)',
    shortLabel: 'Alumni Chair',
  },
  {
    value: 'alumni_officer',
    label: 'Alumni Assistant (Officer / Staff)',
    shortLabel: 'Alumni Assistant',
  },
  {
    value: 'registrar',
    label: "Registrar's Office",
    shortLabel: 'Registrar',
  },
];

const ROLE_RESPONSIBILITIES: Record<string, string> = {
  alumni_officer:
    'Coordinate Graduate Tracer Surveys (GTS), verify alumni employment records, manage job postings & partner employers, and publish institutional announcements & events.',
  registrar:
    'Manage official graduation lists, perform bulk CSV/Excel imports of eligible alumni, verify graduate records, and export official graduation ledgers.',
  staff:
    'Assist in general alumni management, profile verification, and institutional operations.',
  admin:
    'Full institutional governance, security configuration, audit logs, and role assignments.',
};

const DOCUMENT_OPTIONS = [
  'Eligible Alumni Graduation Masterlist (CSV/Excel)',
  'Verified Graduate Registry Ledger',
  'PRC / LET Board Passers Accreditation File',
  'Q-Pro Career Analytics & Employment Report',
  'Official Commencement / Registrar Certification',
];

interface GovernanceDirectivesModalProps {
  notifications: any[];
  unreadCount: number;
  onRefreshNotifications: () => void;
}

export default function GovernanceDirectivesModal({
  notifications,
  unreadCount,
  onRefreshNotifications,
}: GovernanceDirectivesModalProps) {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const addNotification = useUIStore((s) => s.addNotification);

  const isInstitutionalRole =
    user?.role === 'admin' ||
    user?.role === 'alumni_officer' ||
    user?.role === 'staff' ||
    user?.role === 'registrar';

  const normalizedMyRole: GovernanceRoleKey | null =
    user?.role === 'admin'
      ? 'admin'
      : user?.role === 'alumni_officer' || user?.role === 'staff'
      ? 'alumni_officer'
      : user?.role === 'registrar'
      ? 'registrar'
      : null;

  // Counterpart roles strictly exclude the currently logged-in user's own role
  const counterpartRoles = useMemo(
    () => ALL_GOVERNANCE_ROLES.filter((r) => r.value !== normalizedMyRole),
    [normalizedMyRole]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'inbox' | 'history' | 'compose'>('inbox');
  const [directives, setDirectives] = useState<any[]>([]);
  const [loadingDirectives, setLoadingDirectives] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});

  // Role Appointment Offer & 6-Digit PIN Switch state (for Alumni appointed to institutional roles)
  const [roleAppointment, setRoleAppointment] = useState<{
    pendingOffer: {
      offeredRole: string;
      offeredRoleLabel: string;
      offeredBy: string;
      created_at: string;
    } | null;
    acceptedRole: string | null;
    acceptedRoleLabel: string | null;
    hasPin: boolean;
  } | null>(null);
  const [showRoleOfferModal, setShowRoleOfferModal] = useState(false);
  const [respondingRoleOffer, setRespondingRoleOffer] = useState(false);

  // 6-Digit PIN Modal & Alumi Welcome state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirmValue, setPinConfirmValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [pinWelcomeData, setPinWelcomeData] = useState<{
    role: string;
    roleLabel: string;
    firstTimeSetup: boolean;
  } | null>(null);

  // Inbox & History filter states
  const [inboxRoleFilter, setInboxRoleFilter] = useState<string>('');
  const [inboxTypeFilter, setInboxTypeFilter] = useState<string>('');
  const [historyRoleFilter, setHistoryRoleFilter] = useState<string>('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('');

  // Alumi proactive popup state
  const [dismissedAlumiIds, setDismissedAlumiIds] = useState<string[]>([]);
  const [alumiVisible, setAlumiVisible] = useState(true);

  // Compose form state
  const defaultTargetRole: GovernanceRoleKey =
    counterpartRoles[0]?.value || (normalizedMyRole === 'admin' ? 'alumni_officer' : 'admin');

  const [composeForm, setComposeForm] = useState({
    type: 'document_request' as 'access_delegation' | 'document_request' | 'general_directive',
    targetRole: defaultTargetRole,
    targetEmail: '',
    documentType: DOCUMENT_OPTIONS[0],
    title: '',
    reason: '',
  });
  const [composePerms, setComposePerms] = useState<Record<string, AccessLevel>>(
    DEFAULT_PROPOSED_PERMS[defaultTargetRole]
  );
  const [sendingDirective, setSendingDirective] = useState(false);

  const fetchRoleAppointment = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authApi.getRoleAppointment();
      setRoleAppointment(res);
    } catch {
      // Ignore silent background errors
    }
  }, [user]);

  useEffect(() => {
    fetchRoleAppointment();
  }, [fetchRoleAppointment, unreadCount]);

  // Ensure targetRole in composeForm is NEVER the logged-in user's own role
  useEffect(() => {
    if (!normalizedMyRole) return;
    if (composeForm.targetRole === normalizedMyRole) {
      const nextTarget = counterpartRoles[0]?.value || (normalizedMyRole === 'admin' ? 'alumni_officer' : 'admin');
      setComposeForm((f) => ({ ...f, targetRole: nextTarget }));
      setComposePerms(DEFAULT_PROPOSED_PERMS[nextTarget]);
    }
  }, [normalizedMyRole, composeForm.targetRole, counterpartRoles]);

  useEffect(() => {
    if (inboxRoleFilter && inboxRoleFilter === normalizedMyRole) setInboxRoleFilter('');
    if (historyRoleFilter && historyRoleFilter === normalizedMyRole) setHistoryRoleFilter('');
  }, [normalizedMyRole, inboxRoleFilter, historyRoleFilter]);

  const fetchDirectives = useCallback(async () => {
    if (!user || !isInstitutionalRole) return;
    setLoadingDirectives(true);
    try {
      const res = await adminApi.directivesList();
      setDirectives(Array.isArray(res?.directives) ? res.directives : []);
    } catch {
      // Ignore silent background errors
    } finally {
      setLoadingDirectives(false);
    }
  }, [user, isInstitutionalRole]);

  useEffect(() => {
    fetchDirectives();
  }, [fetchDirectives, unreadCount]);

  // Listen for URL ?directive= or ?role_offer=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('directive')) {
      setIsOpen(true);
      setModalTab('inbox');
      fetchDirectives();
    }
    if (params.get('role_offer')) {
      fetchRoleAppointment().then(() => setShowRoleOfferModal(true));
    }
  }, [location.search, fetchDirectives, fetchRoleAppointment]);

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.tab) setModalTab(detail.tab);
      if (detail?.targetRole && detail.targetRole !== normalizedMyRole) {
        setComposeForm((f) => ({ ...f, targetRole: detail.targetRole }));
        setComposePerms(DEFAULT_PROPOSED_PERMS[detail.targetRole as GovernanceRoleKey] || DEFAULT_PROPOSED_PERMS.alumni_officer);
      }
      if (detail?.type) {
        setComposeForm((f) => ({ ...f, type: detail.type }));
      }
      if (detail?.prefillTitle) {
        setComposeForm((f) => ({ ...f, title: detail.prefillTitle }));
      }
      if (detail?.prefillReason) {
        setComposeForm((f) => ({ ...f, reason: detail.prefillReason }));
      }
      setIsOpen(true);
      fetchDirectives();
    };

    const handleOpenRoleOffer = () => {
      fetchRoleAppointment().then(() => setShowRoleOfferModal(true));
    };

    const handleOpenPinModal = () => {
      setPinValue('');
      setPinConfirmValue('');
      setPinError('');
      setPinWelcomeData(null);
      fetchRoleAppointment().then(() => setShowPinModal(true));
    };

    window.addEventListener('open-governance-directives', handleOpenEvent);
    window.addEventListener('open-role-appointment-offer', handleOpenRoleOffer);
    window.addEventListener('open-admin-pin-modal', handleOpenPinModal);
    return () => {
      window.removeEventListener('open-governance-directives', handleOpenEvent);
      window.removeEventListener('open-role-appointment-offer', handleOpenRoleOffer);
      window.removeEventListener('open-admin-pin-modal', handleOpenPinModal);
    };
  }, [fetchDirectives, fetchRoleAppointment, normalizedMyRole]);

  const normalizeDirectiveRole = (r?: string): GovernanceRoleKey => {
    if (r === 'admin') return 'admin';
    if (r === 'registrar') return 'registrar';
    return 'alumni_officer';
  };

  const matchesRoleFilter = (d: any, roleFilter: string) => {
    if (!roleFilter) return true;
    const senderNorm = normalizeDirectiveRole(d.senderRole);
    const targetNorm = normalizeDirectiveRole(d.targetRole);
    return senderNorm === roleFilter || targetNorm === roleFilter;
  };

  const pendingDirectives = useMemo(
    () => directives.filter((d) => d.status === 'pending'),
    [directives]
  );

  const historyDirectives = useMemo(
    () => directives.filter((d) => d.status !== 'pending'),
    [directives]
  );

  const filteredInboxDirectives = useMemo(
    () =>
      pendingDirectives.filter((d) => {
        if (!matchesRoleFilter(d, inboxRoleFilter)) return false;
        if (inboxTypeFilter && d.type !== inboxTypeFilter) return false;
        return true;
      }),
    [pendingDirectives, inboxRoleFilter, inboxTypeFilter]
  );

  const filteredHistoryDirectives = useMemo(
    () =>
      directives.filter((d) => {
        if (!matchesRoleFilter(d, historyRoleFilter)) return false;
        if (historyTypeFilter && d.type !== historyTypeFilter) return false;
        if (historyStatusFilter) {
          if (d.status !== historyStatusFilter) return false;
        }
        return true;
      }),
    [directives, historyRoleFilter, historyTypeFilter, historyStatusFilter]
  );

  // Re-show Alumi when a pending role offer, pending directive, or unread notification arrives
  const myPendingDirectives = pendingDirectives.filter(
    (d) => d.targetRole === normalizedMyRole || normalizedMyRole === 'admin'
  );
  const directPendingForMyRole = pendingDirectives.filter(
    (d) => d.targetRole === normalizedMyRole
  );
  const latestUnreadNotif = notifications.find((n) => !n.is_read) || null;

  const activeAlumiRoleOffer =
    roleAppointment?.pendingOffer &&
    !dismissedAlumiIds.includes(`role-offer-${roleAppointment.pendingOffer.created_at}`)
      ? roleAppointment.pendingOffer
      : null;

  const activeAlumiDirective =
    !activeAlumiRoleOffer &&
    directPendingForMyRole.find((d) => !dismissedAlumiIds.includes(String(d.id)))
      ? directPendingForMyRole.find((d) => !dismissedAlumiIds.includes(String(d.id)))
      : null;

  const activeAlumiNotif =
    !activeAlumiRoleOffer &&
    !activeAlumiDirective &&
    latestUnreadNotif &&
    !dismissedAlumiIds.includes(`notif-${latestUnreadNotif.id}`)
      ? latestUnreadNotif
      : null;

  useEffect(() => {
    if (activeAlumiRoleOffer || activeAlumiDirective || activeAlumiNotif) {
      setAlumiVisible(true);
    }
  }, [activeAlumiRoleOffer?.created_at, activeAlumiDirective?.id, activeAlumiNotif?.id]);

  const handleRespondRoleOffer = async (action: 'accept' | 'decline') => {
    setRespondingRoleOffer(true);
    try {
      const res = await authApi.respondRoleAppointment(action);
      if (action === 'accept') {
        addNotification(
          `You are now appointed as ${res.roleLabel || 'Institutional Role'}! Open your top-right profile menu to "Switch to Admin Dashboard".`,
          'success'
        );
      } else {
        addNotification('Institutional role appointment declined.', 'info');
      }
      setShowRoleOfferModal(false);
      await fetchRoleAppointment();
      onRefreshNotifications();
      window.dispatchEvent(new CustomEvent('role-appointment-updated'));
    } catch (err: any) {
      addNotification(err?.message || 'Failed to respond to role appointment', 'error');
    } finally {
      setRespondingRoleOffer(false);
    }
  };

  const enterAdminDashboardAfterPin = useCallback(
    (role: string) => {
      sessionStorage.setItem('ctu_active_portal_mode', 'admin');
      if (user) {
        setUser({ ...user, role: role as any });
      }
      setShowPinModal(false);
      setPinWelcomeData(null);
      navigate(role === 'registrar' ? '/admin/alumni?tab=eligible' : '/admin');
    },
    [user, setUser, navigate]
  );

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    const cleanPin = pinValue.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPinError('Please enter a 6-digit numeric PIN.');
      return;
    }
    if (!roleAppointment?.hasPin) {
      const cleanConfirm = pinConfirmValue.replace(/\D/g, '');
      if (cleanPin !== cleanConfirm) {
        setPinError('Your 6-digit PIN and confirmation PIN do not match.');
        return;
      }
    }

    setVerifyingPin(true);
    try {
      const res = await authApi.verifyAdminPin(cleanPin);
      setPinWelcomeData({
        role: res.role,
        roleLabel: res.roleLabel,
        firstTimeSetup: res.firstTimeSetup,
      });
      await fetchRoleAppointment();
      window.dispatchEvent(new CustomEvent('role-appointment-updated'));
      setTimeout(() => {
        enterAdminDashboardAfterPin(res.role);
      }, 1600);
    } catch (err: any) {
      setPinError(err?.message || 'Invalid 6-digit PIN. Please try again.');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleRespondDirective = async (directiveId: string, action: 'accepted' | 'fulfilled' | 'declined') => {
    setRespondingId(directiveId);
    try {
      await adminApi.directiveRespond(directiveId, {
        action,
        responseNote: responseNotes[directiveId] || '',
      });
      addNotification(
        action === 'accepted'
          ? 'Role access changes accepted and activated!'
          : action === 'fulfilled'
          ? 'Document request marked as fulfilled!'
          : 'Directive declined.',
        'success'
      );
      await fetchDirectives();
      onRefreshNotifications();
      window.dispatchEvent(new CustomEvent('governance-directives-updated'));
    } catch (err: any) {
      addNotification(err?.message || 'Failed to respond to directive', 'error');
    } finally {
      setRespondingId(null);
    }
  };

  const handleSendDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.reason.trim()) {
      addNotification('Please provide a reason or message.', 'warning');
      return;
    }
    if (composeForm.targetRole === normalizedMyRole) {
      addNotification('Please select a counterpart role different from your own.', 'warning');
      return;
    }
    setSendingDirective(true);
    try {
      const res = await adminApi.directiveCreate({
        type: composeForm.type,
        targetRole: composeForm.targetRole,
        targetEmail: composeForm.targetEmail.trim() || undefined,
        title: composeForm.title.trim() || undefined,
        reason: composeForm.reason.trim(),
        documentType: composeForm.type === 'document_request' ? composeForm.documentType : undefined,
        proposedPermissions: composeForm.type === 'access_delegation' ? composePerms : undefined,
      });
      addNotification(
        res.emailSent
          ? `Directive sent & Gmail delivered to ${res.emailRecipients.join(', ')}!`
          : 'Governance directive sent to role notification inbox!',
        'success'
      );
      setComposeForm((f) => ({ ...f, title: '', reason: '' }));
      setModalTab('inbox');
      await fetchDirectives();
      onRefreshNotifications();
      window.dispatchEvent(new CustomEvent('governance-directives-updated'));
    } catch (err: any) {
      addNotification(err?.message || 'Failed to send governance directive', 'error');
    } finally {
      setSendingDirective(false);
    }
  };

  const renderDirectiveCard = (d: any) => {
    const isPending = d.status === 'pending';
    const canRespond =
      isPending &&
      (d.targetRole === normalizedMyRole || normalizedMyRole === 'admin');
    const isResponding = respondingId === d.id;

    return (
      <div
        key={d.id}
        className={`rounded-xl border p-4 space-y-2.5 transition-all ${
          isPending
            ? 'border-orange-200 bg-orange-50/30 shadow-2xs'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                d.type === 'access_delegation'
                  ? 'bg-purple-100 text-purple-800'
                  : d.type === 'document_request'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {d.type === 'access_delegation' ? (
                <>
                  <KeyIcon className="w-3 h-3" />
                  <span>Role Access Delegation</span>
                </>
              ) : d.type === 'document_request' ? (
                <>
                  <DocumentTextIcon className="w-3 h-3" />
                  <span>Official Document Request</span>
                </>
              ) : (
                <>
                  <ChatBubbleLeftRightIcon className="w-3 h-3" />
                  <span>Governance Directive</span>
                </>
              )}
            </span>
            <span className="text-[11px] text-gray-500">
              From <strong className="text-gray-800">{d.senderName}</strong> ({d.senderRoleLabel}) &rarr;{' '}
              <strong className="text-gray-800">{d.recipientRoleLabel}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {d.created_at && (
              <span className="text-[10px] text-gray-400">
                {new Date(d.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                d.status === 'accepted' || d.status === 'fulfilled'
                  ? 'bg-emerald-100 text-emerald-800'
                  : d.status === 'declined'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {d.status === 'accepted' ? (
                <>
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>Accepted &amp; Active</span>
                </>
              ) : d.status === 'fulfilled' ? (
                <>
                  <CheckCircleIcon className="w-3 h-3" />
                  <span>Fulfilled</span>
                </>
              ) : d.status === 'declined' ? (
                <span>Declined</span>
              ) : (
                <>
                  <ClockIcon className="w-3 h-3" />
                  <span>Pending Acceptance</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-900">{d.title}</p>
          <p className="text-xs text-gray-700 mt-1 whitespace-pre-line bg-white/80 border border-gray-100 rounded-lg p-2.5">
            "{d.reason}"
          </p>
        </div>

        {d.type === 'document_request' && d.documentType && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 rounded-lg px-3 py-2">
            <div className="text-xs text-emerald-900">
              <span className="font-semibold">Requested File:</span> {d.documentType}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/alumni?tab=eligible');
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              <span>Open Eligible Alumni / Bulk Import</span>
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {d.type === 'access_delegation' && d.proposedPermissions && (
          <div className="bg-purple-50/60 border border-purple-100 rounded-lg p-2.5 space-y-1.5">
            <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
              Proposed Role Access Changes (Applied upon Acceptance)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {Object.entries(d.proposedPermissions).map(([modKey, lvl]) => (
                <div
                  key={modKey}
                  className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded border border-purple-100"
                >
                  <span className="text-gray-700 truncate pr-2">
                    {MODULE_LABELS[modKey] || modKey}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      lvl === 'full'
                        ? 'bg-emerald-100 text-emerald-800'
                        : lvl === 'view'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {lvl === 'full' ? 'Full' : lvl === 'view' ? 'View' : 'Restricted'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {d.responded_by && (
          <p className="text-[11px] text-gray-500">
            Responded by <strong className="text-gray-700">{d.responded_by}</strong> on{' '}
            {new Date(d.responded_at).toLocaleString()}
            {d.response_note ? ` — "${d.response_note}"` : ''}
          </p>
        )}

        {canRespond && (
          <div className="pt-2 border-t border-gray-200/70 space-y-2">
            <input
              type="text"
              value={responseNotes[d.id] || ''}
              onChange={(e) =>
                setResponseNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
              }
              placeholder="Optional note or confirmation message back to sender..."
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-orange-500"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isResponding}
                onClick={() => handleRespondDirective(d.id, 'declined')}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={isResponding}
                onClick={() =>
                  handleRespondDirective(
                    d.id,
                    d.type === 'document_request' ? 'fulfilled' : 'accepted'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>
                  {isResponding
                    ? 'Processing...'
                    : d.type === 'access_delegation'
                    ? 'Accept Role Access Changes'
                    : d.type === 'document_request'
                    ? 'Acknowledge & Mark Fulfilled'
                    : 'Acknowledge Directive'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const dismissCurrentAlumi = () => {
    if (activeAlumiRoleOffer) {
      setDismissedAlumiIds((prev) => [...prev, `role-offer-${activeAlumiRoleOffer.created_at}`]);
    } else if (activeAlumiDirective) {
      setDismissedAlumiIds((prev) => [...prev, String(activeAlumiDirective.id)]);
    } else if (activeAlumiNotif) {
      setDismissedAlumiIds((prev) => [...prev, `notif-${activeAlumiNotif.id}`]);
    }
    setAlumiVisible(false);
  };

  return (
    <>
      {/* Alumi Mascot Scene (Same visualization as Onboarding Tutorial AlumiIntroScene) */}
      {alumiVisible && (activeAlumiRoleOffer || activeAlumiDirective) && !showRoleOfferModal && !isOpen && (
        <div className="fixed inset-0 z-[100000] overflow-hidden">
          {/* Soft dimmed backdrop */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] transition-opacity cursor-pointer"
            onClick={dismissCurrentAlumi}
          />

          {/* Main Alumi + Speech Bubble presentation docked in bottom-left */}
          <div className="fixed bottom-0 left-3 sm:left-6 md:left-10 z-[100001] flex flex-col md:flex-row items-center md:items-end gap-3 sm:gap-6 max-w-[calc(100vw-24px)] md:max-w-2xl select-none pointer-events-auto">
            {/* 1. Alumi Mascot Graphic (Pops up FIRST) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.4, y: 120 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 20,
                delay: 0.08,
              }}
              className="relative shrink-0 order-2 md:order-1 -mb-2 sm:-mb-3 md:-mb-4 origin-bottom"
            >
              <img
                src="/image/mascot.png"
                alt="Alumi the CTU-Naga Mascot"
                className="w-44 sm:w-56 md:w-68 lg:w-80 h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.45)] select-none pointer-events-none"
              />
              {/* Subtle glowing halo beneath Alumi */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-36 sm:w-48 h-8 bg-orange-500/30 rounded-full blur-xl pointer-events-none"
              />
            </motion.div>

            {/* 2. Speech Bubble Modal (Solid white background, pops up SECOND following mascot) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                delay: 0.36,
              }}
              className="order-1 md:order-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border-2 border-orange-200 relative text-left mb-2 md:mb-10 w-full md:max-w-md origin-bottom md:origin-bottom-left"
            >
              {/* Speech bubble tail on desktop (pointing left toward Alumi) */}
              <div className="hidden md:block absolute -left-3 bottom-12 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent z-10" />
              <div className="hidden md:block absolute -left-4 bottom-12 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-orange-200 border-b-[10px] border-b-transparent" />

              {/* Speech bubble tail on mobile (pointing down toward Alumi) */}
              <div className="md:hidden absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[10px] border-t-white border-r-[8px] border-r-transparent z-10" />
              <div className="md:hidden absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-orange-200 border-r-[10px] border-r-transparent" />

              {/* Header Row: Badge & Close */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-900 border border-orange-200">
                  <SparklesIcon className="w-3.5 h-3.5 text-orange-600" />
                  {activeAlumiRoleOffer
                    ? 'Alumi · Institutional Role Appointment'
                    : 'Alumi · Institutional Governance Alert'}
                </span>

                <button
                  type="button"
                  onClick={dismissCurrentAlumi}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Dismiss for now"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {activeAlumiRoleOffer ? (
                <>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug mb-2">
                    A new institutional role was added to your account! 🎖️
                  </h2>
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
                    <p>
                      Hi! <strong className="text-orange-600 font-extrabold">{activeAlumiRoleOffer.offeredBy}</strong> has appointed you as{' '}
                      <strong className="text-purple-700 font-extrabold">{activeAlumiRoleOffer.offeredRoleLabel}</strong>!
                    </p>
                    <p className="text-gray-600 text-[11px] sm:text-xs">
                      Check your new role details and accept the appointment to unlock the{' '}
                      <strong>"Switch to Admin Dashboard"</strong> button in your profile menu.
                    </p>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={dismissCurrentAlumi}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg shrink-0"
                    >
                      Later
                    </button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowRoleOfferModal(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                    >
                      <span>Review &amp; Accept Role</span>
                      <ArrowRightIcon className="w-4 h-4 shrink-0" />
                    </motion.button>
                  </div>
                </>
              ) : activeAlumiDirective ? (
                <>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug mb-2">
                    {activeAlumiDirective.type === 'access_delegation'
                      ? 'Role Access Update from the Alumni Chair! 🔑'
                      : activeAlumiDirective.type === 'document_request'
                      ? 'Official Document Request Received! 📄'
                      : 'New Governance Directive Received! 💬'}
                  </h2>
                  <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
                    <p>
                      <strong className="text-orange-600 font-extrabold">{activeAlumiDirective.senderName}</strong> ({activeAlumiDirective.senderRoleLabel}) sent you:
                    </p>
                    <p className="text-gray-700 text-xs bg-orange-50/70 border border-orange-200/80 rounded-xl p-2.5 italic">
                      "{activeAlumiDirective.reason}"
                    </p>
                  </div>
                  <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={dismissCurrentAlumi}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg shrink-0"
                    >
                      Later
                    </button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setIsOpen(true);
                        setModalTab('inbox');
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25 hover:shadow-orange-500/35 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
                    >
                      <span>
                        {activeAlumiDirective.type === 'access_delegation'
                          ? 'Review & Accept Access'
                          : 'View & Respond'}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 shrink-0" />
                    </motion.button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        </div>
      )}

      {/* Modal 1: Institutional Role Appointment Acceptance Modal */}
      {showRoleOfferModal && roleAppointment?.pendingOffer && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !respondingRoleOffer && setShowRoleOfferModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Institutional Role Appointment</h3>
                  <p className="text-[11px] text-white/80">From {roleAppointment.pendingOffer.offeredBy}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={respondingRoleOffer}
                onClick={() => setShowRoleOfferModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 text-center space-y-4">
              <div className="flex justify-center -my-1">
                <img
                  src="/image/mascot.png"
                  alt="Alumi Mascot"
                  className="w-28 h-auto object-contain drop-shadow-md select-none"
                />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider">
                  New Role Added to Your Account
                </span>
                <h4 className="text-base font-bold text-gray-900">
                  Accept {roleAppointment.pendingOffer.offeredRoleLabel} Role?
                </h4>
                <p className="text-xs text-gray-600">
                  <strong>{roleAppointment.pendingOffer.offeredBy}</strong> has appointed your account to serve as{' '}
                  <strong className="text-purple-700">{roleAppointment.pendingOffer.offeredRoleLabel}</strong>.
                </p>
              </div>

              <div className="text-left p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                  Role Responsibilities &amp; Access
                </p>
                <p className="text-xs text-purple-950/85 leading-relaxed">
                  {ROLE_RESPONSIBILITIES[roleAppointment.pendingOffer.offeredRole] ||
                    'Access institutional administrative tools, reports, and alumni management workflows.'}
                </p>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Once accepted, a <strong>"Switch to Admin Dashboard"</strong> button will appear in your top-right profile menu protected by a 6-digit security PIN.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={respondingRoleOffer}
                  onClick={() => handleRespondRoleOffer('decline')}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={respondingRoleOffer}
                  onClick={() => handleRespondRoleOffer('accept')}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {respondingRoleOffer ? 'Accepting...' : '✓ Accept Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: 6-Digit Security PIN & Alumi Welcome Scene ("Switch to Admin Dashboard") */}
      {showPinModal && pinWelcomeData && (
        <div className="fixed inset-0 z-[100000] overflow-hidden">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px]"
          />

          <div className="fixed bottom-0 left-3 sm:left-6 md:left-10 z-[100001] flex flex-col md:flex-row items-center md:items-end gap-3 sm:gap-6 max-w-[calc(100vw-24px)] md:max-w-2xl select-none pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.4, y: 120 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 20,
                delay: 0.05,
              }}
              className="relative shrink-0 order-2 md:order-1 -mb-2 sm:-mb-3 md:-mb-4 origin-bottom"
            >
              <img
                src="/image/mascot.png"
                alt="Alumi the CTU-Naga Mascot"
                className="w-44 sm:w-56 md:w-68 lg:w-80 h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.45)] select-none pointer-events-none"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-36 sm:w-48 h-8 bg-orange-500/30 rounded-full blur-xl pointer-events-none"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                delay: 0.22,
              }}
              className="order-1 md:order-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border-2 border-orange-200 relative text-left mb-2 md:mb-10 w-full md:max-w-md origin-bottom md:origin-bottom-left"
            >
              <div className="hidden md:block absolute -left-3 bottom-12 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-white border-b-[8px] border-b-transparent z-10" />
              <div className="hidden md:block absolute -left-4 bottom-12 w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-orange-200 border-b-[10px] border-b-transparent" />

              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                  ✓ 6-Digit PIN Verified
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug mb-2">
                Welcome to the Admin Dashboard! 👋
              </h2>

              <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
                <p>
                  Hi! I'm <strong className="text-orange-600 font-extrabold">Alumi</strong> — opening your{' '}
                  <strong className="text-purple-700 font-extrabold">{pinWelcomeData.roleLabel}</strong> workspace now!
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-gray-100 flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => enterAdminDashboardAfterPin(pinWelcomeData.role)}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/25 transition-all cursor-pointer"
                >
                  <span>Enter Admin Dashboard</span>
                  <ArrowRightIcon className="w-4 h-4 shrink-0" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {showPinModal && !pinWelcomeData && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !verifyingPin && setShowPinModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <LockClosedIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {roleAppointment?.hasPin
                      ? 'Enter 6-Digit Admin PIN'
                      : 'Set Up 6-Digit Admin PIN'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {roleAppointment?.acceptedRoleLabel || 'Institutional Admin'} Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={verifyingPin}
                onClick={() => setShowPinModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="p-5 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                {roleAppointment?.hasPin
                  ? `Enter your 6-digit security PIN to switch to the ${
                      roleAppointment?.acceptedRoleLabel || 'Admin'
                    } Dashboard.`
                  : `First-time setup: please create a 6-digit numeric security PIN for your ${
                      roleAppointment?.acceptedRoleLabel || 'Admin'
                    } Dashboard access.`}
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {roleAppointment?.hasPin ? '6-Digit Security PIN' : 'Create 6-Digit PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-500"
                  required
                />
              </div>

              {!roleAppointment?.hasPin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Confirm 6-Digit PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinConfirmValue}
                    onChange={(e) => setPinConfirmValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono text-lg font-bold border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-purple-500"
                    required
                  />
                </div>
              )}

              {pinError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  {pinError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={verifyingPin}
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 px-3.5 py-2.5 text-xs font-semibold bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingPin || pinValue.length !== 6}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {verifyingPin
                    ? 'Verifying...'
                    : roleAppointment?.hasPin
                    ? 'Unlock Dashboard'
                    : 'Save PIN & Enter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Governance Directives & Inter-Role Communication Modal */}
      {isOpen && isInstitutionalRole && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    Institutional Role Communications &amp; Access Directives
                  </h3>
                  <p className="text-xs text-white/80">
                    Logged in as{' '}
                    <strong className="text-white">
                      {ALL_GOVERNANCE_ROLES.find((r) => r.value === normalizedMyRole)?.shortLabel || 'Institutional Role'}
                    </strong>{' '}
                    · Coordinate with{' '}
                    {counterpartRoles.map((r) => r.shortLabel).join(' & ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-5 bg-gray-50/70 gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalTab('inbox')}
                className={`py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'inbox'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>Pending Inbox</span>
                {pendingDirectives.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                    {pendingDirectives.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('history')}
                className={`py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'history'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <ClockIcon className="w-3.5 h-3.5" />
                <span>History &amp; Audit Log</span>
                {historyDirectives.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold">
                    {historyDirectives.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setModalTab('compose')}
                className={`py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  modalTab === 'compose'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <PaperAirplaneIcon className="w-3.5 h-3.5" />
                <span>Send Directive / Request File</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {modalTab === 'inbox' ? (
                <>
                  {/* Inbox Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200/80 rounded-xl p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FunnelIcon className="w-3.5 h-3.5 text-gray-400 ml-1 mr-0.5" />
                      <button
                        type="button"
                        onClick={() => setInboxRoleFilter('')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          inboxRoleFilter === ''
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        All Roles
                      </button>
                      {counterpartRoles.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setInboxRoleFilter(r.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            inboxRoleFilter === r.value
                              ? 'bg-orange-600 text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {r.shortLabel}
                        </button>
                      ))}
                    </div>

                    <select
                      value={inboxTypeFilter}
                      onChange={(e) => setInboxTypeFilter(e.target.value)}
                      className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500"
                    >
                      <option value="">All Action Types</option>
                      <option value="access_delegation">Role Access Delegations</option>
                      <option value="document_request">Document / File Requests</option>
                      <option value="general_directive">Governance Messages</option>
                    </select>
                  </div>

                  {loadingDirectives ? (
                    <div className="py-10 text-center text-xs text-gray-500">
                      Loading pending directives...
                    </div>
                  ) : filteredInboxDirectives.length === 0 ? (
                    <div className="py-10 text-center space-y-2.5">
                      <p className="text-xs text-gray-500">
                        {pendingDirectives.length === 0
                          ? 'No pending role directives or document requests requiring action.'
                          : 'No pending directives match the selected role/action filter.'}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {directives.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setModalTab('history')}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                          >
                            View History ({directives.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setModalTab('compose')}
                          className="px-3.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hover:bg-orange-100 cursor-pointer"
                        >
                          + Send New Directive or File Request
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredInboxDirectives.map((d) => renderDirectiveCard(d))}
                    </div>
                  )}
                </>
              ) : modalTab === 'history' ? (
                <>
                  {/* History Filter Bar for Counterpart Roles & Action Types */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 border border-gray-200/80 rounded-xl p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FunnelIcon className="w-3.5 h-3.5 text-gray-400 ml-1 mr-0.5" />
                      <button
                        type="button"
                        onClick={() => setHistoryRoleFilter('')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          historyRoleFilter === ''
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        All Roles
                      </button>
                      {counterpartRoles.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setHistoryRoleFilter(r.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            historyRoleFilter === r.value
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {r.shortLabel}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={historyTypeFilter}
                        onChange={(e) => setHistoryTypeFilter(e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500"
                      >
                        <option value="">All Action Types</option>
                        <option value="access_delegation">Role Access Delegations</option>
                        <option value="document_request">Document / File Requests</option>
                        <option value="general_directive">Governance Messages</option>
                      </select>

                      <select
                        value={historyStatusFilter}
                        onChange={(e) => setHistoryStatusFilter(e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500"
                      >
                        <option value="">All Statuses</option>
                        <option value="accepted">Accepted &amp; Active</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="declined">Declined</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  {loadingDirectives ? (
                    <div className="py-10 text-center text-xs text-gray-500">
                      Loading directive history...
                    </div>
                  ) : filteredHistoryDirectives.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <p className="text-xs text-gray-500">
                        No directive history records match the selected filters.
                      </p>
                      {(historyRoleFilter || historyTypeFilter || historyStatusFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryRoleFilter('');
                            setHistoryTypeFilter('');
                            setHistoryStatusFilter('');
                          }}
                          className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer"
                        >
                          Clear history filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredHistoryDirectives.map((d) => renderDirectiveCard(d))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={handleSendDirective} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Recipient Institutional Role
                      </label>
                      <select
                        value={composeForm.targetRole}
                        onChange={(e) => {
                          const nextRole = e.target.value as GovernanceRoleKey;
                          setComposeForm((f) => ({
                            ...f,
                            targetRole: nextRole,
                          }));
                          setComposePerms(DEFAULT_PROPOSED_PERMS[nextRole] || DEFAULT_PROPOSED_PERMS.alumni_officer);
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-orange-500"
                      >
                        {counterpartRoles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Communication / Request Type
                      </label>
                      <select
                        value={composeForm.type}
                        onChange={(e) =>
                          setComposeForm((f) => ({
                            ...f,
                            type: e.target.value as
                              | 'access_delegation'
                              | 'document_request'
                              | 'general_directive',
                          }))
                        }
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-orange-500"
                      >
                        {normalizedMyRole === 'admin' && (
                          <option value="access_delegation">
                            Role Access Delegation (Pending Recipient Acceptance)
                          </option>
                        )}
                        <option value="document_request">Official File / Document Request</option>
                        <option value="general_directive">Governance Message / Handover Note</option>
                      </select>
                    </div>
                  </div>

                  {composeForm.type === 'access_delegation' && (
                    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3 space-y-2">
                      <p className="text-[11px] font-bold text-purple-900">
                        Delegated Module Access (Activates when recipient logs in &amp; accepts)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                        {Object.entries(MODULE_LABELS).map(([modKey, modLabel]) => {
                          const currentLvl: AccessLevel = composePerms[modKey] || 'none';
                          return (
                            <div
                              key={modKey}
                              className="flex items-center justify-between gap-2 bg-white border border-purple-100 rounded-lg px-2.5 py-1.5"
                            >
                              <span className="text-[11px] text-gray-700 truncate">{modLabel}</span>
                              <div className="inline-flex rounded border border-gray-200 bg-gray-50 p-0.5 shrink-0">
                                {(['full', 'view', 'none'] as AccessLevel[]).map((lvl) => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() =>
                                      setComposePerms((prev) => ({ ...prev, [modKey]: lvl }))
                                    }
                                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                                      currentLvl === lvl
                                        ? lvl === 'full'
                                          ? 'bg-emerald-600 text-white'
                                          : lvl === 'view'
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-700 text-white'
                                        : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                  >
                                    {lvl === 'full' ? 'Full' : lvl === 'view' ? 'View' : 'None'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {composeForm.type === 'document_request' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Requested File or Official Document
                      </label>
                      <select
                        value={composeForm.documentType}
                        onChange={(e) =>
                          setComposeForm((f) => ({ ...f, documentType: e.target.value }))
                        }
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-orange-500"
                      >
                        {DOCUMENT_OPTIONS.map((doc) => (
                          <option key={doc} value={doc}>
                            {doc}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Subject / Directive Title <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={composeForm.title}
                        onChange={(e) => setComposeForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="e.g. Batch 2026 Graduation Masterlist Request"
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        CC / Specific Recipient Gmail <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={composeForm.targetEmail}
                          onChange={(e) =>
                            setComposeForm((f) => ({ ...f, targetEmail: e.target.value }))
                          }
                          placeholder="Auto-sends to assigned role holders"
                          className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-2 outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Reason / Detailed Instructions <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={composeForm.reason}
                      onChange={(e) => setComposeForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Provide the reason or instructions. This will be delivered via Gmail and announced by Alumi when the recipient logs in..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalTab('inbox')}
                      className="px-3.5 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingDirective}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      <span>
                        {sendingDirective ? 'Sending via Gmail...' : 'Send via Gmail & Notify Alumi'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
