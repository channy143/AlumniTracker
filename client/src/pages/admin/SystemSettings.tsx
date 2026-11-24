import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/api';
import { getCached } from '@/utils/apiCache';
import { useUIStore } from '@/store/uiStore';
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
} from '@heroicons/react/24/outline';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Super Admin', color: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Full institutional governance, settings, logs, and security controls' },
  { value: 'alumni_officer', label: 'Alumni Officer', color: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Graduate tracer surveys, job portal, announcements, and career analytics' },
  { value: 'registrar', label: 'Registrar', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', desc: 'Eligible alumni registry, bulk imports, and graduation reports' },
  { value: 'staff', label: 'Institutional Staff', color: 'bg-amber-100 text-amber-800 border-amber-200', desc: 'Operational assistance across general alumni management' },
  { value: 'alumni', label: 'Alumni Member', color: 'bg-gray-100 text-gray-800 border-gray-200', desc: 'Standard verified graduate account' },
];

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<'settings' | 'roles'>('settings');

  // General Settings state
  const initialSettings = getCached<any>('/admin/settings');
  const [settings, setSettings] = useState<any>(initialSettings ?? null);
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const addNotification = useUIStore((s) => s.addNotification);

  // User & Roles state
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

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

  useEffect(() => {
    loadSettings();
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
    } catch {
      addNotification('Failed to load user accounts', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userRoleFilter, userPage, addNotification]);

  useEffect(() => {
    if (activeTab === 'roles') {
      loadUsers();
    }
  }, [activeTab, loadUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to "${newRole}"?`)) return;
    setUpdatingUserId(userId);
    try {
      await adminApi.userSetRole(userId, newRole);
      addNotification(`User role updated to ${newRole}`, 'success');
      loadUsers();
    } catch (err: any) {
      addNotification(err.message || 'Failed to update user role', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const isDisabling = user.is_active !== false;
    const actionLabel = isDisabling ? 'disable' : 'enable';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account "${user.email}"?`)) return;
    setUpdatingUserId(user.id);
    try {
      if (isDisabling) {
        await adminApi.userDisable(user.id);
        addNotification('Account disabled', 'success');
      } else {
        await adminApi.userEnable(user.id);
        addNotification('Account enabled', 'success');
      }
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
      await adminApi.userCreate(staffForm);
      addNotification('Institutional user account created successfully', 'success');
      setShowCreateStaff(false);
      setStaffForm({ firstName: '', lastName: '', email: '', password: '', role: 'alumni_officer' });
      loadUsers();
    } catch (err: any) {
      setStaffError(err.message || 'Failed to create user account');
    } finally {
      setCreatingStaff(false);
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
          <button
            onClick={() => setShowCreateStaff(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-2xs cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Institutional User</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-4">
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
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-2xs">
          <div className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">University Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">University Name</label>
                <input
                  type="text"
                  value={settings?.university_name || ''}
                  onChange={(e) => setSettings((s: any) => ({ ...s, university_name: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={settings?.tagline || ''}
                  onChange={(e) => setSettings((s: any) => ({ ...s, tagline: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={settings?.logo_url || ''}
                  onChange={(e) => setSettings((s: any) => ({ ...s, logo_url: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year Start</label>
                <input
                  type="number"
                  value={settings?.academic_year_start || 2014}
                  onChange={(e) => setSettings((s: any) => ({ ...s, academic_year_start: parseInt(e.target.value) }))}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 w-full"
                />
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Institutional Theme Colors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings?.primary_color || '#003366'}
                    onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5"
                  />
                  <input
                    type="text"
                    value={settings?.primary_color || '#003366'}
                    onChange={(e) => setSettings((s: any) => ({ ...s, primary_color: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 flex-1 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Secondary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={settings?.secondary_color || '#D4AF37'}
                    onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))}
                    className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5"
                  />
                  <input
                    type="text"
                    value={settings?.secondary_color || '#D4AF37'}
                    onChange={(e) => setSettings((s: any) => ({ ...s, secondary_color: e.target.value }))}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 flex-1 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Tracked Academic Programs</h2>
            <p className="text-xs text-gray-500 mb-3">Degrees covered by the Alumni Tracking System & Graduate Tracer Surveys.</p>
            <div className="flex flex-wrap gap-1.5">
              {(settings?.courses || ['BSIT', 'BIT', 'BEEd', 'BSEd-Math', 'BTLED']).map((course: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200/60 text-xs rounded-full font-medium">
                  {course}
                </span>
              ))}
            </div>
          </div>

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
      )}

      {/* Tab 2: User Roles & Governance */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Institutional Role Reference Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-purple-50/70 border border-purple-200/70 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                Super Administrator
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                Full platform governance. Access to system configurations, security audit logs, user role assignment, and institutional policy overrides.
              </p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                <IdentificationIcon className="w-4 h-4 text-blue-600" />
                Alumni Officer (Coordinator)
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Manages Graduate Tracer Surveys (GTS), event coordination, announcements, partner employers, job opportunities, and career outcome analytics.
              </p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <BuildingLibraryIcon className="w-4 h-4 text-emerald-600" />
                Registrar's Office
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Authorized for graduation lists, eligible alumni bulk Excel/CSV imports, graduate record verification, and official graduation exports.
              </p>
            </div>
          </div>

          {/* User Filter & Search */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
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
                <option value="admin">Super Admin</option>
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
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading institutional accounts...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No user accounts match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
                      <th className="py-2.5 px-3.5">User / Identity</th>
                      <th className="py-2.5 px-3.5">Assigned Role</th>
                      <th className="py-2.5 px-3.5">Account Status</th>
                      <th className="py-2.5 px-3.5">Last Login</th>
                      <th className="py-2.5 px-3.5 text-right">Role Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => {
                      const fullName = u.profile ? `${u.profile.first_name || ''} ${u.profile.last_name || ''}`.trim() : '';
                      const isUpdating = updatingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-medium text-gray-900">{fullName || 'No Name Provided'}</div>
                            <div className="text-[11px] text-gray-500">{u.email}</div>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {getRoleBadge(u.role)}
                          </td>
                          <td className="py-2.5 px-3.5">
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
                          <td className="py-2.5 px-3.5 text-gray-500">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
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
          </div>
        </div>
      )}

      {/* Modal: Create Institutional User */}
      {showCreateStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Add Institutional User</h3>
                <p className="text-xs text-gray-500">Provision a staff, alumni coordinator, or registrar account</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateStaff(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-3.5">
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
                  <option value="admin">Super Administrator</option>
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
    </div>
  );
}
