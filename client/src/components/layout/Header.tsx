import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/utils/helpers';
import { profileApi } from '@/services/api';
import { Bars3Icon, BellIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon, PlusIcon, UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const SEARCH_PAGES = ['/career-trends', '/announcements', '/events', '/directory', '/connections'];

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  '/career-trends': 'Search career trends...',
  '/announcements': 'Search announcements...',
  '/events': 'Search events...',
  '/directory': 'Search alumni by name, headline...',
};

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const currentSearchPage = SEARCH_PAGES.find((p) => location.pathname.startsWith(p)) || null;
  const placeholder = currentSearchPage ? SEARCH_PLACEHOLDERS[currentSearchPage] || 'Search...' : 'Search alumni, jobs, companies...';

  useEffect(() => {
    if (!user) return;
    profileApi.get().then((p) => setAvatarUrl(p?.avatar_url || null)).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = () => profileApi.get().then((p) => setAvatarUrl(p?.avatar_url || null)).catch(() => {});
    window.addEventListener('avatar-updated', handler);
    return () => window.removeEventListener('avatar-updated', handler);
  }, []);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-12 flex items-center pr-4">
      <div className="w-full grid grid-cols-3 items-center">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">C</span>
            </div>
            <span className="hidden sm:block text-sm font-semibold text-gray-800">CTU-Naga</span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-xl">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!searchValue.trim()) return;
              const target = currentSearchPage || '/connections';
              navigate(`${target}?q=${encodeURIComponent(searchValue.trim())}`);
              setSearchValue('');
            }} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={placeholder}
                className="w-full h-9 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-200 transition-all"
              />
            </form>
          </div>
        </div>

        <div className="flex items-center gap-1 justify-end">
          <button className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Messages">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </button>
          <button className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Notifications">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
          </button>
          {user?.role === 'admin' && (
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-full transition-colors" title="Create Post">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden md:inline">Post</span>
            </button>
          )}

          <div className="relative ml-1 pl-2 border-l border-gray-200" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-white text-xs font-medium hover:ring-2 hover:ring-blue-300 transition-all overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.email ? getInitials(user.email[0], user.email[1] || '') : '?'
                )}
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  My Profile
                </button>
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors cursor-not-allowed"
                  disabled
                >
                  <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                  Settings
                  <span className="ml-auto text-[10px] text-gray-400">Soon</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
