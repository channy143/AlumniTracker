import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  HomeIcon,
  UserIcon,
  BriefcaseIcon,
  ChartBarIcon,
  HandRaisedIcon,
  UsersIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
  { name: 'Employment', href: '/employment', icon: BriefcaseIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Mentorship', href: '/mentorship', icon: HandRaisedIcon },
  { name: 'Community', href: '/community', icon: UsersIcon },
  { name: 'Job Board', href: '/jobs', icon: NewspaperIcon },
];

const adminNav = [
  { name: 'Dashboard', href: '/admin', icon: ShieldCheckIcon, end: true },
  { name: 'Profile', href: '/admin/profile', icon: UserIcon },
  { name: 'Alumni', href: '/admin/alumni', icon: UsersIcon },
  { name: 'Employers', href: '/admin/employers', icon: BuildingOfficeIcon },
  { name: 'Jobs', href: '/admin/jobs', icon: ClipboardDocumentListIcon },
  { name: 'Surveys', href: '/admin/surveys', icon: DocumentTextIcon },
  { name: 'Announcements', href: '/admin/announcements', icon: MegaphoneIcon },
  { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const { user } = useAuthStore();
  const isAdminPath = window.location.pathname.startsWith('/admin');

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-blue-200 hover:bg-white/10 hover:text-white'
    }`;

  const items = isAdminPath && user?.role === 'admin' ? adminNav : navigation;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 gradient-header z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:z-30`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-blue-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-display">CTU-Naga Alumni</h2>
              <p className="text-sm text-blue-300 mt-1">Alumni Tracker</p>
            </div>
            <button onClick={onMobileClose} className="lg:hidden p-1 text-blue-200 hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {items.map((item) => (
              <NavLink key={item.name} to={item.href} onClick={onMobileClose} className={linkClass} end={item.end}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {user?.role === 'admin' && !isAdminPath && (
            <div className="p-4 border-t border-blue-700">
              <NavLink to="/admin" onClick={onMobileClose} className={linkClass}>
                <ShieldCheckIcon className="w-5 h-5" />
                Admin Panel
              </NavLink>
            </div>
          )}

          <div className="p-4 border-t border-blue-700">
            <p className="text-xs text-blue-300 text-center">Bridging Education to Eternity</p>
          </div>
        </div>
      </aside>
    </>
  );
}
