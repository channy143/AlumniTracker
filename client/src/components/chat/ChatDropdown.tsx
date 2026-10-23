import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ArrowsPointingOutIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { messagesApi, connectionsApi } from '@/services/api';
import { useChatStore } from '@/store/chatStore';

interface ConversationItem {
  profile_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  lastMessage?: string;
  lastMessageAt: string;
  unread: number;
  is_online?: boolean;
  last_active_at?: string | null;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatDropdown() {
  const navigate = useNavigate();
  const {
    openChat,
    unreadCount,
    setUnreadCount,
    isHeaderDropdownOpen,
    toggleHeaderDropdown,
    closeHeaderDropdown,
  } = useChatStore();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups' | 'communities'>('all');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeHeaderDropdown();
      }
    }
    if (isHeaderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeaderDropdownOpen, closeHeaderDropdown]);

  // Fetch unread count periodically
  useEffect(() => {
    const fetchUnread = () => {
      if (document.visibilityState !== 'visible') return;
      messagesApi.unreadCount()
        .then((res) => {
          if (typeof res?.count === 'number') {
            setUnreadCount(res.count);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => clearInterval(interval);
  }, [setUnreadCount]);

  // Load conversations when dropdown is opened
  useEffect(() => {
    if (isHeaderDropdownOpen) {
      setLoading(true);
      Promise.all([
        messagesApi.conversations().catch(() => []),
        connectionsApi.suggestions().catch(() => []),
      ]).then(([convData, suggData]) => {
        setConversations(convData || []);
        setSuggestions(suggData || []);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [isHeaderDropdownOpen]);

  const filteredConversations = conversations.filter((c) => {
    const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (activeTab === 'unread') return c.unread > 0;
    if (activeTab === 'groups') return false; // Future group support
    if (activeTab === 'communities') return false; // Future community support
    return true;
  });

  const searchedPeople = searchQuery.trim()
    ? suggestions.filter((s) => {
        const name = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const alreadyInConv = conversations.some((c) => c.profile_id === s.id);
        return !alreadyInConv && name.includes(searchQuery.toLowerCase());
      })
    : [];


  const handleSelectConversation = (conv: ConversationItem) => {
    openChat({
      profileId: conv.profile_id,
      name: `${conv.first_name} ${conv.last_name}`.trim() || 'Alumni Contact',
      avatar: conv.avatar_url,
      isOnline: conv.is_online,
      lastActiveAt: conv.last_active_at,
    });
    closeHeaderDropdown();
  };

  const handleSelectSuggestion = (person: any) => {
    openChat({
      profileId: person.id,
      name: `${person.first_name} ${person.last_name}`.trim(),
      avatar: person.avatar_url,
      headline: person.headline,
      isOnline: false,
    });
    setShowNewChatModal(false);
    closeHeaderDropdown();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Messages Header Icon Button */}
      <button
        onClick={toggleHeaderDropdown}
        className={`relative p-1.5 rounded-lg transition-colors ${
          isHeaderDropdownOpen ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Alumni Messages"
        aria-label="Alumni Messages"
      >
        <ChatBubbleLeftRightIcon className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-orange-600 text-white text-[9px] font-bold rounded-full px-1 shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isHeaderDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[380px] bg-white border border-gray-200/90 rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[580px]">
          
          {/* Header Bar */}
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Alumni Messages</h2>
            <div className="flex items-center gap-1 text-gray-600">
              <button
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="Message settings"
              >
                <EllipsisHorizontalIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  closeHeaderDropdown();
                  navigate('/directory');
                }}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="Alumni Directory"
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                title="Compose message"
              >
                <PencilSquareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="px-4 py-1.5">
            <div className="relative flex items-center bg-gray-100/90 hover:bg-gray-100 rounded-full px-3 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:bg-white border border-transparent focus-within:border-orange-400">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-500 shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alumni or conversations..."
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'unread'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'groups'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                activeTab === 'communities'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Communities
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-2 py-1.5 divide-y divide-transparent">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const fullName = `${conv.first_name || ''} ${conv.last_name || ''}`.trim() || 'Alumni Contact';
                const initials = (conv.first_name?.[0] || 'A') + (conv.last_name?.[0] || '');

                return (
                  <div
                    key={conv.profile_id}
                    onClick={() => handleSelectConversation(conv)}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100/90 transition-colors cursor-pointer group"
                  >
                    {/* Avatar with Green Online Dot */}
                    <div className="relative shrink-0">
                      {conv.avatar_url ? (
                        <img
                          src={conv.avatar_url}
                          alt={fullName}
                          className="w-12 h-12 rounded-full object-cover ring-1 ring-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {initials}
                        </div>
                      )}
                      {/* Active green status dot - only when contact is genuinely online */}
                      {conv.is_online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                          {fullName}
                        </p>
                        <span className={`text-[11px] ${conv.unread > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate max-w-[210px] ${conv.unread > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {conv.lastMessage || 'Say hello to your fellow alumni 👋'}
                        </p>
                        {conv.unread > 0 && (
                          <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : searchedPeople.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Connect with fellow CTU-Naga alumni to network, collaborate, or share career opportunities.
                </p>
                {suggestions.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Suggested Alumni Connections
                    </p>
                    <div className="space-y-1">
                      {suggestions.slice(0, 3).map((person) => (
                        <div
                          key={person.id}
                          onClick={() => handleSelectSuggestion(person)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-xs">
                              {person.first_name?.[0] || 'A'}
                            </div>
                            <span className="text-xs font-semibold text-gray-800">
                              {person.first_name} {person.last_name}
                            </span>
                          </div>
                          <span className="text-[11px] text-blue-600 font-medium">Message</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* More Alumni (matching search query) */}
            {searchedPeople.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">
                  More Alumni
                </p>
                {searchedPeople.map((person) => (
                  <div
                    key={person.id}
                    onClick={() => handleSelectSuggestion(person)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100/90 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">
                          {person.first_name?.[0] || 'A'}
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {person.first_name} {person.last_name}
                        </p>
                        {person.headline && <p className="text-[10px] text-gray-400">{person.headline}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Message</span>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* New Chat Modal / Picker (Inline) */}
          {showNewChatModal && (
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">New Alumni Conversation:</p>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1">
                {suggestions.length > 0 ? (
                  suggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-left transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                        {s.first_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 truncate">{s.first_name} {s.last_name}</p>
                        {s.headline && <p className="text-[10px] text-gray-400 truncate">{s.headline}</p>}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-400">No suggestions available.</p>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
