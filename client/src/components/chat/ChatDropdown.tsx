import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  PlusIcon,
  CheckIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { messagesApi, connectionsApi, profileApi } from '@/services/api';
import { useChatStore, ChatContact } from '@/store/chatStore';
import { playTing } from '@/utils/helpers';

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

interface ConnectedAlumni {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  headline?: string;
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

function formatLastActive(dateStr?: string | null): string {
  if (!dateStr) return 'Offline';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return 'Offline';
  const diffMs = Math.max(0, now - d);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 2) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  return 'Offline';
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
    groups,
    setGroups,
  } = useChatStore();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [connectedAlumni, setConnectedAlumni] = useState<ConnectedAlumni[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeSearch, setComposeSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');
  const [loading, setLoading] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [isMessageRinging, setIsMessageRinging] = useState(false);
  const lastUnreadMessagesRef = useRef<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeHeaderDropdown();
        setIsComposing(false);
        setIsCreatingGroup(false);
      }
    }
    if (isHeaderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHeaderDropdownOpen, closeHeaderDropdown]);

  // Fetch current user's profile ID
  useEffect(() => {
    profileApi.get()
      .then((p) => {
        if (p?.id) setMyProfileId(p.id);
      })
      .catch(() => {});
  }, []);

  // Fetch unread count periodically and trigger notification chime when new messages arrive
  useEffect(() => {
    const fetchUnread = () => {
      messagesApi.unreadCount()
        .then((res) => {
          if (typeof res?.count === 'number') {
            const newCount = res.count;
            if (lastUnreadMessagesRef.current !== null && newCount > lastUnreadMessagesRef.current) {
              playTing();
              setIsMessageRinging(true);
              setTimeout(() => setIsMessageRinging(false), 1200);
            }
            lastUnreadMessagesRef.current = newCount;
            setUnreadCount(newCount);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnread();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [setUnreadCount]);

  // Load conversations, groups, and connected alumni when dropdown is opened
  useEffect(() => {
    if (isHeaderDropdownOpen) {
      setLoading(true);
      setLoadingConnections(true);

      // 1. Fetch conversations
      messagesApi.conversations()
        .then((convData) => {
          setConversations(convData || []);
        })
        .catch(() => setConversations([]))
        .finally(() => setLoading(false));

      // 2. Fetch groups
      messagesApi.groups()
        .then((grpData) => {
          if (Array.isArray(grpData)) setGroups(grpData);
        })
        .catch(() => {});

      // 3. Fetch accepted connections
      connectionsApi.list('accepted')
        .then(async (conns) => {
          let currentProfileId = myProfileId;
          if (!currentProfileId) {
            const p = await profileApi.get().catch(() => null);
            if (p?.id) {
              currentProfileId = p.id;
              setMyProfileId(p.id);
            }
          }

          const uniqueMap = new Map<string, ConnectedAlumni>();
          (conns || []).forEach((conn: any) => {
            const other = conn.requester_id === currentProfileId ? conn.recipient : conn.requester;
            if (other && other.id && !uniqueMap.has(other.id)) {
              uniqueMap.set(other.id, {
                id: other.id,
                first_name: other.first_name || '',
                last_name: other.last_name || '',
                avatar_url: other.avatar_url,
                headline: other.headline,
                is_online: false,
                last_active_at: null,
              });
            }
          });

          const list = Array.from(uniqueMap.values());
          setConnectedAlumni(list);

          // Fetch presence for connected alumni
          if (list.length > 0) {
            messagesApi.getPresence(list.map((a) => a.id))
              .then((presenceMap) => {
                if (presenceMap) {
                  setConnectedAlumni((prev) =>
                    prev.map((a) => ({
                      ...a,
                      is_online: presenceMap[a.id]?.is_online ?? a.is_online,
                      last_active_at: presenceMap[a.id]?.last_active_at ?? a.last_active_at,
                    }))
                  );
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => setConnectedAlumni([]))
        .finally(() => setLoadingConnections(false));
    } else {
      setIsComposing(false);
      setIsCreatingGroup(false);
      setComposeSearch('');
    }
  }, [isHeaderDropdownOpen, myProfileId, setGroups]);

  // Presence polling: refresh conversations & connection presence every 8s while popover is open
  useEffect(() => {
    if (!isHeaderDropdownOpen) return;

    const refreshActivePresence = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const updatedConvs = await messagesApi.conversations();
        if (updatedConvs) setConversations(updatedConvs);

        if (activeTab === 'groups' || activeTab === 'all') {
          const updatedGrps = await messagesApi.groups();
          if (Array.isArray(updatedGrps)) setGroups(updatedGrps);
        }

        if (connectedAlumni.length > 0) {
          const presenceMap = await messagesApi.getPresence(connectedAlumni.map((a) => a.id));
          if (presenceMap) {
            setConnectedAlumni((prev) =>
              prev.map((a) => ({
                ...a,
                is_online: presenceMap[a.id]?.is_online ?? a.is_online,
                last_active_at: presenceMap[a.id]?.last_active_at ?? a.last_active_at,
              }))
            );
          }
        }
      } catch {
        // Silently ignore background polling hiccup
      }
    };

    const interval = setInterval(refreshActivePresence, 8000);
    return () => clearInterval(interval);
  }, [isHeaderDropdownOpen, connectedAlumni.length, activeTab, setGroups]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        fullName.includes(searchQuery.toLowerCase()) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [conversations, searchQuery]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const nameMatch = g.name.toLowerCase().includes(q);
      const memberMatch = (g.members || []).some((m) =>
        m.name.toLowerCase().includes(q)
      );
      const msgMatch = g.lastMessage?.toLowerCase().includes(q);
      return nameMatch || memberMatch || msgMatch;
    });
  }, [groups, searchQuery]);

  // Unified items list: when "all" is selected, both 1-on-1 and group convos are displayed
  const itemsToDisplay = useMemo(() => {
    if (activeTab === 'groups') {
      return filteredGroups.map((g) => ({
        kind: 'group' as const,
        group: g,
        timestamp: g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : 0,
      }));
    }

    if (activeTab === 'unread') {
      const unreadDirect = filteredConversations
        .filter((c) => c.unread > 0)
        .map((c) => ({
          kind: 'direct' as const,
          conv: c,
          timestamp: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
        }));
      const unreadGrps = filteredGroups
        .filter((g) => (g.unread ?? 0) > 0)
        .map((g) => ({
          kind: 'group' as const,
          group: g,
          timestamp: g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : 0,
        }));
      return [...unreadDirect, ...unreadGrps].sort((a, b) => b.timestamp - a.timestamp);
    }

    // activeTab === 'all': combine both direct conversations and group chats, sorted by latest activity
    const directItems = filteredConversations.map((c) => ({
      kind: 'direct' as const,
      conv: c,
      timestamp: c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0,
    }));
    const groupItems = filteredGroups.map((g) => ({
      kind: 'group' as const,
      group: g,
      timestamp: g.lastMessageAt ? new Date(g.lastMessageAt).getTime() : 0,
    }));
    return [...directItems, ...groupItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [activeTab, filteredConversations, filteredGroups]);

  // Filter connected alumni in compose/group create mode
  const filteredConnectedAlumni = connectedAlumni.filter((a) => {
    if (!composeSearch.trim()) return true;
    const name = `${a.first_name} ${a.last_name}`.toLowerCase();
    const headline = (a.headline || '').toLowerCase();
    const query = composeSearch.toLowerCase().trim();
    return name.includes(query) || headline.includes(query);
  });

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

  const handleSelectGroup = (g: ChatContact) => {
    openChat({
      profileId: g.profileId || (g as any).id,
      name: g.name,
      avatar: g.avatar,
      isGroup: true,
      admin_id: g.admin_id,
      isAdmin: g.isAdmin,
      myRole: g.myRole,
      members: g.members || [],
    });
    closeHeaderDropdown();
  };

  const handleSelectConnectedAlumni = (alumni: ConnectedAlumni) => {
    openChat({
      profileId: alumni.id,
      name: `${alumni.first_name} ${alumni.last_name}`.trim() || 'Alumni Contact',
      avatar: alumni.avatar_url,
      headline: alumni.headline,
      isOnline: alumni.is_online,
      lastActiveAt: alumni.last_active_at,
    });
    setIsComposing(false);
    setComposeSearch('');
    closeHeaderDropdown();
  };

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || creatingGroup) return;

    setCreatingGroup(true);
    try {
      const created = await messagesApi.createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        member_ids: selectedMemberIds,
      });

      if (created) {
        setGroups([created, ...groups.filter((g) => g.profileId !== created.id)]);
        openChat({
          profileId: created.id,
          name: created.name,
          isGroup: true,
          admin_id: created.admin_id,
          isAdmin: true,
          myRole: 'admin',
          members: created.members || [],
        });
        setIsCreatingGroup(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setSelectedMemberIds([]);
        closeHeaderDropdown();
      }
    } catch (err: any) {
      console.error('Failed to create group:', err);
      alert(err?.message || 'Failed to create group chat');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Messages Header Icon Button */}
      <button
        onClick={toggleHeaderDropdown}
        className={`relative p-1.5 rounded-lg transition-all ${
          isHeaderDropdownOpen
            ? 'bg-orange-50 text-orange-600'
            : unreadCount > 0
            ? 'text-orange-600 hover:bg-orange-50/70'
            : 'text-gray-500 hover:bg-gray-100'
        }`}
        title="Alumni Messages"
        aria-label="Alumni Messages"
      >
        <ChatBubbleLeftRightIcon className={`w-5 h-5 transition-transform ${isMessageRinging ? 'animate-bounce text-orange-600' : ''}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex items-center justify-center min-w-[16px] h-4 bg-orange-600 text-white text-[9px] font-bold rounded-full px-1 shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isHeaderDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] sm:w-[390px] bg-white border border-gray-200/90 rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[580px]">

          {/* Header Bar */}
          {isCreatingGroup ? (
            <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsCreatingGroup(false);
                    setComposeSearch('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                  title="Back"
                  aria-label="Back"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Create Group Chat</h2>
                  <p className="text-[11px] text-gray-500">You will be assigned as Group Admin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreatingGroup(false);
                  setComposeSearch('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                title="Cancel"
                aria-label="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : isComposing ? (
            <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between border-b border-gray-100 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsComposing(false);
                    setComposeSearch('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                  title="Back to conversations"
                  aria-label="Back"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">New Message</h2>
                  <p className="text-[11px] text-gray-500">Chat with connected alumni</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsComposing(false);
                  setComposeSearch('');
                }}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                title="Cancel"
                aria-label="Cancel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Alumni Messages</h2>
              <div className="flex items-center gap-1 text-gray-600">
                <button
                  onClick={() => {
                    setIsCreatingGroup(true);
                    setComposeSearch('');
                  }}
                  className="p-1.5 hover:bg-orange-50 rounded-full transition-colors text-gray-600 hover:text-orange-600"
                  title="Create new alumni group chat"
                  aria-label="Create group"
                >
                  <UserGroupIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setComposeSearch('');
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                  title="New conversation with connected alumni"
                  aria-label="New message"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* MAIN BODY */}
          {isCreatingGroup ? (
            <form onSubmit={handleCreateGroupSubmit} className="flex flex-col flex-1 overflow-hidden min-h-[380px]">
              {/* Group Name & Description Inputs */}
              <div className="p-3 border-b border-gray-100 bg-gray-50/70 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Group Name <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. BSIT Batch 2024, Project Team..."
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Short topic or group purpose..."
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Alumni Search & Multiselect */}
              <div className="p-2 border-b border-gray-100 bg-white">
                <div className="relative flex items-center bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-200 focus-within:border-orange-500">
                  <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1.5" />
                  <input
                    type="text"
                    value={composeSearch}
                    onChange={(e) => setComposeSearch(e.target.value)}
                    placeholder="Search connected alumni to add..."
                    className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
                  />
                  {composeSearch && (
                    <button type="button" onClick={() => setComposeSearch('')} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Connected Alumni List with Checkboxes */}
              <div className="flex-1 overflow-y-auto px-2 py-2 max-h-[220px]">
                {loadingConnections ? (
                  <div className="space-y-2 p-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-9 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                ) : connectedAlumni.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs text-gray-500">No connected alumni found yet.</p>
                  </div>
                ) : filteredConnectedAlumni.length === 0 ? (
                  <div className="py-6 px-4 text-center">
                    <p className="text-xs text-gray-500">No alumni matching "{composeSearch}"</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-0.5 text-[10px] text-gray-500 font-semibold uppercase">
                      <span>Add Members ({selectedMemberIds.length} selected)</span>
                    </div>
                    {filteredConnectedAlumni.map((alumni) => {
                      const isSelected = selectedMemberIds.includes(alumni.id);
                      const fullName = `${alumni.first_name} ${alumni.last_name}`.trim();
                      const initials = (alumni.first_name?.[0] || 'A') + (alumni.last_name?.[0] || '');

                      return (
                        <div
                          key={alumni.id}
                          onClick={() => toggleMemberSelection(alumni.id)}
                          className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                            isSelected ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {alumni.avatar_url ? (
                              <img src={alumni.avatar_url} alt={fullName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{fullName}</p>
                              {alumni.headline && (
                                <p className="text-[10px] text-gray-500 truncate">{alumni.headline}</p>
                              )}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-orange-600 text-white' : 'border border-gray-300 bg-white'
                          }`}>
                            {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="p-3 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-500 font-medium">
                  {selectedMemberIds.length + 1} total members (incl. you as Admin)
                </span>
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || creatingGroup}
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {creatingGroup ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <UserGroupIcon className="w-4 h-4" />
                      <span>Create Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : isComposing ? (
            <div className="flex flex-col flex-1 overflow-hidden min-h-[320px]">
              {/* Connected Alumni Search Input */}
              <div className="p-3 border-b border-gray-100 bg-gray-50/70">
                <div className="relative flex items-center bg-white rounded-full px-3 py-1.5 transition-colors border border-gray-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 shadow-xs">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    autoFocus
                    value={composeSearch}
                    onChange={(e) => setComposeSearch(e.target.value)}
                    placeholder="Search connected alumni..."
                    className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                  />
                  {composeSearch && (
                    <button
                      onClick={() => setComposeSearch('')}
                      className="text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Connected Alumni List */}
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {loadingConnections ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                          <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : connectedAlumni.length === 0 ? (
                  <div className="py-10 px-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">No connected alumni yet</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      You can only send direct messages to alumni you are connected with.
                    </p>
                    <button
                      onClick={() => {
                        closeHeaderDropdown();
                        navigate('/connections');
                      }}
                      className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors"
                    >
                      Find & Connect with Alumni
                    </button>
                  </div>
                ) : filteredConnectedAlumni.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <p className="text-sm font-medium text-gray-600">No matching connections</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No connected alumni found matching "{composeSearch}"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                      Connected Alumni ({filteredConnectedAlumni.length})
                    </p>
                    {filteredConnectedAlumni.map((alumni) => {
                      const fullName = `${alumni.first_name} ${alumni.last_name}`.trim() || 'Alumni Contact';
                      const initials = (alumni.first_name?.[0] || 'A') + (alumni.last_name?.[0] || '');

                      return (
                        <div
                          key={alumni.id}
                          onClick={() => handleSelectConnectedAlumni(alumni)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-orange-50/80 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              {alumni.avatar_url ? (
                                <img
                                  src={alumni.avatar_url}
                                  alt={fullName}
                                  className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                  {initials}
                                </div>
                              )}
                              {alumni.is_online ? (
                                <span className="absolute bottom-0 right-0 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                                </span>
                              ) : (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-gray-300 border-2 border-white rounded-full" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                                  {fullName}
                                </p>
                                {alumni.is_online ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full shrink-0">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Active now
                                  </span>
                                ) : alumni.last_active_at ? (
                                  <span className="text-[9px] text-gray-400 shrink-0">
                                    {formatLastActive(alumni.last_active_at)}
                                  </span>
                                ) : null}
                              </div>
                              {alumni.headline ? (
                                <p className="text-[11px] text-gray-500 truncate">{alumni.headline}</p>
                              ) : (
                                <p className="text-[11px] text-gray-400 italic">Connected Alumni</p>
                              )}
                            </div>
                          </div>

                          <span className="text-[11px] text-orange-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                            Chat →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search Input */}
              <div className="px-4 py-1.5">
                <div className="relative flex items-center bg-gray-100/90 hover:bg-gray-100 rounded-full px-3 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:bg-white border border-transparent focus-within:border-orange-400">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-500 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'groups' ? 'Search group chats...' : 'Search conversations...'}
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
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs">
                <div className="flex items-center gap-1">
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
                    className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === 'groups'
                        ? 'bg-orange-100 text-orange-700 font-bold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    Groups {groups.length > 0 && `(${groups.length})`}
                  </button>
                </div>

                {activeTab === 'groups' && (
                  <button
                    onClick={() => {
                      setIsCreatingGroup(true);
                      setComposeSearch('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-3.5 h-3.5 stroke-2" />
                    <span>New Group</span>
                  </button>
                )}
              </div>

              {/* LIST BODY: Conversations & Groups */}
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
                ) : itemsToDisplay.length > 0 ? (
                  itemsToDisplay.map((item) => {
                    if (item.kind === 'group') {
                      const group = item.group;
                      const memberCount = group.members?.length || 0;
                      return (
                        <div
                          key={`group-${group.profileId}`}
                          onClick={() => handleSelectGroup(group)}
                          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100/90 transition-colors cursor-pointer group"
                        >
                          {/* Group Avatar */}
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-sm shadow-xs ring-1 ring-orange-200">
                              <UserGroupIcon className="w-6 h-6" />
                            </div>
                            {group.isAdmin && (
                              <span
                                className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-xs"
                                title="You are the Admin of this group"
                              >
                                <ShieldCheckIcon className="w-3.5 h-3.5 stroke-2" />
                              </span>
                            )}
                          </div>

                          {/* Group Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                                  {group.name}
                                </p>
                                {activeTab === 'all' && (
                                  <span className="text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-200/80 px-1.5 py-0.2 rounded-md shrink-0">
                                    Group
                                  </span>
                                )}
                                {group.isAdmin && (
                                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-md shrink-0">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] shrink-0 ml-1.5 text-gray-400">
                                {formatRelativeTime(group.lastMessageAt || undefined)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <p className="text-xs truncate max-w-[210px] text-gray-500">
                                {group.lastMessage || `${memberCount} alumni members`}
                              </p>
                              <span className="text-[10px] font-medium text-gray-400 shrink-0 ml-2">
                                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const conv = item.conv;
                    const fullName = `${conv.first_name || ''} ${conv.last_name || ''}`.trim() || 'Alumni Contact';
                    const initials = (conv.first_name?.[0] || 'A') + (conv.last_name?.[0] || '');

                    return (
                      <div
                        key={`direct-${conv.profile_id}`}
                        onClick={() => handleSelectConversation(conv)}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-100/90 transition-colors cursor-pointer group"
                      >
                        {/* Avatar */}
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
                          {conv.is_online ? (
                            <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                            </span>
                          ) : (
                            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-gray-300 border-2 border-white rounded-full" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                {fullName}
                              </p>
                              {conv.is_online ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-full shrink-0">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  Active now
                                </span>
                              ) : conv.last_active_at ? (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {formatLastActive(conv.last_active_at)}
                                </span>
                              ) : null}
                            </div>
                            <span className={`text-[11px] shrink-0 ml-1.5 ${conv.unread > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
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
                ) : searchQuery.trim() ? (
                  <div className="py-8 px-4 text-center">
                    <MagnifyingGlassIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-800">No results found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      No {activeTab === 'groups' ? 'group chats' : 'conversations'} matching "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : activeTab === 'groups' ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-2 shadow-xs">
                      <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">No group chats yet</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      Create a group chat to connect, coordinate, and converse with fellow alumni together.
                    </p>
                    <button
                      onClick={() => {
                        setIsCreatingGroup(true);
                        setComposeSearch('');
                      }}
                      className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Create Group Chat
                    </button>
                  </div>
                ) : activeTab === 'unread' ? (
                  <div className="py-8 px-4 text-center">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-800">No unread messages</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      You are all caught up! Check back later or view all conversations.
                    </p>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
                    >
                      View all conversations
                    </button>
                  </div>
                ) : (
                  <div className="py-8 px-4 text-center">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">No conversations yet</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                      Start a chat with a connected alumnus or create a group chat.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setIsComposing(true)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Start a chat
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingGroup(true);
                          setComposeSearch('');
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <UserGroupIcon className="w-4 h-4" />
                        Create Group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
