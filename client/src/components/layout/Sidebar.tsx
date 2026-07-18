import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { XMarkIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { getRecentlyViewed } from '@/utils/recentlyViewed';
import {
  HomeIcon,
  UsersIcon,
  NewspaperIcon,
  LinkIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  BuildingOfficeIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  BookOpenIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

type NavItem = { name: string; href: string; icon: any; end?: boolean };

const mainNav: NavItem[] = [
  { name: 'Home', href: '/', icon: HomeIcon, end: true },
  { name: 'Career Trends', href: '/career-trends', icon: NewspaperIcon },
  { name: 'Alumni Directory', href: '/directory', icon: BookOpenIcon },
];

const resourcesNav: NavItem[] = [
  { name: 'Announcements', href: '/announcements', icon: MegaphoneIcon },
  { name: 'Events', href: '/events', icon: CalendarDaysIcon },
  { name: 'Useful Links', href: '/links', icon: LinkIcon },
  { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon },
];

const adminNav: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon, end: true },
  { name: 'Alumni Management', href: '/admin/alumni', icon: UsersIcon },
  { name: 'Graduate Tracer Surveys', href: '/admin/surveys', icon: DocumentTextIcon },
  { name: 'Announcements', href: '/admin/announcements', icon: MegaphoneIcon },
  { name: 'Events', href: '/admin/events', icon: CalendarDaysIcon },
  { name: 'Career Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Curriculum Insights', href: '/admin/curriculum', icon: AcademicCapIcon },
  { name: 'Employer Insights', href: '/admin/employers', icon: BuildingOfficeIcon },
  { name: 'Reports & Exports', href: '/admin/reports', icon: ChartBarIcon },
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

  useEffect(() => {
    setRecentProfiles(getRecentlyViewed());
    const handler = () => setRecentProfiles(getRecentlyViewed());
    window.addEventListener('recently-viewed-changed', handler);
    return () => window.removeEventListener('recently-viewed-changed', handler);
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-gray-100 text-orange-600 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const items = isAdminPath && user?.role === 'admin' ? adminNav : mainNav;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white z-50 transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-16' : 'lg:w-64'
        } ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full'
        } ${collapsed ? 'lg:translate-x-0' : 'lg:translate-x-0'} lg:z-30`}
      >
        {/* Toggle handle at center-right edge */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute top-1/2 -translate-y-1/2 -right-[22px] z-50 items-center justify-center w-6 h-10 rounded-r-full bg-white border border-l-0 border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex flex-col h-full">
          <div className="h-12 flex items-center justify-end px-3 border-b border-gray-200 shrink-0">
            <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 scrollbar-hover border-r border-gray-200 overflow-hidden">
            <nav className="p-2 space-y-0.5">
              <div className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'}`}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {isAdminPath ? 'Admin' : 'Navigation'}
                </p>
              </div>
              {items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onMobileClose}
                  className={isAdminPath ? linkClass : ({ isActive }) =>
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
                  <span className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'}`}>
                    {item.name}
                  </span>
                </NavLink>
              ))}

              {!isAdminPath && (
                <>
                  <div className={`my-2 mx-3 border-t border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0' : 'opacity-100'}`} />
                  <div className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'}`}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Resources</p>
                  </div>
                  {resourcesNav.map((item) =>
                    item.href.startsWith('/') ? (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        onClick={onMobileClose}
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
                        <span className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'}`}>
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
                        <span className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-3'}`}>
                          {item.name}
                        </span>
                      </a>
                    )
                  )}

                  <div className={`my-2 mx-3 border-t border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? 'opacity-0' : 'opacity-100'}`} />
                  <div className={`px-3 py-1.5 transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-h-0 opacity-0 py-0' : 'max-h-12 opacity-100 py-1.5'}`}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Recent Checked Alumnis</p>
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
                          <span className={`truncate transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-48 opacity-100 ml-2'}`}>
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
    </>
  );
}
