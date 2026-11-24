import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { XMarkIcon, ChevronLeftIcon, LockClosedIcon, ShieldExclamationIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { getRecentlyViewed } from '@/utils/recentlyViewed';
import { useRolePermissions, NavAccessInfo } from '@/utils/rolePermissions';
import {
  HomeIcon,
  UsersIcon,
  NewspaperIcon,
  LinkIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  MegaphoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

type NavItem = { name: string; href: string; icon: any; end?: boolean };

const mainNav: NavItem[] = [
  { name: 'Home', href: '/', icon: HomeIcon, end: true },
  { name: 'Job Postings', href: '/jobs', icon: BriefcaseIcon },
  { name: 'Alumni Forum', href: '/community', icon: GlobeAltIcon },
  { name: 'Career Trends', href: '/career-trends', icon: NewspaperIcon },
  { name: 'Alumni Directory', href: '/directory', icon: BookOpenIcon },
  { name: 'My Network', href: '/connections', icon: UsersIcon },
];

const resourcesNav: NavItem[] = [
  { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
  { name: 'Events', href: '/events', icon: CalendarDaysIcon },
  { name: 'Graduate Tracer Survey', href: '/tracer-survey', icon: DocumentTextIcon },
  { name: 'Document Requests', href: '/document-requests', icon: ClipboardDocumentCheckIcon },
  { name: 'CTU Official Links', href: '/links', icon: LinkIcon },
  { name: 'Help & FAQ', href: '/support', icon: QuestionMarkCircleIcon },
];

const adminNav: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon, end: true },
  { name: 'Alumni Management', href: '/admin/alumni', icon: UsersIcon },
  { name: 'Document Requests', href: '/admin/document-requests', icon: DocumentTextIcon },
  { name: 'OJT & Clearance', href: '/admin/ojt', icon: ClipboardDocumentCheckIcon },
  { name: 'Partner Companies', href: '/admin/companies', icon: BuildingOffice2Icon },
  { name: 'Job Postings', href: '/admin/jobs', icon: BriefcaseIcon },
  { name: 'Graduate Tracer Surveys', href: '/admin/surveys', icon: DocumentTextIcon },
  { name: 'Announcements', href: '/admin/announcements', icon: MegaphoneIcon },
  { name: 'Events', href: '/admin/events', icon: CalendarDaysIcon },
  { name: 'Career Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Curriculum Insights', href: '/admin/curriculum', icon: AcademicCapIcon },
  { name: 'Employer Insights', href: '/admin/employers', icon: BuildingOfficeIcon },
  { name: 'Reports & Exports', href: '/admin/reports', icon: DocumentChartBarIcon },
  { name: 'Audit & Activity Log', href: '/admin/activity', icon: ShieldCheckIcon },
  { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

const registrarFullNav: NavItem[] = [
  { name: 'Eligible Registry', href: '/admin/alumni?tab=eligible', icon: ClipboardDocumentCheckIcon },
  ...adminNav,
];

export default function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const { getNavAccess } = useRolePermissions();
  const [lockedNavPrompt, setLockedNavPrompt] = useState<{ item: NavItem; access: NavAccessInfo } | null>(null);

  useEffect(() => {
    setRecentProfiles(getRecentlyViewed(user?.id));
    const handler = () => setRecentProfiles(getRecentlyViewed(user?.id));
    window.addEventListener('recently-viewed-changed', handler);
    return () => window.removeEventListener('recently-viewed-changed', handler);
  }, [location.pathname, user?.id]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gray-100 text-orange-600 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const handleNavClick = () => {
    onMobileClose();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const isInstitutionalAdmin = ['admin', 'staff', 'alumni_officer', 'registrar'].includes(user?.role || '');
  let items = mainNav;
  if (isAdminPath && isInstitutionalAdmin) {
    if (user?.role === 'registrar') {
      items = registrarFullNav;
    } else {
      items = adminNav;
    }
  }

  const currentRoleDisplay =
    user?.role === 'registrar'
      ? 'Registrar'
      : user?.role === 'alumni_officer' || user?.role === 'staff'
      ? 'Alumni Assistant'
      : 'Alumni Chair';

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white z-50 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-16' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full'} ${
          collapsed ? 'lg:translate-x-0' : 'lg:translate-x-0'
        } lg:z-30`}
      >
        {/* Toggle handle at center-right edge */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-[22px] z-50 items-center justify-center w-6 h-10 rounded-r-full bg-white border border-l-0 border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex flex-col h-full">
          <div className="h-12 flex items-center justify-between px-3 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <img src="/logo.png" alt="CTU-Naga" className="w-7 h-7 object-contain rounded-md shrink-0" />
              {!collapsed && (
                <span className="font-bold text-sm text-gray-800 tracking-tight">CTU-Naga</span>
              )}
            </div>
            <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none border-r border-gray-200">
            <nav data-tour={!isAdminPath ? 'sidebar-nav' : undefined} className="p-2 space-y-0.5">
              <div
                className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'
                }`}
              >
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {isAdminPath
                    ? user?.role === 'registrar'
                      ? 'Registrar Portal'
                      : user?.role === 'alumni_officer' || user?.role === 'staff'
                      ? 'Alumni Assistant Portal'
                      : 'Institutional Admin'
                    : 'Navigation'}
                </p>
              </div>
              {items.map((item) => {
                const access: NavAccessInfo = isAdminPath
                  ? getNavAccess(item.href)
                  : { level: 'full', locked: false, moduleKey: 'public', moduleLabel: item.name };

                if (isAdminPath && access.locked) {
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setLockedNavPrompt({ item, access })}
                      title={
                        collapsed
                          ? `${item.name} (Locked — Restricted for ${currentRoleDisplay})`
                          : `Restricted by Role Governance (${access.moduleLabel})`
                      }
                      className="w-full group flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-50/40 hover:bg-amber-50/60 hover:text-gray-600 border border-transparent hover:border-amber-200/70 transition-all cursor-pointer select-none"
                    >
                      <div className="relative shrink-0">
                        <item.icon className="w-5 h-5 shrink-0 text-gray-300 group-hover:text-amber-500 transition-colors" />
                        {collapsed && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shadow-2xs">
                            <LockClosedIcon className="w-2.5 h-2.5 text-amber-700" />
                          </span>
                        )}
                      </div>
                      <span
                        className={`truncate text-left transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                          collapsed ? 'max-w-0 opacity-0 ml-0' : 'flex-1 opacity-85 ml-3'
                        }`}
                      >
                        {item.name}
                      </span>
                      {!collapsed && (
                        <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200/90 group-hover:bg-amber-100 group-hover:text-amber-800 group-hover:border-amber-300 transition-colors shrink-0">
                          <LockClosedIcon className="w-2.5 h-2.5" />
                          <span>Locked</span>
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={
                      isAdminPath
                        ? linkClass
                        : ({ isActive }) =>
                            `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-gray-100 text-orange-600 font-semibold'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                    }
                    end={item.end}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span
                      className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                        collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'
                      }`}
                    >
                      {item.name}
                    </span>
                  </NavLink>
                );
              })}

              {!isAdminPath && (
                <>
                  <div
                    className={`my-2 mx-3 border-t border-gray-200 transition-all duration-300 ease-in-out ${
                      collapsed ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  <div
                    className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                      collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Resources</p>
                  </div>
                  {resourcesNav.map((item) =>
                    item.href.startsWith('/') ? (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-gray-100 text-orange-600 font-semibold'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon className="w-5 h-5 shrink-0 text-gray-400" />
                        <span
                          className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                            collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'
                          }`}
                        >
                          {item.name}
                        </span>
                      </NavLink>
                    ) : (
                      <a
                        key={item.name}
                        href={item.href}
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon className="w-5 h-5 shrink-0 text-gray-400" />
                        <span
                          className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                            collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'
                          }`}
                        >
                          {item.name}
                        </span>
                      </a>
                    )
                  )}

                  <div
                    className={`my-2 mx-3 border-t border-gray-200 transition-all duration-300 ease-in-out ${
                      collapsed ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  <div
                    className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                      collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'
                    }`}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Recent Checked Alumnis
                    </p>
                  </div>
                  {recentProfiles.length > 0 && (
                    <div className="px-0 space-y-0.5">
                      {recentProfiles.map((p: any) => (
                        <NavLink
                          key={p.id}
                          to={`/directory/${p.id}`}
                          onClick={onMobileClose}
                          className={`flex items-center rounded-lg transition-colors ${
                            collapsed
                              ? 'px-3 py-2 hover:bg-gray-100'
                              : 'px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                          title={`${p.first_name} ${p.last_name}`}
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?'
                            )}
                          </div>
                          <span
                            className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                              collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-2'
                            }`}
                          >
                            {p.first_name} {p.last_name}
                          </span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              )}
            </nav>

            <div className="p-3" />
          </div>
        </div>
      </aside>

      {/* Locked Nav Button Modal Prompt */}
      {lockedNavPrompt && (
        <div
          className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setLockedNavPrompt(null)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                  <LockClosedIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Module Locked — Restricted Access</h3>
                  <p className="text-[11px] text-white/85">{lockedNavPrompt.item.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLockedNavPrompt(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <ShieldExclamationIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">
                    Policy Module: <span className="text-amber-700">{lockedNavPrompt.access.moduleLabel}</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Your current institutional role (<span className="font-semibold">{currentRoleDisplay}</span>) has{' '}
                    <span className="font-bold text-red-700">Restricted</span> access to{' '}
                    <span className="font-semibold">{lockedNavPrompt.item.name}</span>.
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                To unlock this section, the <span className="font-semibold text-gray-900">Alumni Chair</span> can
                delegate temporary or full access to your role via the{' '}
                <span className="font-semibold text-gray-900">Role Access Control Distribution</span> settings.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setLockedNavPrompt(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const navName = lockedNavPrompt.item.name;
                    const modLabel = lockedNavPrompt.access.moduleLabel;
                    setLockedNavPrompt(null);
                    onMobileClose();
                    window.dispatchEvent(
                      new CustomEvent('open-governance-directives', {
                        detail: {
                          tab: 'send',
                          targetRole: 'admin',
                          type: 'general_directive',
                          prefillTitle: `Access Request: Unlock ${navName}`,
                          prefillReason: `Requesting temporary role access delegation for "${modLabel}" (${navName}) to perform institutional tasks.`,
                        },
                      })
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>Request Access from Alumni Chair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
