import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <button
        onClick={() => setSidebarCollapsed((v) => !v)}
        className="fixed top-[87px] z-40 hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-300"
        style={{
          left: sidebarCollapsed ? '12px' : 'calc(16rem - 16px)',
        }}
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      <div className={`flex-1 flex flex-col transition-[margin] duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
