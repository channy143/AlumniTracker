import { NavLink, Outlet } from 'react-router-dom';

const adminNav = [
  { name: 'Dashboard', href: '/admin', end: true },
  { name: 'Alumni', href: '/admin/alumni' },
  { name: 'Employers', href: '/admin/employers' },
  { name: 'Jobs', href: '/admin/jobs' },
  { name: 'Surveys', href: '/admin/surveys' },
  { name: 'Announcements', href: '/admin/announcements' },
  { name: 'Reports', href: '/admin/reports' },
  { name: 'Analytics', href: '/admin/analytics' },
  { name: 'Users', href: '/admin/users' },
  { name: 'Settings', href: '/admin/settings' },
];

export default function AdminLayout() {
  return (
    <div className="flex gap-6 h-full">
      <nav className="w-56 shrink-0 hidden lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Admin</p>
          {adminNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-ctu-blue/10 text-ctu-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-ctu-charcoal'
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
