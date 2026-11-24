import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { adminApi, authApi } from '@/services/api';
import { getCached } from '@/utils/apiCache';
import { useUIStore } from '@/store/uiStore';
import {
  GOVERNANCE_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  GovernanceRoleKey,
  AccessLevel,
} from '@/utils/rolePermissions';
import {
  Cog6ToothIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  XMarkIcon,
  BuildingLibraryIcon,
  IdentificationIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CameraIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const ALUMNI_CHAIR_AVATAR_URL =
  'https://scontent.fceb1-4.fna.fbcdn.net/v/t39.30808-6/926022240_10240539745383416_874558066326759145_n.jpg?stp=dst-jpg_tt6&cstp=mx2046x2048&ctp=s2046x2048&_nc_cat=108&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeErVDIap8L9RF2IQdcKq3n6Dj-qECklgYEOP6oQKSWBgVUxbUchTsjj62DrbNbSP2mbGa40P1YwYhMlh63y62lc&_nc_ohc=huQIjoRcDdEQ7kNvwFiXdp0&_nc_oc=AdpompPscaInHRtCGg2S9mm3t5pSmMyzqnWodI0K2ligw99Ss6LD7qOMY5UUUe_7cS3G01I6ooWFcKRjrINd2_T9&_nc_zt=23&_nc_ht=scontent.fceb1-4.fna&_nc_gid=MnEYgJvsEMndJ1FvD7Xm6Q&_nc_ss=7b3a8&oh=00_AQSay3_nL6AZOD1tKBN2pSQ61fzSe7eay4dK1pBa0RGoHw&oe=6B0B7B44';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Alumni Chair', color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Full institutional governance, settings, logs, and security controls' },
  { value: 'alumni_officer', label: 'Alumni Officer', color: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Graduate tracer surveys, job portal, announcements, and career analytics' },
  { value: 'registrar', label: 'Registrar', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Eligible alumni registry, bulk imports, and graduation reports' },
  { value: 'staff', label: 'Institutional Staff', color: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Operational assistance across general alumni management' },
  { value: 'alumni', label: 'Alumni Member', color: 'bg-gray-100 text-gray-800 border-gray-200', desc: 'Standard verified graduate account' },
];

const GOVERNANCE_CACHE_KEY = 'ctu_governance_holders_cache_v1';

function readGovernanceCache(): { governanceUsers: any[]; roleCounts: Record<string, number> } | null {
  try {
    const raw = localStorage.getItem(GOVERNANCE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.governanceUsers)) {
      return {
        governanceUsers: parsed.governanceUsers,
        roleCounts: parsed.roleCounts || { admin: 1, alumni_officer: 0, registrar: 0, staff: 0, alumni: 0 },
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<'roles' | 'settings'>('roles');

  // General Settings state
  const initialSettings = getCached<any>('/admin/settings');
  const [settings, setSettings] = useState<any>(initialSettings ?? null);
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const addNotification = useUIStore((s) => s.addNotification);

  // Change Password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [changingPw, setChangingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  // User & Roles state (hydrated from local cache so refresh pops up all nodes at once with zero double-pop)
  const cachedGov = readGovernanceCache();
  const [users, setUsers] = useState<any[]>([]);
  const [governanceUsers, setGovernanceUsers] = useState<any[]>(cachedGov?.governanceUsers || []);
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>(
    cachedGov?.roleCounts || { admin: 1, alumni_officer: 0, registrar: 0, staff: 0, alumni: 0 }
  );
  const [governanceReady, setGovernanceReady] = useState<boolean>(Boolean(cachedGov));
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedRoleModal, setSelectedRoleModal] = useState<GovernanceRoleKey | null>(null);
  const [draftRolePerms, setDraftRolePerms] = useState<Record<string, AccessLevel>>({});
  const [savingRolePolicy, setSavingRolePolicy] = useState(false);
  const [directiveActionMode, setDirectiveActionMode] = useState<'delegate_access' | 'request_doc'>('delegate_access');
  const [directiveReason, setDirectiveReason] = useState('');
  const [directiveEmail, setDirectiveEmail] = useState('');
  const [directiveDocType, setDirectiveDocType] = useState('Eligible Alumni Graduation Masterlist (CSV/Excel)');
  const [sendingRoleDirective, setSendingRoleDirective] = useState(false);
  const [pendingRoleConfirm, setPendingRoleConfirm] = useState<{ user: any; newRole: string } | null>(null);
  const [pendingStatusConfirm, setPendingStatusConfirm] = useState<any | null>(null);

  // Create Staff modal state
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'alumni_officer',
  });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffPhoto, setStaffPhoto] = useState<File | null>(null);
  const [staffPhotoPreview, setStaffPhotoPreview] = useState<string | null>(null);
  const [chairImgError, setChairImgError] = useState(false);

  useEffect(() => {
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener('governance-directives-updated', handler);
    return () => window.removeEventListener('governance-directives-updated', handler);
  }, []);

  const loadSettings = async () => {
    const cached = getCached<any>('/admin/settings');
    if (cached) {
      setSettings(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const data = await adminApi.settingsGet();
      setSettings(data);
    } catch {
      if (!cached) addNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await adminApi.settingsUpdate(settings);
      addNotification('Settings saved', 'success');
    } catch {
      addNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      setPwError('All password fields are required.');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    setChangingPw(true);
    try {
      await authApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      addNotification('Password updated successfully', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwError(err?.message || 'Failed to update password.');
    } finally {
      setChangingPw(false);
    }
  };

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminApi.userList({
        search: userSearch,
        role: userRoleFilter,
        page: userPage,
        limit: 12,
      });
      setUsers(res.data || []);
      setTotalUsers(res.total || 0);
      const nextGovUsers = Array.isArray(res.governanceUsers) ? res.governanceUsers : governanceUsers;
      const nextRoleCounts = res.roleCounts || roleCounts;
      if (Array.isArray(res.governanceUsers)) setGovernanceUsers(nextGovUsers);
      if (res.roleCounts) setRoleCounts(nextRoleCounts);
      setGovernanceReady(true);
      try {
        localStorage.setItem(
          GOVERNANCE_CACHE_KEY,
          JSON.stringify({ governanceUsers: nextGovUsers, roleCounts: nextRoleCounts })
        );
      } catch {
        // ignore storage quota errors
      }
    } catch {
      addNotification('Failed to load user accounts', 'error');
      setGovernanceReady(true);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userRoleFilter, userPage, addNotification]);

  useEffect(() => {
    if (activeTab === 'roles') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleRoleChange = (userId: string, newRole: string) => {
    const targetUser =
      users.find((u) => u.id === userId) ||
      governanceUsers.find((u) => u.id === userId) || { id: userId, email: 'Institutional Account', role: 'alumni' };
    if (targetUser.role === newRole) return;
    setPendingRoleConfirm({ user: targetUser, newRole });
  };

  const executeConfirmedRoleChange = async () => {
    if (!pendingRoleConfirm) return;
    const { user: targetUser, newRole } = pendingRoleConfirm;
    const newRoleLabel = ROLE_OPTIONS.find((r) => r.value === newRole)?.label || newRole;
    setUpdatingUserId(targetUser.id);
    try {
      const res = await adminApi.userSetRole(targetUser.id, newRole);
      addNotification(
        res?.message || `Role appointment sent for ${newRoleLabel}`,
        'success'
      );
      setPendingRoleConfirm(null);
      loadUsers();
    } catch (err: any) {
      addNotification(err.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = (user: any) => {
    setPendingStatusConfirm(user);
  };

  const executeConfirmedToggleStatus = async () => {
    if (!pendingStatusConfirm) return;
    const user = pendingStatusConfirm;
    const isDisabling = user.is_active !== false;
    const actionLabel = isDisabling ? 'disable' : 'enable';
    setUpdatingUserId(user.id);
    try {
      if (isDisabling) {
        await adminApi.userDisable(user.id);
        addNotification('Account deactivated', 'success');
      } else {
        await adminApi.userEnable(user.id);
        addNotification('Account enabled', 'success');
      }
      setPendingStatusConfirm(null);
      loadUsers();
    } catch (err: any) {
      addNotification(err.message || `Failed to ${actionLabel} account`, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    if (!staffForm.email || !staffForm.password || !staffForm.firstName || !staffForm.lastName) {
      setStaffError('All fields are required.');
      return;
    }
    setCreatingStaff(true);
    try {
      const created = await adminApi.userCreate(staffForm);
      if (staffPhoto && created?.id) {
        try {
          await adminApi.userUploadPhoto(created.id, staffPhoto);
        } catch (photoErr: any) {
          addNotification(photoErr?.message || 'User created, but profile picture upload failed', 'warning');
        }
      }
      addNotification('Institutional user account created successfully', 'success');
      setShowCreateStaff(false);
      setStaffForm({ firstName: '', lastName: '', email: '', password: '', role: 'alumni_officer' });
      setStaffPhoto(null);
      setStaffPhotoPreview(null);
      loadUsers();
    } catch (err: any) {
      setStaffError(err.message || 'Failed to create user account');
    } finally {
      setCreatingStaff(false);
    }
  };

  const openRoleModal = (roleKey: GovernanceRoleKey) => {
    const savedMap = settings?.role_permissions?.[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey];
    setDraftRolePerms({ ...DEFAULT_ROLE_PERMISSIONS[roleKey], ...savedMap });
    setDirectiveActionMode(roleKey === 'registrar' ? 'request_doc' : 'delegate_access');
    setDirectiveReason('');
    const firstHolder = governanceUsers.find((u) =>
      roleKey === 'alumni_officer' ? u.role === 'alumni_officer' || u.role === 'staff' : u.role === roleKey
    );
    setDirectiveEmail(firstHolder?.email || '');
    setSelectedRoleModal(roleKey);
  };

  const handleDispatchRoleDirective = async () => {
    if (!selectedRoleModal) return;
    if (!directiveReason.trim()) {
      addNotification('Please enter a reason or instructions before sending.', 'warning');
      return;
    }
    setSendingRoleDirective(true);
    try {
      const isDelegation = directiveActionMode === 'delegate_access';
      const res = await adminApi.directiveCreate({
        type: isDelegation ? 'access_delegation' : 'document_request',
        targetRole: selectedRoleModal,
        targetEmail: directiveEmail.trim() || undefined,
        reason: directiveReason.trim(),
        documentType: !isDelegation ? directiveDocType : undefined,
        proposedPermissions: isDelegation ? draftRolePerms : undefined,
      });
      addNotification(
        res.emailSent
          ? `Sent via Gmail (${res.emailRecipients.join(', ')}) & notified via Alumi!`
          : isDelegation
          ? 'Role access delegation sent! It will activate once the recipient logs in and accepts.'
          : 'Document request sent to role notification inbox!',
        'success'
      );
      setDirectiveReason('');
      window.dispatchEvent(new CustomEvent('governance-directives-updated'));
    } catch (err: any) {
      addNotification(err?.message || 'Failed to dispatch directive', 'error');
    } finally {
      setSendingRoleDirective(false);
    }
  };

  const handleSaveRolePolicy = async () => {
    if (!selectedRoleModal) return;
    setSavingRolePolicy(true);
    try {
      const nextSettings = {
        ...(settings || {}),
        role_permissions: {
          ...(settings?.role_permissions || DEFAULT_ROLE_PERMISSIONS),
          [selectedRoleModal]: draftRolePerms,
        },
      };
      await adminApi.settingsUpdate(nextSettings);
      setSettings(nextSettings);
      window.dispatchEvent(new CustomEvent('role-permissions-updated'));
      addNotification('Role access control policy saved', 'success');
    } catch (err: any) {
      addNotification(err?.message || 'Failed to save role access policy', 'error');
    } finally {
      setSavingRolePolicy(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const match = ROLE_OPTIONS.find((r) => r.value === role);
    return match ? (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${match.color}`}>
        {match.label}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
        {role}
      </span>
    );
  };

  if (loading && activeTab === 'settings') {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="h-5 w-36 bg-gray-200 animate-pulse rounded" />
            <div className="h-3 w-56 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-lg" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-8 bg-gray-100 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 bg-gray-200 rounded" />
              <div className="h-8 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5 text-orange-500" />
            System Governance & Settings
          </h1>
          <p className="text-xs text-gray-500">Configure university branding, security policies, and manage institutional staff roles</p>
        </div>
        {activeTab === 'settings' ? (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-governance-directives', { detail: { tab: 'inbox' } }))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 shadow-2xs cursor-pointer"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Role Directives &amp; File Requests</span>
            </button>
            <button
              onClick={() => setShowCreateStaff(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Institutional User</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-4">
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'roles'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <UserGroupIcon className="w-4 h-4" />
          <span>User Roles & Governance</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <BuildingLibraryIcon className="w-4 h-4" />
          <span>General Configuration</span>
        </button>
      </div>

      {/* Tab 2: General Configuration */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-2xs">
            <div className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-orange-600" />
                Administrative Security Policy
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Controls authentication rigor, session inactivity expiration, and step-up verification for administrator accounts.
              </p>
              <div className="space-y-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.require_admin_mfa ?? true}
                    onChange={(e) => setSettings((s: any) => ({ ...s, require_admin_mfa: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-gray-800">Require MFA on every administrator login</span>
                    <span className="block text-xs text-gray-500">Bypasses trusted-device skipping for administrative portal accounts.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.require_sudo_for_sensitive ?? true}
                    onChange={(e) => setSettings((s: any) => ({ ...s, require_sudo_for_sensitive: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-gray-800">Require password confirmation (Sudo Mode) for sensitive operations</span>
                    <span className="block text-xs text-gray-500">
                      Enforces step-up authentication before role reassignments, password resets, permanent deletions, and institutional policy changes.
                    </span>
                  </div>
                </label>

                <div className="max-w-xs pt-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Admin Inactivity Idle Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={settings?.admin_idle_timeout_minutes ?? 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSettings((s: any) => ({
                        ...s,
                        admin_idle_timeout_minutes: Number.isNaN(val) ? 15 : val,
                      }));
                    }}
                    onBlur={() => {
                      setSettings((s: any) => {
                        const current = Number(s?.admin_idle_timeout_minutes ?? 15);
                        const clamped = Math.min(Math.max(Number.isFinite(current) ? current : 15, 5), 120);
                        return { ...s, admin_idle_timeout_minutes: clamped };
                      });
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-full"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Allowed range: 5 to 120 minutes (recommended: 15).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-orange-600" />
              Change Administrator Password
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Update your current administrator account password. Use at least 8 characters with a mix of letters, numbers, and symbols.
            </p>
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 pr-9 outline-none focus:border-orange-500 w-full"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPw.current ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.next ? 'text' : 'password'}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 pr-9 outline-none focus:border-orange-500 w-full"
                      placeholder="Min. 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPw.next ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.confirm ? 'text' : 'password'}
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 pr-9 outline-none focus:border-orange-500 w-full"
                      placeholder="Re-enter new password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPw.confirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {pwError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  {pwError}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={changingPw}
                  className="px-4 py-2 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {changingPw ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 1: User Roles & Governance */}
      {activeTab === 'roles' && (() => {
        const superAdmins = governanceUsers.filter((u) => u.role === 'admin');
        const alumniAssistants = governanceUsers.filter((u) => u.role === 'alumni_officer' || u.role === 'staff');
        const registrars = governanceUsers.filter((u) => u.role === 'registrar');

        const chairCount = roleCounts.admin || superAdmins.length;
        const assistantCount = (roleCounts.alumni_officer || 0) + (roleCounts.staff || 0) || alumniAssistants.length;
        const registrarCount = roleCounts.registrar || registrars.length;

        const pickHolder = (list: any[], fallbackInitials: string) => {
          const first = list[0];
          if (!first) {
            return { isVacant: true, url: null, name: 'Vacant', initials: fallbackInitials };
          }
          const url = first?.profile?.avatar_url || null;
          const name = first?.profile
            ? `${first.profile.first_name || ''} ${first.profile.last_name || ''}`.trim()
            : first?.email?.split('@')[0] || fallbackInitials;
          const initials = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s: string) => s[0].toUpperCase())
            .join('') || fallbackInitials;
          return { isVacant: false, url, name, initials };
        };

        const assistantHolder = pickHolder(alumniAssistants, 'AA');
        const registrarHolder = pickHolder(registrars, 'RG');
        const totalUserPages = Math.max(1, Math.ceil(totalUsers / 12));

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:items-stretch">
            {/* Left Side: Alumni & Account Governance Table */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* User Filter & Search */}
              <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1 min-w-[180px]">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                      placeholder="Search user by email or name..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-500"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="">All Institutional Roles</option>
                    <option value="admin">Alumni Chair</option>
                    <option value="alumni_officer">Alumni Officer</option>
                    <option value="registrar">Registrar</option>
                    <option value="staff">Staff</option>
                    <option value="alumni">Alumni Member</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500">
                  Total Accounts: <span className="font-semibold text-gray-800">{totalUsers}</span>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs flex-1 flex flex-col justify-between">
                {loadingUsers ? (
                  <div className="p-8 text-center text-xs text-gray-500 space-y-2 my-auto">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Loading institutional accounts...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 my-auto">
                    No user accounts match the current filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                          <th className="py-2.5 px-3">User / Identity</th>
                          <th className="py-2.5 px-3">Assigned Role</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Role Governance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map((u) => {
                          const fullName = u.profile ? `${u.profile.first_name || ''} ${u.profile.last_name || ''}`.trim() : '';
                          const isUpdating = updatingUserId === u.id;
                          return (
                            <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-gray-900">{fullName || 'No Name Provided'}</div>
                                <div className="text-[11px] text-gray-500 truncate max-w-[180px]">{u.email}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col items-start gap-1">
                                  {getRoleBadge(u.role)}
                                  {u.role_appointment?.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      ⏳ Pending: {u.role_appointment.offeredRoleLabel}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                {u.is_active === false ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    <NoSymbolIcon className="w-3 h-3" />
                                    Deactivated
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <select
                                    disabled={isUpdating}
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-orange-500 bg-white cursor-pointer disabled:opacity-50"
                                  >
                                    {ROLE_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>

                                  <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleToggleStatus(u)}
                                    className={`px-2 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                                      u.is_active === false
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-600'
                                    }`}
                                    title={u.is_active === false ? 'Enable Account' : 'Deactivate Account'}
                                  >
                                    {u.is_active === false ? 'Enable' : 'Deactivate'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Footer */}
                {totalUsers > 0 && (
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs">
                    <span className="text-gray-500">
                      Page <span className="font-semibold text-gray-700">{userPage}</span> of{' '}
                      <span className="font-semibold text-gray-700">{totalUserPages}</span> ({totalUsers} users)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={userPage <= 1 || loadingUsers}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={userPage >= totalUserPages || loadingUsers}
                        onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Governance Network Visualization & Role Descriptions */}
            <div className="lg:col-span-5 flex flex-col gap-3 h-full">
              {/* Constellation / Network Visualization Card */}
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 shadow-md relative overflow-hidden">
                <style>{`
                  @keyframes dashFlow {
                    to {
                      stroke-dashoffset: -20;
                    }
                  }
                `}</style>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    Role Access Distribution
                  </span>
                  <span className="text-[10px] text-white/75">Click a role to configure</span>
                </div>
                <div className="relative h-60 w-full select-none">
                  {/* Animated Dashed SVG Triangle Connections */}
                  <svg viewBox="0 0 400 240" className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="200" y1="54" x2="96" y2="176" stroke="rgba(255,255,255,0.6)" strokeWidth="1.75" strokeDasharray="5 5" style={{ animation: 'dashFlow 1.2s linear infinite' }} />
                    <line x1="200" y1="54" x2="304" y2="176" stroke="rgba(255,255,255,0.6)" strokeWidth="1.75" strokeDasharray="5 5" style={{ animation: 'dashFlow 1.2s linear infinite' }} />
                    <line x1="96" y1="176" x2="304" y2="176" stroke="rgba(255,255,255,0.6)" strokeWidth="1.75" strokeDasharray="5 5" style={{ animation: 'dashFlow 1.2s linear infinite' }} />
                  </svg>

                  {governanceReady && (
                    <>
                      {/* Node 1: Alumni Chair (Top-Center) */}
                      <div className="absolute left-1/2 top-[22%] -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.button
                          key="chair-node-sheila"
                          type="button"
                          onClick={() => openRoleModal('admin')}
                          title="Click to manage Alumni Chair access controls & details"
                          initial={{ scale: 0, opacity: 0, y: 18 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{
                            type: 'spring',
                            stiffness: 340,
                            damping: 17,
                            mass: 0.8,
                            delay: 0.04,
                          }}
                          className="flex flex-col items-center group cursor-pointer focus:outline-none relative"
                        >
                          <div className="relative">
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0.85 }}
                              animate={{ scale: 1.45, opacity: 0 }}
                              transition={{ duration: 0.85, ease: 'easeOut', delay: 0.08 }}
                              className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none"
                            />
                            <div className="w-16 h-16 rounded-full border-2 border-white/95 bg-white/95 shadow-lg overflow-hidden flex items-center justify-center transition-shadow duration-200 group-hover:ring-4 group-hover:ring-white/40">
                              {!chairImgError ? (
                                <img
                                  src={ALUMNI_CHAIR_AVATAR_URL}
                                  alt="Sheila Marie C Lopez"
                                  onError={() => setChairImgError(true)}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold text-indigo-700">SL</span>
                              )}
                            </div>
                          </div>
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.12 }}
                            className="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 text-indigo-900 text-[10px] font-bold shadow-xs whitespace-nowrap group-hover:bg-orange-50"
                          >
                            Alumni Chair
                          </motion.span>
                          <motion.span
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.16 }}
                            className="mt-0.5 text-[10px] font-semibold text-white/95 drop-shadow whitespace-nowrap"
                          >
                            Sheila Marie C Lopez
                          </motion.span>
                        </motion.button>
                      </div>

                      {/* Node 2: Alumni Assistant (Bottom-Left) */}
                      <div className="absolute left-[24%] top-[73%] -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.button
                          key={`assistant-node-${assistantHolder.name}-${assistantHolder.url || 'vacant'}`}
                          type="button"
                          onClick={() => openRoleModal('alumni_officer')}
                          title="Click to manage Alumni Assistant access controls & details"
                          initial={{ scale: 0, opacity: 0, y: 18 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{
                            type: 'spring',
                            stiffness: 340,
                            damping: 17,
                            mass: 0.8,
                            delay: 0.12,
                          }}
                          className="flex flex-col items-center group cursor-pointer focus:outline-none relative"
                        >
                          <div className="relative">
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0.85 }}
                              animate={{ scale: 1.45, opacity: 0 }}
                              transition={{ duration: 0.85, ease: 'easeOut', delay: 0.16 }}
                              className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none"
                            />
                            <div
                              className={`w-16 h-16 rounded-full border-2 shadow-lg overflow-hidden flex items-center justify-center transition-shadow duration-200 group-hover:ring-4 group-hover:ring-white/40 ${
                                assistantHolder.isVacant
                                  ? 'border-dashed border-white/80 bg-white/20 backdrop-blur-xs text-white'
                                  : 'border-white/95 bg-white/95 text-violet-700'
                              }`}
                            >
                              {assistantHolder.url ? (
                                <img src={assistantHolder.url} alt={assistantHolder.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold">{assistantHolder.initials}</span>
                              )}
                            </div>
                          </div>
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.2 }}
                            className="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 text-violet-900 text-[10px] font-bold shadow-xs whitespace-nowrap group-hover:bg-orange-50"
                          >
                            Alumni Assistant
                          </motion.span>
                          <motion.span
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.24 }}
                            className={`mt-0.5 text-[10px] drop-shadow whitespace-nowrap ${
                              assistantHolder.isVacant ? 'italic text-white/80 font-medium' : 'font-semibold text-white/95'
                            }`}
                          >
                            {assistantHolder.name}
                          </motion.span>
                        </motion.button>
                      </div>

                      {/* Node 3: Registrar (Bottom-Right) */}
                      <div className="absolute left-[76%] top-[73%] -translate-x-1/2 -translate-y-1/2 z-10">
                        <motion.button
                          key={`registrar-node-${registrarHolder.name}-${registrarHolder.url || 'vacant'}`}
                          type="button"
                          onClick={() => openRoleModal('registrar')}
                          title="Click to manage Registrar access controls & details"
                          initial={{ scale: 0, opacity: 0, y: 18 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{
                            type: 'spring',
                            stiffness: 340,
                            damping: 17,
                            mass: 0.8,
                            delay: 0.2,
                          }}
                          className="flex flex-col items-center group cursor-pointer focus:outline-none relative"
                        >
                          <div className="relative">
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0.85 }}
                              animate={{ scale: 1.45, opacity: 0 }}
                              transition={{ duration: 0.85, ease: 'easeOut', delay: 0.24 }}
                              className="absolute inset-0 rounded-full border-2 border-white/80 pointer-events-none"
                            />
                            <div
                              className={`w-16 h-16 rounded-full border-2 shadow-lg overflow-hidden flex items-center justify-center transition-shadow duration-200 group-hover:ring-4 group-hover:ring-white/40 ${
                                registrarHolder.isVacant
                                  ? 'border-dashed border-white/80 bg-white/20 backdrop-blur-xs text-white'
                                  : 'border-white/95 bg-white/95 text-emerald-700'
                              }`}
                            >
                              {registrarHolder.url ? (
                                <img src={registrarHolder.url} alt={registrarHolder.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold">{registrarHolder.initials}</span>
                              )}
                            </div>
                          </div>
                          <motion.span
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.28 }}
                            className="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 text-emerald-900 text-[10px] font-bold shadow-xs whitespace-nowrap group-hover:bg-orange-50"
                          >
                            Registrar
                          </motion.span>
                          <motion.span
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.32 }}
                            className={`mt-0.5 text-[10px] drop-shadow whitespace-nowrap ${
                              registrarHolder.isVacant ? 'italic text-white/80 font-medium' : 'font-semibold text-white/95'
                            }`}
                          >
                            {registrarHolder.name}
                          </motion.span>
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Role Descriptions Section */}
              <div className="flex-1 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider px-0.5">
                  Role Descriptions &amp; Governance
                </h3>

                <div
                  onClick={() => openRoleModal('admin')}
                  className="flex-1 flex flex-col justify-center bg-purple-50/70 border border-purple-200/70 rounded-xl p-3.5 space-y-1 cursor-pointer hover:shadow-sm hover:border-purple-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                      {!chairImgError ? (
                        <img
                          src={ALUMNI_CHAIR_AVATAR_URL}
                          alt="Sheila Marie C Lopez"
                          onError={() => setChairImgError(true)}
                          className="w-5 h-5 rounded-full object-cover border border-purple-300"
                        />
                      ) : (
                        <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                      )}
                      <span>Alumni Chair — Sheila Marie C Lopez</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {chairCount} assigned
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800 leading-relaxed">
                    Full platform governance. Access to security configurations, audit logs, user role assignments, password resets, and institutional policy overrides.
                  </p>
                </div>

                <div
                  onClick={() => openRoleModal('alumni_officer')}
                  className="flex-1 flex flex-col justify-center bg-blue-50/70 border border-blue-200/70 rounded-xl p-3.5 space-y-1 cursor-pointer hover:shadow-sm hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                      <IdentificationIcon className="w-4 h-4 text-blue-600" />
                      <span>Alumni Assistant ({assistantHolder.isVacant ? 'Vacant' : assistantHolder.name})</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {assistantCount > 0 ? `${assistantCount} assigned` : 'Vacant'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Manages Graduate Tracer Surveys (GTS), event coordination, announcements, partner employers, job opportunities, and career outcome analytics.
                  </p>
                </div>

                <div
                  onClick={() => openRoleModal('registrar')}
                  className="flex-1 flex flex-col justify-center bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3.5 space-y-1 cursor-pointer hover:shadow-sm hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <BuildingLibraryIcon className="w-4 h-4 text-emerald-600" />
                      <span>Registrar ({registrarHolder.isVacant ? 'Vacant' : registrarHolder.name})</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {registrarCount > 0 ? `${registrarCount} assigned` : 'Vacant'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Authorized for graduation lists, eligible alumni bulk Excel/CSV imports, graduate record verification, and official graduation exports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Advanced Role Access Control & Governance */}
      {selectedRoleModal && (() => {
        const roleMeta = {
          admin: {
            title: 'Alumni Chair',
            subtitle: 'Sheila Marie C Lopez · Highest Institutional Authority',
            badge: 'Full Governance',
            headerBg: 'from-purple-600 to-indigo-700',
            members: governanceUsers.filter((u) => u.role === 'admin'),
            avatarUrl: !chairImgError ? ALUMNI_CHAIR_AVATAR_URL : null,
            initials: 'SL',
          },
          alumni_officer: {
            title: 'Alumni Assistant',
            subtitle: 'Alumni Officer & Operations Coordinator',
            badge: 'Operations & Surveys',
            headerBg: 'from-blue-600 to-indigo-600',
            members: governanceUsers.filter((u) => u.role === 'alumni_officer' || u.role === 'staff'),
            avatarUrl: governanceUsers.find((u) => u.role === 'alumni_officer' || u.role === 'staff')?.profile?.avatar_url || null,
            initials: 'AA',
          },
          registrar: {
            title: 'Registrar',
            subtitle: "Registrar's Office · Graduation & Eligibility Records",
            badge: 'Registry & Imports',
            headerBg: 'from-emerald-600 to-teal-700',
            members: governanceUsers.filter((u) => u.role === 'registrar'),
            avatarUrl: governanceUsers.find((u) => u.role === 'registrar')?.profile?.avatar_url || null,
            initials: 'RG',
          },
        }[selectedRoleModal];

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setSelectedRoleModal(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`px-5 py-4 bg-gradient-to-r ${roleMeta.headerBg} text-white flex items-center justify-between gap-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-white/90 bg-white/95 overflow-hidden flex items-center justify-center shrink-0">
                    {roleMeta.avatarUrl ? (
                      <img src={roleMeta.avatarUrl} alt={roleMeta.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gray-700">{roleMeta.initials}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{roleMeta.title} — Access Control</h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {roleMeta.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/85 mt-0.5">{roleMeta.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoleModal(null)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Assigned Personnel Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Assigned Personnel ({roleMeta.members.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleModal(null);
                        setStaffForm((f) => ({ ...f, role: selectedRoleModal }));
                        setShowCreateStaff(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Assign New {roleMeta.title}</span>
                    </button>
                  </div>

                  {roleMeta.members.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 text-xs text-gray-500 flex items-center justify-between">
                      <span>This role is currently <strong className="text-gray-700">Vacant</strong>. No institutional account assigned yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {roleMeta.members.map((m) => {
                        const mName = m.profile
                          ? `${m.profile.first_name || ''} ${m.profile.last_name || ''}`.trim()
                          : 'Institutional Account';
                        const isUpdating = updatingUserId === m.id;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-gray-200 bg-gray-50/60"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                                {m.profile?.avatar_url ? (
                                  <img src={m.profile.avatar_url} alt={mName} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-gray-600">
                                    {(mName[0] || 'U').toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{mName}</p>
                                <p className="text-[11px] text-gray-500 truncate">
                                  {m.email} · Last login: {m.last_login ? new Date(m.last_login).toLocaleDateString() : 'Never'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                disabled={isUpdating}
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-orange-500"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleToggleStatus(m)}
                                className={`px-2 py-1 text-[11px] rounded-lg border font-medium cursor-pointer ${
                                  m.is_active === false
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:text-red-600'
                                }`}
                              >
                                {m.is_active === false ? 'Enable' : 'Deactivate'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Role Access Control Distribution Matrix */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Module Access Control Distribution
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {selectedRoleModal === 'admin'
                          ? 'Alumni Chair retains full governance access across all modules.'
                          : `Configure what modules and operations ${roleMeta.title} accounts can access.`}
                      </p>
                    </div>
                    {selectedRoleModal !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => setDraftRolePerms({ ...DEFAULT_ROLE_PERMISSIONS[selectedRoleModal] })}
                        className="text-[11px] text-gray-500 hover:text-orange-600 underline cursor-pointer"
                      >
                        Reset defaults
                      </button>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                    {GOVERNANCE_MODULES.map((mod) => {
                      const currentLevel: AccessLevel = draftRolePerms[mod.key] || 'none';
                      return (
                        <div key={mod.key} className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-gray-50/60">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{mod.label}</p>
                            <p className="text-[11px] text-gray-500">{mod.desc}</p>
                          </div>
                          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0 self-start sm:self-center">
                            {(['full', 'view', 'none'] as AccessLevel[]).map((lvl) => {
                              const active = currentLevel === lvl;
                              const label = lvl === 'full' ? 'Full' : lvl === 'view' ? 'View' : 'Restricted';
                              const activeClass =
                                lvl === 'full'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : lvl === 'view'
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-gray-700 text-white shadow-2xs';
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  disabled={selectedRoleModal === 'admin'}
                                  onClick={() => setDraftRolePerms((p) => ({ ...p, [mod.key]: lvl }))}
                                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                    active ? activeClass : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Inter-Role Communication, Access Delegation & Document Request via Gmail + Alumi */}
                {selectedRoleModal !== 'admin' && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <PaperAirplaneIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Communicate &amp; Dispatch via Gmail + Alumi</span>
                        </h4>
                        <p className="text-[11px] text-indigo-800/80">
                          Send a role access delegation (activates once {roleMeta.title} logs in &amp; accepts) or request an official document/file.
                        </p>
                      </div>
                      <div className="inline-flex rounded-lg border border-indigo-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setDirectiveActionMode('delegate_access')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                            directiveActionMode === 'delegate_access'
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <KeyIcon className="w-3 h-3" />
                          <span>Delegate Access</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDirectiveActionMode('request_doc')}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                            directiveActionMode === 'request_doc'
                              ? 'bg-emerald-600 text-white'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <DocumentTextIcon className="w-3 h-3" />
                          <span>Request File / Document</span>
                        </button>
                      </div>
                    </div>

                    {directiveActionMode === 'request_doc' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Requested File or Official Document
                        </label>
                        <select
                          value={directiveDocType}
                          onChange={(e) => setDirectiveDocType(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-indigo-500"
                        >
                          <option value="Eligible Alumni Graduation Masterlist (CSV/Excel)">Eligible Alumni Graduation Masterlist (CSV/Excel)</option>
                          <option value="Verified Graduate Registry Ledger">Verified Graduate Registry Ledger</option>
                          <option value="PRC / LET Board Passers Accreditation File">PRC / LET Board Passers Accreditation File</option>
                          <option value="Q-Pro Career Analytics & Employment Report">Q-Pro Career Analytics &amp; Employment Report</option>
                          <option value="Official Commencement / Registrar Certification">Official Commencement / Registrar Certification</option>
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Recipient Gmail Address <span className="font-normal text-gray-500">(Auto-notifies all {roleMeta.title} accounts + this email)</span>
                        </label>
                        <div className="relative">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={directiveEmail}
                            onChange={(e) => setDirectiveEmail(e.target.value)}
                            placeholder={`Enter ${roleMeta.title} Gmail address (optional)...`}
                            className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 bg-white outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Reason / Message <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={directiveReason}
                          onChange={(e) => setDirectiveReason(e.target.value)}
                          placeholder={
                            directiveActionMode === 'delegate_access'
                              ? `e.g. "I am unavailable today — granting ${roleMeta.title} access to manage verifications and surveys. Please accept when you log in."`
                              : `e.g. "Please upload or send the latest ${directiveDocType} for our CHED accreditation audit."`
                          }
                          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={sendingRoleDirective}
                        onClick={handleDispatchRoleDirective}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        <span>
                          {sendingRoleDirective
                            ? 'Dispatching Gmail & Alumi Alert...'
                            : directiveActionMode === 'delegate_access'
                            ? `Send Access Delegation to ${roleMeta.title} (Pending Acceptance)`
                            : `Send File Request to ${roleMeta.title} via Gmail`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-500">
                  Security: MFA {(settings?.require_admin_mfa ?? true) ? 'Enforced' : 'Optional'} · Sudo Mode{' '}
                  {(settings?.require_sudo_for_sensitive ?? true) ? 'Required' : 'Off'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRoleModal(null)}
                    className="px-3.5 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Close
                  </button>
                  {selectedRoleModal !== 'admin' && (
                    <button
                      type="button"
                      disabled={savingRolePolicy}
                      onClick={handleSaveRolePolicy}
                      className="px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {savingRolePolicy ? 'Saving Policy...' : 'Save Access Policy'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Create Institutional User */}
      {showCreateStaff && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Institutional User</h3>
                <p className="text-xs text-gray-500">Provision a staff, alumni coordinator, or registrar account</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateStaff(false);
                  setStaffPhoto(null);
                  setStaffPhotoPreview(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5">
              {/* Profile Picture Upload */}
              <div className="flex items-center gap-3.5 pb-1">
                <div className="w-14 h-14 rounded-full bg-orange-50 border border-orange-200 overflow-hidden flex items-center justify-center shrink-0">
                  {staffPhotoPreview ? (
                    <img src={staffPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <CameraIcon className="w-6 h-6 text-orange-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Profile Picture <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <CameraIcon className="w-3.5 h-3.5 text-gray-500" />
                      <span>{staffPhoto ? 'Change Picture' : 'Upload Picture'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setStaffPhoto(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setStaffPhotoPreview(String(reader.result || ''));
                            reader.readAsDataURL(file);
                          } else {
                            setStaffPhotoPreview(null);
                          }
                        }}
                      />
                    </label>
                    {staffPhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setStaffPhoto(null);
                          setStaffPhotoPreview(null);
                        }}
                        className="text-[11px] text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={staffForm.firstName}
                    onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                    placeholder="e.g. Shella"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={staffForm.lastName}
                    onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                    placeholder="e.g. Coordinator"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                  placeholder="name@ctu.edu.ph"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assigned Institutional Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-white"
                >
                  <option value="alumni_officer">Alumni Officer (Coordinator)</option>
                  <option value="registrar">Registrar's Office</option>
                  <option value="staff">Staff Support</option>
                  <option value="admin">Alumni Chair</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {ROLE_OPTIONS.find((r) => r.value === staffForm.role)?.desc}
                </p>
              </div>

              {staffError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                  {staffError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStaff(false)}
                  className="px-3.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {creatingStaff ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Styled Role Assignment Confirmation */}
      {pendingRoleConfirm && (() => {
        const u = pendingRoleConfirm.user;
        const fullName = u.profile ? `${u.profile.first_name || ''} ${u.profile.last_name || ''}`.trim() : '';
        const newRoleMeta = ROLE_OPTIONS.find((r) => r.value === pendingRoleConfirm.newRole);
        const isSaving = updatingUserId === u.id;

        return (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => !isSaving && setPendingRoleConfirm(null)}
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
                    <h3 className="text-sm font-bold">Confirm Institutional Role Change</h3>
                    <p className="text-[11px] text-white/80">Governance &amp; access privilege reassignment</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setPendingRoleConfirm(null)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                    {u.profile?.avatar_url ? (
                      <img src={u.profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      ((fullName || u.email || 'U')[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{fullName || 'Institutional User'}</p>
                    <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Current Role</span>
                      <div>{getRoleBadge(u.role)}</div>
                    </div>
                    <span className="text-gray-400 font-bold text-sm">&rarr;</span>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-semibold uppercase text-indigo-600 mb-1">New Assigned Role</span>
                      <div>{getRoleBadge(pendingRoleConfirm.newRole)}</div>
                    </div>
                  </div>
                  {newRoleMeta?.desc && (
                    <p className="text-[11px] text-indigo-950/80 border-t border-indigo-100 pt-2 leading-relaxed">
                      <strong>Permissions granted:</strong> {newRoleMeta.desc}
                    </p>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Are you sure you want to assign <strong className="text-gray-800">{fullName || u.email}</strong> to{' '}
                  <strong className="text-gray-800">{newRoleMeta?.label || pendingRoleConfirm.newRole}</strong>? Their active sessions will be refreshed to enforce the updated access policy.
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setPendingRoleConfirm(null)}
                    className="px-3.5 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={executeConfirmedRoleChange}
                    className="px-4 py-2 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? 'Updating Role...' : `Confirm & Assign ${newRoleMeta?.label || ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Styled Account Enable / Deactivate Confirmation */}
      {pendingStatusConfirm && (() => {
        const u = pendingStatusConfirm;
        const isDisabling = u.is_active !== false;
        const fullName = u.profile ? `${u.profile.first_name || ''} ${u.profile.last_name || ''}`.trim() : '';
        const isSaving = updatingUserId === u.id;

        return (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => !isSaving && setPendingStatusConfirm(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`px-5 py-4 text-white flex items-center justify-between ${
                  isDisabling
                    ? 'bg-gradient-to-r from-red-600 to-rose-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    {isDisabling ? (
                      <NoSymbolIcon className="w-5 h-5 text-white" />
                    ) : (
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {isDisabling ? 'Deactivate User Account' : 'Enable User Account'}
                    </h3>
                    <p className="text-[11px] text-white/80">Institutional account access control</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setPendingStatusConfirm(null)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Are you sure you want to {isDisabling ? 'deactivate' : 're-enable'} the account for{' '}
                  <strong className="text-gray-900">{fullName || u.email}</strong> ({u.email})?
                  {isDisabling
                    ? ' This user will be signed out immediately and prevented from logging in until re-enabled.'
                    : ' This user will regain access to sign in with their assigned role.'}
                </p>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setPendingStatusConfirm(null)}
                    className="px-3.5 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={executeConfirmedToggleStatus}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-2xs cursor-pointer disabled:opacity-50 ${
                      isDisabling ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSaving
                      ? 'Updating...'
                      : isDisabling
                      ? 'Confirm Deactivation'
                      : 'Confirm & Enable Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
