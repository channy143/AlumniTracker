import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon,
  UsersIcon,
  HandRaisedIcon,
  NewspaperIcon,
  LinkIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

type NavItem = { name: string; href: string; icon: any; end?: boolean };

const mainNav: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Community', href: '/community', icon: UsersIcon },
  { name: 'Mentorship', href: '/mentorship', icon: HandRaisedIcon },
  { name: 'Career Hub', href: '/jobs', icon: NewspaperIcon },
];

const resourcesNav: NavItem[] = [
  { name: 'Useful Links', href: '#', icon: LinkIcon },
  { name: 'Events', href: '#', icon: CalendarDaysIcon },
  { name: 'Help Center', href: '#', icon: QuestionMarkCircleIcon },
  { name: 'FAQ', href: '#', icon: ChatBubbleLeftRightIcon },
  { name: 'Contact Alumni Office', href: '#', icon: EnvelopeIcon },
];

const adminNav: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: ShieldCheckIcon, end: true },
  { name: 'Profile', href: '/admin/profile', icon: UserIcon },
  { name: 'Alumni', href: '/admin/alumni', icon: UsersIcon },
  { name: 'Companies', href: '/admin/employers', icon: BuildingOfficeIcon },
  { name: 'Job Postings', href: '/admin/jobs', icon: ClipboardDocumentListIcon },
  { name: 'Surveys', href: '/admin/surveys', icon: DocumentTextIcon },
  { name: 'Announcements', href: '/admin/announcements', icon: MegaphoneIcon },
  { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
  { name: 'Career Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed?: boolean;
}) {
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

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
        className={`fixed top-0 left-0 h-full w-64 bg-white z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'} lg:z-30`}
      >
        <div className="flex flex-col h-full">
          <div className="h-12 flex items-center justify-end px-3 border-b border-gray-200 shrink-0">
            <button onClick={onMobileClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 scrollbar-hover border-r border-gray-200">
            <nav className="p-2 space-y-0.5">
              <div className="px-3 py-1.5">
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
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-orange-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  end={item.end}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}

              {!isAdminPath && (
                <>
                  <div className="my-2 mx-3 border-t border-gray-200" />
                  <div className="px-3 py-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Resources</p>
                  </div>
                  {resourcesNav.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-400" />
                      {item.name}
                    </a>
                  ))}
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
