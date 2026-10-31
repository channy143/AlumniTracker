import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationContainer from '../ui/Notification';
import DockedChatBox from '@/components/chat/DockedChatBox';

const mobileNavItems = [
  { name: 'Home', href: '/', icon: HomeIcon, end: true },
  { name: 'Jobs', href: '/jobs', icon: BriefcaseIcon },
  { name: 'Forum', href: '/community', icon: ChatBubbleLeftRightIcon },
  { name: 'Directory', href: '/directory', icon: BookOpenIcon },
  { name: 'Network', href: '/connections', icon: UsersIcon },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex bg-gray-50">
      <NotificationContainer />
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 p-3 sm:p-6 ${isAdminPath ? '' : 'pb-20 lg:pb-6'}`}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar for Alumni on the Go */}
      {!isAdminPath && (
        <nav
          aria-label="Mobile quick navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-1 py-1 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
        >
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'text-orange-600 bg-orange-50/70'
                    : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Alumni Connect Docked Messaging & Minimized Conversation Heads */}
      <DockedChatBox />
    </div>
  );
}

