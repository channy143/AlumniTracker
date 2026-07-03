import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/utils/helpers';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-500 hover:text-ctu-charcoal rounded-lg hover:bg-gray-100">
            <Bars3Icon className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-ctu-charcoal">
            Welcome back{user ? `, ${user.email}` : ''}
          </h1>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button className="relative p-2 text-gray-500 hover:text-ctu-charcoal rounded-lg hover:bg-gray-100">
            <BellIcon className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-ctu-blue flex items-center justify-center text-white text-xs sm:text-sm font-medium">
              {user?.email ? getInitials(user.email[0], user.email[1] || '') : '?'}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs sm:text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
