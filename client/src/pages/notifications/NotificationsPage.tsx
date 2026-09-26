import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import {
  BellIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  UserGroupIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const NOTIF_TYPES: Record<string, { id: string; label: string; icon: any }> = {
  survey: { id: 'survey', label: 'Surveys', icon: DocumentTextIcon },
  job: { id: 'job', label: 'Job Opportunities', icon: BriefcaseIcon },
  application: { id: 'application', label: 'Applications', icon: BriefcaseIcon },
  mentorship: { id: 'mentorship', label: 'Mentorship', icon: UserGroupIcon },
  announcement: { id: 'announcement', label: 'Announcements', icon: MegaphoneIcon },
  event: { id: 'event', label: 'Events', icon: CalendarDaysIcon },
  system: { id: 'system', label: 'System & Security', icon: ShieldExclamationIcon },
};

function getNotifConfig(type?: string) {
  switch (type) {
    case 'survey':
      return {
        icon: DocumentTextIcon,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        badge: 'Survey',
        actionLabel: 'Take Survey',
      };
    case 'job':
    case 'application':
      return {
        icon: BriefcaseIcon,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        badge: 'Job Opportunity',
        actionLabel: 'View Details',
      };
    case 'mentorship':
      return {
        icon: UserGroupIcon,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        badge: 'Mentorship',
        actionLabel: 'View Mentorship',
      };
    case 'announcement':
      return {
        icon: MegaphoneIcon,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        badge: 'Announcement',
        actionLabel: 'Read More',
      };
    case 'event':
      return {
        icon: CalendarDaysIcon,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        badge: 'Event',
        actionLabel: 'View Event',
      };
    case 'system':
      return {
        icon: ShieldExclamationIcon,
        color: 'text-red-600',
        bg: 'bg-red-50',
        badge: 'System Alert',
        actionLabel: 'Inspect',
      };
    default:
      return {
        icon: BellIcon,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        badge: 'Notification',
        actionLabel: 'View',
      };
  }
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await notificationsApi.listDetailed({
        limit: 100,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        unread: activeTab === 'unread' ? true : undefined,
      });
      setNotifications(res?.notifications || []);
      setTotalCount(res?.total || 0);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('All notifications marked as read');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Notification deleted');
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationsApi.clearAll(true);
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      showToast('Read notifications cleared');
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const handleNotifClick = (n: any) => {
    if (!n.is_read) {
      handleMarkRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (n.title || '').toLowerCase().includes(q);
        const matchMessage = (n.message || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMessage) return false;
      }
      return true;
    });
  }, [notifications, search]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 opacity-15 pointer-events-none">
          <BellIcon className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                Notification Center
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">All Notifications</h1>
            <p className="text-xs sm:text-sm text-orange-100 mt-1 max-w-xl">
              Stay updated with academic tracer surveys, career opportunities, security alerts, and campus announcements.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-orange-700 hover:bg-orange-50 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
            <button
              onClick={handleClearRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors shadow-2xs backdrop-blur-xs cursor-pointer"
              title="Clear all read notifications"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Read</span>
            </button>
            <button
              onClick={fetchNotifications}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors shadow-2xs backdrop-blur-xs cursor-pointer"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, and Category Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main State Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Notifications ({totalCount || notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-white text-orange-600 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-orange-500 bg-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs no-scrollbar">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-orange-50 text-orange-700 border border-orange-200 font-semibold'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            All Categories
          </button>
          {Object.entries(NOTIF_TYPES).map(([key, item]) => {
            const Icon = item.icon;
            const isSelected = typeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50 text-orange-700 border border-orange-200 font-semibold'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto border border-orange-100">
              <BellIcon className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">No notifications found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {search || typeFilter !== 'all' || activeTab === 'unread'
                ? 'No notifications match your current filter or search criteria.'
                : 'You are completely caught up! We will alert you when new tracer surveys, job opportunities, or announcements arrive.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notif) => {
              const cfg = getNotifConfig(notif.type);
              const Icon = cfg.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer group hover:bg-orange-50/30 ${
                    !notif.is_read ? 'bg-orange-50/40' : 'bg-white'
                  }`}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0 border border-black/5 shadow-2xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        {cfg.badge}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {timeAgo(notif.created_at)}
                      </span>
                      {!notif.is_read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                          New
                        </span>
                      )}
                    </div>

                    <h4 className={`text-sm font-semibold leading-snug ${!notif.is_read ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                      {notif.title}
                    </h4>

                    {notif.message && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    )}

                    {/* Action link if available */}
                    {notif.link && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:text-orange-700 group-hover:underline">
                          <span>{cfg.actionLabel}</span>
                          <span>&rarr;</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Controls */}
                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(notif.id, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete notification"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
