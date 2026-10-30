import { useState, useEffect, useRef } from 'react';
import {
  MinusIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  PlusIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/store/chatStore';
import { messagesApi, profileApi, connectionsApi } from '@/services/api';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { playTing } from '@/utils/helpers';

const MESSENGER_REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '👍', label: 'Like' },
];

function isOnlyEmojis(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\uFE0F|\u200D)+/g;
  const stripped = trimmed.replace(emojiRegex, '').replace(/\s+/g, '');
  return stripped.length === 0;
}

interface ReplyPreviewData {
  id: string;
  sender_id?: string;
  sender_name: string;
  body: string;
}

interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id?: string;
  body: string;
  created_at: string;
  failed?: boolean;
  sender_name?: string;
  sender_avatar?: string;
  reply_to_id?: string | null;
  reply_preview?: ReplyPreviewData | null;
  reactions?: Record<string, { emoji: string; name?: string; updated_at?: string } | string>;
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

  if (diffMins < 3) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  return 'Offline';
}

let cachedProfileId: string | null = null;
let cachedProfileName: string | null = null;

export default function DockedChatBox() {
  const {
    activeChat,
    isOpen,
    minimizedChats,
    minimizeChat,
    restoreChat,
    closeChat,
    dismissMinimizedChat,
    closeHeaderDropdown,
    updatePresence,
    updateGroupMembers,
    removeMemberFromGroup,
    leaveGroup,
    replyingTo,
    setReplyingTo,
  } = useChatStore();

  const [overflowHovered, setOverflowHovered] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(cachedProfileId);
  const [currentProfileName, setCurrentProfileName] = useState<string>(cachedProfileName || 'You');
  const [loadingChat, setLoadingChat] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddAlumni, setShowAddAlumni] = useState(false);
  const [connectedAlumni, setConnectedAlumni] = useState<any[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const prevMsgCountRef = useRef<number>(0);

  // Fetch current user's profile ID and name
  useEffect(() => {
    profileApi.get()
      .then((p) => {
        if (p?.id) {
          cachedProfileId = p.id;
          setCurrentProfileId(p.id);
        }
        const fullName = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
        if (fullName) {
          cachedProfileName = fullName;
          setCurrentProfileName(fullName);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch presence for direct chat contacts and minimized conversation heads
  const refreshPresence = async () => {
    const idsToQuery = [
      ...(activeChat?.profileId && !activeChat.isGroup ? [activeChat.profileId] : []),
      ...minimizedChats.filter((c) => !c.isGroup).map((c) => c.profileId),
    ];
    if (idsToQuery.length === 0) return;
    try {
      const presenceMap = await messagesApi.getPresence(idsToQuery);
      updatePresence(presenceMap);
    } catch {
      // Ignore network hiccup
    }
  };

  useEffect(() => {
    refreshPresence();
  }, [activeChat?.profileId, minimizedChats.length]);

  // Fetch conversation or group messages
  const loadMessages = async (isInitial = false) => {
    if (!activeChat?.profileId) return;
    if (isInitial) setLoadingChat(true);
    try {
      const data = activeChat.isGroup
        ? await messagesApi.getGroupMessages(activeChat.profileId)
        : await messagesApi.getConversation(activeChat.profileId);

      if (Array.isArray(data)) {
        let hasNewIncoming = false;
        data.forEach((d: any) => {
          if (!knownMessageIdsRef.current.has(d.id)) {
            if (currentProfileId ? d.sender_id !== currentProfileId : d.sender_id !== 'me') {
              hasNewIncoming = true;
            }
            knownMessageIdsRef.current.add(d.id);
          }
        });

        if (hasNewIncoming && !isInitial) {
          playTing();
        }

        const normalized: MessageItem[] = data.map((d: any) => {
          const senderObj = Array.isArray(d.sender) ? d.sender[0] : d.sender;
          const senderName =
            d.sender_name ||
            (senderObj ? `${senderObj.first_name || ''} ${senderObj.last_name || ''}`.trim() : null) ||
            (!activeChat.isGroup && d.sender_id === activeChat.profileId ? activeChat.name : null);
          const senderAvatar =
            d.sender_avatar ||
            senderObj?.avatar_url ||
            (!activeChat.isGroup && d.sender_id === activeChat.profileId ? activeChat.avatar : null);

          return {
            ...d,
            sender_name: senderName || undefined,
            sender_avatar: senderAvatar || undefined,
          };
        });

        setMessages((prev) => {
          // Keep pending optimistic messages that haven't been confirmed yet
          const pending = prev.filter(
            (p) =>
              p.id.startsWith('temp-') &&
              !normalized.some(
                (d) =>
                  d.id === p.id ||
                  (d.body === p.body && (d.sender_id === p.sender_id || p.sender_id === 'me'))
              )
          );
          return [...normalized, ...pending];
        });
      }
    } catch {
      // Ignore network hiccup
    } finally {
      if (isInitial) setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (activeChat?.profileId && isOpen) {
      setMessages([]);
      setInputText('');
      setShowGroupInfo(false);
      setShowAddAlumni(false);
      setActiveReactionMsgId(null);
      setReplyingTo(null);
      prevMsgCountRef.current = 0;
      knownMessageIdsRef.current.clear();
      loadMessages(true);
      if (!activeChat.isGroup) refreshPresence();

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadMessages(false);
          if (!activeChat.isGroup) refreshPresence();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeChat?.profileId, isOpen]);

  // Load connected alumni when opening group details/add member
  useEffect(() => {
    if (showAddAlumni && activeChat?.isGroup) {
      connectionsApi.list('accepted')
        .then((conns) => {
          const list = (conns || []).map((conn: any) => {
            const other = conn.requester_id === currentProfileId ? conn.recipient : conn.requester;
            return other;
          }).filter(Boolean);
          setConnectedAlumni(list);
        })
        .catch(() => setConnectedAlumni([]));
    }
  }, [showAddAlumni, activeChat?.isGroup, currentProfileId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && !showGroupInfo) {
      if (messages.length > prevMsgCountRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      prevMsgCountRef.current = messages.length;
    }
  }, [messages, isOpen, showGroupInfo]);

  const scrollToMessage = (targetMsgId?: string | null) => {
    if (!targetMsgId) return;
    const el = document.getElementById(`chat-msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetMsgId);
      setTimeout(() => {
        setHighlightedMsgId((prev) => (prev === targetMsgId ? null : prev));
      }, 1800);
    }
  };

  const handleToggleReaction = async (msg: MessageItem, emoji: string) => {
    if (!activeChat?.profileId || msg.id.startsWith('temp-')) return;
    setActiveReactionMsgId(null);

    const myKey = currentProfileId || 'me';
    const currentReactions = { ...(msg.reactions || {}) };
    const existing = currentReactions[myKey];
    const existingEmoji = typeof existing === 'string' ? existing : existing?.emoji;

    if (existingEmoji === emoji) {
      delete currentReactions[myKey];
    } else {
      currentReactions[myKey] = {
        emoji,
        name: currentProfileName,
        updated_at: new Date().toISOString(),
      };
    }

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, reactions: currentReactions } : m))
    );

    try {
      const res = activeChat.isGroup
        ? await messagesApi.reactGroupMessage(activeChat.profileId, msg.id, emoji)
        : await messagesApi.react(msg.id, emoji);
      if (res?.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, reactions: res.reactions } : m))
        );
      }
    } catch {
      // Reload on hiccup
      loadMessages(false);
    }
  };

  const handleStartReply = (msg: MessageItem, senderDisplayName: string, isMe: boolean) => {
    setActiveReactionMsgId(null);
    setReplyingTo({
      id: msg.id,
      senderId: msg.sender_id,
      senderName: isMe ? currentProfileName : senderDisplayName,
      body: msg.body,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeChat?.profileId) return;

    if (!textToSend) {
      setInputText('');
    }

    const currentReply = replyingTo;
    if (currentReply) {
      setReplyingTo(null);
    }

    const replyPreview: ReplyPreviewData | null = currentReply
      ? {
          id: currentReply.id,
          sender_id: currentReply.senderId,
          sender_name: currentReply.senderName,
          body: currentReply.body,
        }
      : null;

    const targetProfileId = activeChat.profileId;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentProfileId || 'me',
      receiver_id: targetProfileId,
      body: text,
      created_at: new Date().toISOString(),
      reply_to_id: currentReply?.id || null,
      reply_preview: replyPreview,
      reactions: {},
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 10);

    try {
      const realMsg = activeChat.isGroup
        ? await messagesApi.sendGroupMessage(
            targetProfileId,
            text,
            currentReply?.id || null,
            replyPreview
          )
        : await messagesApi.send(
            targetProfileId,
            text,
            undefined,
            undefined,
            currentReply?.id || null,
            replyPreview
          );

      if (realMsg?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: realMsg.id,
                  created_at: realMsg.created_at || m.created_at,
                  sender_id: realMsg.sender_id || m.sender_id,
                  sender_name: realMsg.sender_name || m.sender_name,
                  sender_avatar: realMsg.sender_avatar || m.sender_avatar,
                  reply_to_id: realMsg.reply_to_id ?? m.reply_to_id,
                  reply_preview: realMsg.reply_preview ?? m.reply_preview,
                  reactions: realMsg.reactions ?? m.reactions,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to deliver message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault();
      setReplyingTo(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group Management Actions
  const isGroupAdmin = Boolean(
    activeChat?.isGroup &&
    (activeChat.isAdmin ||
      activeChat.myRole === 'admin' ||
      (currentProfileId && activeChat.admin_id === currentProfileId))
  );

  const handleRemoveMember = async (targetMemberProfileId: string) => {
    if (!activeChat?.profileId || groupActionLoading) return;
    if (!window.confirm('Are you sure you want to remove this alumnus from the group chat?')) return;

    setGroupActionLoading(true);
    try {
      await messagesApi.removeGroupMember(activeChat.profileId, targetMemberProfileId);
      removeMemberFromGroup(activeChat.profileId, targetMemberProfileId);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove member');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleAddMember = async (targetMemberProfileId: string) => {
    if (!activeChat?.profileId || groupActionLoading) return;

    setGroupActionLoading(true);
    try {
      const res = await messagesApi.addGroupMembers(activeChat.profileId, [targetMemberProfileId]);
      if (res?.members) {
        updateGroupMembers(activeChat.profileId, res.members);
      }
      setShowAddAlumni(false);
      setAlumniSearch('');
    } catch (err: any) {
      alert(err?.message || 'Failed to add member to group');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeChat?.profileId || groupActionLoading) return;
    if (!window.confirm('Are you sure you want to leave this group chat? You will no longer receive group messages.')) return;

    setGroupActionLoading(true);
    try {
      await messagesApi.leaveGroup(activeChat.profileId);
      leaveGroup(activeChat.profileId);
    } catch (err: any) {
      alert(err?.message || 'Failed to leave group');
    } finally {
      setGroupActionLoading(false);
    }
  };

  if (!activeChat && (!minimizedChats || minimizedChats.length === 0)) return null;

  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return (
      name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'A'
    );
  };

  const visibleChats = minimizedChats.slice(0, 5);
  const overflowChats = minimizedChats.slice(5);
  const overflowCount = overflowChats.length;

  return (
    <>
      {/* 1. Minimized State: Floating Avatars Stack */}
      {minimizedChats.length > 0 && (
        <div className="fixed right-[11px] bottom-12 z-40 flex flex-col items-end gap-2.5">
          {visibleChats.map((c) => {
            const initials = getInitials(c.name);
            return (
              <div
                key={c.profileId}
                onMouseDown={closeHeaderDropdown}
                className="relative flex items-center group"
              >
                <div className="hidden group-hover:block absolute right-full mr-2.5 bg-gray-900/90 text-white text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none z-50">
                  {c.name} {c.isGroup && '(Group)'}
                </div>

                <button
                  onClick={() => restoreChat(c)}
                  className="relative w-[51px] h-[51px] rounded-full bg-white shadow-2xl ring-2 ring-orange-500/80 cursor-pointer flex items-center justify-center p-0.5 border border-gray-200 hover:scale-105 active:scale-95 transition-all duration-200"
                  title={c.name}
                  aria-label={c.name}
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : c.isGroup ? (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-xs">
                      <UserGroupIcon className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {initials}
                    </div>
                  )}

                  {!c.isGroup && c.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/20" />
                  )}

                  {typeof c.unread === 'number' && c.unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex items-center justify-center w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
                        {c.unread > 9 ? '9+' : c.unread}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {overflowCount > 0 && (
            <div
              className="relative flex items-center"
              onMouseEnter={() => setOverflowHovered(true)}
              onMouseLeave={() => setOverflowHovered(false)}
              onMouseDown={closeHeaderDropdown}
            >
              {overflowHovered && (
                <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 min-w-[220px] max-w-[280px] bg-white border border-gray-200/90 rounded-2xl shadow-2xl py-2 px-1 z-50">
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-t border-r border-gray-200/90 rotate-45 pointer-events-none" />

                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {overflowChats.map((c) => (
                      <div
                        key={c.profileId}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-gray-100/90 transition-colors cursor-pointer group/row"
                      >
                        <span
                          onClick={() => {
                            restoreChat(c);
                            setOverflowHovered(false);
                          }}
                          className="text-sm font-semibold text-gray-900 truncate hover:text-orange-600 flex-1 text-left"
                        >
                          {c.name}{typeof c.unread === 'number' && c.unread > 0 ? ` (${c.unread})` : ''}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissMinimizedChat(c.profileId);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/80 rounded-full transition-colors shrink-0"
                          title="Close conversation"
                        >
                          <XMarkIcon className="w-4 h-4 stroke-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setOverflowHovered((prev) => !prev)}
                className="relative w-[51px] h-[51px] rounded-full bg-gray-900 shadow-2xl ring-2 ring-orange-500/90 cursor-pointer flex items-center justify-center p-0.5 border border-gray-200 overflow-hidden"
                title={`${overflowCount} more conversations`}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-bold flex items-center justify-center text-xs">
                  {getInitials(overflowChats[0]?.name)}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-base tracking-tight">
                    +{overflowCount}
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Open Docked State: Bottom-right chat window */}
      {isOpen && activeChat && (
        <div
          onMouseDown={closeHeaderDropdown}
          onClick={closeHeaderDropdown}
          className="fixed bottom-0 right-4 sm:right-12 md:right-20 w-[350px] sm:w-[375px] h-[480px] max-h-[85vh] bg-white rounded-t-2xl shadow-2xl border border-gray-300 z-40 flex flex-col overflow-hidden"
        >
          {/* Top Title Bar */}
          <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {showGroupInfo ? (
                <button
                  onClick={() => setShowGroupInfo(false)}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition-colors mr-0.5"
                  title="Back to chat messages"
                >
                  <ArrowLeftIcon className="w-4 h-4 stroke-2" />
                </button>
              ) : null}

              <div className="relative shrink-0">
                {activeChat.avatar ? (
                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : activeChat.isGroup ? (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    <UserGroupIcon className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {getInitials(activeChat.name)}
                  </div>
                )}
                {!activeChat.isGroup && activeChat.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/20" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-snug">
                  {activeChat.name}
                </p>
                {activeChat.isGroup ? (
                  <button
                    onClick={() => setShowGroupInfo((v) => !v)}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-medium leading-none flex items-center gap-1 cursor-pointer"
                  >
                    <span>{activeChat.members?.length || 0} members</span>
                    {isGroupAdmin && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                        Admin
                      </span>
                    )}
                  </button>
                ) : activeChat.isOnline ? (
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                    Active now
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block" />
                    {formatLastActive(activeChat.lastActiveAt)}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons: Group Details, Minimize, Close */}
            <div className="flex items-center gap-1 text-gray-500">
              {activeChat.isGroup && (
                <button
                  onClick={() => setShowGroupInfo((v) => !v)}
                  className={`p-1 rounded-full transition-colors ${
                    showGroupInfo ? 'bg-orange-100 text-orange-600' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Group Details & Members"
                  aria-label="Group details"
                >
                  <UserGroupIcon className="w-4 h-4 stroke-2" />
                </button>
              )}
              <button
                onClick={() => minimizeChat(activeChat)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="Minimize conversation"
                aria-label="Minimize"
              >
                <MinusIcon className="w-4 h-4 stroke-2" />
              </button>
              <button
                onClick={closeChat}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="Close conversation"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4 stroke-2" />
              </button>
            </div>
          </div>

          {/* VIEW: Group Details & Management Panel */}
          {showGroupInfo && activeChat.isGroup ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 bg-gray-50/50">
              {/* Group Overview Banner */}
              <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-xs">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-lg mb-2 shadow-xs">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">{activeChat.name}</h3>
                {activeChat.headline && (
                  <p className="text-xs text-gray-500 mt-0.5">{activeChat.headline}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {activeChat.members?.length || 0} Members
                  </span>
                  {isGroupAdmin ? (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheckIcon className="w-3.5 h-3.5" />
                      You are Admin
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      Member
                    </span>
                  )}
                </div>
              </div>

              {/* Members Section Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Members ({activeChat.members?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowAddAlumni((v) => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5" />
                    <span>Add Alumni</span>
                  </button>
                </div>

                {/* Add Alumni Panel */}
                {showAddAlumni && (
                  <div className="p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2 mb-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-orange-900">Add Connected Alumni</p>
                      <button
                        onClick={() => setShowAddAlumni(false)}
                        className="text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      placeholder="Filter connected alumni..."
                      className="w-full px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-orange-500"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {connectedAlumni
                        .filter((a) => {
                          const existingIds = (activeChat.members || []).map((m) => m.profile_id || m.id);
                          if (existingIds.includes(a.id)) return false;
                          if (!alumniSearch.trim()) return true;
                          const name = `${a.first_name} ${a.last_name}`.toLowerCase();
                          return name.includes(alumniSearch.toLowerCase());
                        })
                        .map((alumni) => {
                          const name = `${alumni.first_name} ${alumni.last_name}`.trim();
                          return (
                            <div
                              key={alumni.id}
                              className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-100"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {alumni.avatar_url ? (
                                  <img src={alumni.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                                    {getInitials(name)}
                                  </div>
                                )}
                                <span className="text-xs font-semibold text-gray-800 truncate">{name}</span>
                              </div>
                              <button
                                onClick={() => handleAddMember(alumni.id)}
                                disabled={groupActionLoading}
                                className="px-2 py-0.5 text-[10px] font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded shadow-xs"
                              >
                                + Add
                              </button>
                            </div>
                          );
                        })}
                      {connectedAlumni.filter((a) => {
                        const existingIds = (activeChat.members || []).map((m) => m.profile_id || m.id);
                        return !existingIds.includes(a.id);
                      }).length === 0 && (
                        <p className="text-[11px] text-gray-500 text-center py-2 italic">
                          All connected alumni are already in this group.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Member List */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(activeChat.members || []).map((m) => {
                    const isMemberAdmin = m.role === 'admin' || (activeChat.admin_id && m.profile_id === activeChat.admin_id);
                    const isMe = currentProfileId && (m.profile_id === currentProfileId || m.id === currentProfileId);

                    return (
                      <div
                        key={m.profile_id || m.id}
                        className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-gray-600 to-gray-800 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                              {getInitials(m.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {m.name} {isMe && '(You)'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isMemberAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Admin
                            </span>
                          )}

                          {/* Only Group Admin can remove other members */}
                          {isGroupAdmin && !isMe && (
                            <button
                              onClick={() => handleRemoveMember(m.profile_id || m.id!)}
                              disabled={groupActionLoading}
                              className="px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded transition-colors"
                              title="Remove member from group"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leave Group Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  disabled={groupActionLoading}
                  className="w-full py-2 px-3 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 stroke-2" />
                  <span>Leave Group Chat</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW: Message List */
            <>
              <div
                onClick={() => setActiveReactionMsgId(null)}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2.5 bg-gradient-to-b from-gray-50/50 to-white"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl font-bold mb-2 shadow-inner">
                      {activeChat.isGroup ? <UserGroupIcon className="w-8 h-8" /> : getInitials(activeChat.name)}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{activeChat.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activeChat.isGroup ? 'Group Chat created' : 'You are connected on CTU-Naga Alumni Connect.'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {activeChat.isGroup
                        ? 'Send the first message to start the conversation with the group!'
                        : 'Send a message to start networking with your fellow alumnus.'}
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe =
                      m.id.startsWith('temp-') ||
                      (currentProfileId ? m.sender_id === currentProfileId : m.sender_id !== activeChat.profileId);
                    const emojiOnly = isOnlyEmojis(m.body);
                    const isPending = m.id.startsWith('temp-');
                    const isFailed = m.failed;

                    // Resolve sender name and avatar for incoming messages (1-on-1 and group chats)
                    let senderName = 'Alumni Contact';
                    let senderAvatar: string | null | undefined = null;

                    if (!isMe) {
                      if (activeChat.isGroup) {
                        const member = (activeChat.members || []).find(
                          (mem: any) => (mem.profile_id || mem.id) === m.sender_id
                        );
                        senderName = m.sender_name || member?.name || 'Alumnus';
                        senderAvatar = m.sender_avatar || member?.avatar || null;
                      } else {
                        senderName = activeChat.name || m.sender_name || 'Alumni Contact';
                        senderAvatar = activeChat.avatar || m.sender_avatar || null;
                      }
                    }

                    // Resolve replied-to message details
                    const fallbackReplied = m.reply_to_id
                      ? messages.find((orig) => orig.id === m.reply_to_id)
                      : null;
                    const replyInfo: ReplyPreviewData | null =
                      m.reply_preview ||
                      (fallbackReplied
                        ? {
                            id: fallbackReplied.id,
                            sender_id: fallbackReplied.sender_id,
                            sender_name:
                              fallbackReplied.sender_id === currentProfileId
                                ? currentProfileName
                                : fallbackReplied.sender_name || activeChat.name || 'Alumni',
                            body: fallbackReplied.body,
                          }
                        : null);

                    let replyHeaderText = '';
                    if (replyInfo) {
                      const repliedToMe =
                        Boolean(currentProfileId && replyInfo.sender_id === currentProfileId) ||
                        replyInfo.sender_name === currentProfileName;
                      const repliedToSelf = replyInfo.sender_id && replyInfo.sender_id === m.sender_id;

                      if (isMe) {
                        replyHeaderText = repliedToMe
                          ? 'You replied to yourself'
                          : `You replied to ${replyInfo.sender_name}`;
                      } else {
                        replyHeaderText = repliedToMe
                          ? `${senderName} replied to you`
                          : repliedToSelf
                            ? `${senderName} replied to themselves`
                            : `${senderName} replied to ${replyInfo.sender_name}`;
                      }
                    }

                    // Resolve reactions summary
                    const rawReactions = m.reactions || {};
                    const reactionList = Object.entries(rawReactions)
                      .map(([pid, val]) => {
                        const emoji = typeof val === 'string' ? val : val?.emoji;
                        const name =
                          pid === currentProfileId || pid === 'me'
                            ? 'You'
                            : (typeof val === 'object' && val?.name) || activeChat.name || 'Alumnus';
                        return emoji ? { profileId: pid, emoji, name } : null;
                      })
                      .filter(Boolean) as Array<{ profileId: string; emoji: string; name: string }>;

                    const myReactionObj = reactionList.find(
                      (r) => r.profileId === currentProfileId || r.profileId === 'me'
                    );
                    const myReactionEmoji = myReactionObj?.emoji || null;

                    const emojiCounts = new Map<string, number>();
                    reactionList.forEach((r) => {
                      emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) || 0) + 1);
                    });
                    const distinctEmojis = Array.from(emojiCounts.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([em]) => em)
                      .slice(0, 3);
                    const totalReactions = reactionList.length;
                    const reactionTooltip = reactionList.map((r) => `${r.emoji} ${r.name}`).join(', ');
                    const showReactionPopup = activeReactionMsgId === m.id;
                    const isHighlighted = highlightedMsgId === m.id;

                    // Messenger floating reaction picker popover
                    const reactionPickerPopover = showReactionPopup && !isPending && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute bottom-full mb-1.5 z-30 bg-white border border-gray-200/90 rounded-full shadow-xl px-2 py-1 flex items-center gap-1 animate-fade-in ${
                          isMe ? 'right-0' : 'left-0'
                        }`}
                      >
                        {MESSENGER_REACTIONS.map((r) => {
                          const isSelected = myReactionEmoji === r.emoji;
                          return (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => handleToggleReaction(m, r.emoji)}
                              title={r.label}
                              className={`relative text-lg leading-none p-1 rounded-full hover:scale-130 active:scale-95 transition-transform cursor-pointer ${
                                isSelected ? 'bg-orange-100 ring-1 ring-orange-400' : 'hover:bg-gray-100'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              {isSelected && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );

                    // Hover action buttons (React + Reply) like Messenger
                    const messageActionButtons = !isPending && !isFailed && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-0.5 self-center shrink-0 transition-opacity duration-150 ${
                          showReactionPopup ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setActiveReactionMsgId((prev) => (prev === m.id ? null : m.id))
                          }
                          className={`p-1 rounded-full transition-colors cursor-pointer ${
                            showReactionPopup || myReactionEmoji
                              ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                          title="React to message"
                        >
                          <FaceSmileIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartReply(m, senderName, isMe)}
                          className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Reply to message"
                        >
                          <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );

                    // Reaction pill badge anchored to bottom corner of message bubble
                    const reactionBadge = totalReactions > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReactionMsgId((prev) => (prev === m.id ? null : m.id));
                        }}
                        title={reactionTooltip}
                        className={`absolute -bottom-2.5 ${
                          isMe ? 'right-2' : 'left-2'
                        } z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white border ${
                          myReactionEmoji ? 'border-orange-300 bg-orange-50/40' : 'border-gray-200'
                        } shadow-sm text-[11px] leading-none hover:scale-105 transition-transform cursor-pointer`}
                      >
                        <span className="flex items-center -space-x-0.5">
                          {distinctEmojis.map((em) => (
                            <span key={em}>{em}</span>
                          ))}
                        </span>
                        {totalReactions > 1 && (
                          <span className="text-[10px] font-bold text-gray-700 pl-0.5">
                            {totalReactions}
                          </span>
                        )}
                      </button>
                    );

                    if (isMe) {
                      return (
                        <div
                          id={`chat-msg-${m.id}`}
                          key={m.id}
                          className={`group/msg w-full flex justify-end transition-all duration-300 rounded-xl ${
                            isPending ? 'opacity-90' : 'opacity-100'
                          } ${isHighlighted ? 'bg-orange-100/70 ring-2 ring-orange-300 p-1' : ''}`}
                        >
                          <div className="flex flex-col items-end max-w-[85%] min-w-0">
                            {/* Replied-to Quote Header & Bubble */}
                            {replyInfo && (
                              <div className="flex flex-col items-end max-w-full mb-0.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mr-1 mb-0.5">
                                  <ArrowUturnLeftIcon className="w-2.5 h-2.5" />
                                  {replyHeaderText}
                                </span>
                                <div
                                  onClick={() => scrollToMessage(replyInfo.id)}
                                  className="px-3 py-1.5 rounded-2xl rounded-br-xs text-xs bg-gray-100 text-gray-600 border-r-2 border-orange-400 max-w-full break-words [overflow-wrap:anywhere] line-clamp-2 cursor-pointer hover:bg-gray-200/80 transition-colors"
                                  title="Click to view original message"
                                >
                                  {replyInfo.body}
                                </div>
                              </div>
                            )}

                            {/* Message Row with Left Hover Actions */}
                            <div
                              className={`relative flex items-center justify-end gap-1.5 max-w-full min-w-0 ${
                                totalReactions > 0 ? 'mb-2.5' : ''
                              }`}
                            >
                              {reactionPickerPopover}
                              {messageActionButtons}

                              <div className="relative max-w-full min-w-0">
                                {emojiOnly ? (
                                  <div
                                    className="text-3xl sm:text-4xl py-0.5 px-1 select-none animate-emoji-pop text-right"
                                    title={m.body}
                                  >
                                    {m.body}
                                  </div>
                                ) : (
                                  <div
                                    className={`max-w-full px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap bg-orange-600 text-white rounded-br-xs shadow-xs ${
                                      isFailed ? 'border border-red-400 bg-red-600 text-white' : ''
                                    }`}
                                  >
                                    {m.body}
                                  </div>
                                )}
                                {reactionBadge}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 px-1 mt-0.5">
                              <span className="text-[9px] text-gray-400">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isPending && (
                                <span className="text-[9px] text-gray-400 italic">Sending...</span>
                              )}
                              {isFailed && (
                                <span className="text-[9px] text-red-500 font-semibold">Failed to send</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        id={`chat-msg-${m.id}`}
                        key={m.id}
                        className={`group/msg w-full flex justify-start transition-all duration-300 rounded-xl ${
                          isHighlighted ? 'bg-orange-100/70 ring-2 ring-orange-300 p-1' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 max-w-[88%] min-w-0">
                          {/* Profile Picture Icon */}
                          <div className="relative shrink-0 mt-0.5" title={senderName}>
                            {senderAvatar ? (
                              <img
                                src={senderAvatar}
                                alt={senderName}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200/90 shadow-2xs"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
                                {getInitials(senderName)}
                              </div>
                            )}
                          </div>

                          {/* Message Content & Sender Info */}
                          <div className="flex flex-col items-start min-w-0 max-w-full">
                            {/* Sender Name */}
                            <span className="text-[11px] font-semibold text-gray-700 mb-0.5 ml-1 select-none truncate max-w-full">
                              {senderName}
                            </span>

                            {/* Replied-to Quote Header & Bubble */}
                            {replyInfo && (
                              <div className="flex flex-col items-start max-w-full mb-0.5">
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-1 mb-0.5">
                                  <ArrowUturnLeftIcon className="w-2.5 h-2.5" />
                                  {replyHeaderText}
                                </span>
                                <div
                                  onClick={() => scrollToMessage(replyInfo.id)}
                                  className="px-3 py-1.5 rounded-2xl rounded-bl-xs text-xs bg-gray-100 text-gray-600 border-l-2 border-orange-400 max-w-full break-words [overflow-wrap:anywhere] line-clamp-2 cursor-pointer hover:bg-gray-200/80 transition-colors"
                                  title="Click to view original message"
                                >
                                  {replyInfo.body}
                                </div>
                              </div>
                            )}

                            {/* Message Bubble + Right Hover Actions */}
                            <div
                              className={`relative flex items-center justify-start gap-1.5 max-w-full min-w-0 ${
                                totalReactions > 0 ? 'mb-2.5' : ''
                              }`}
                            >
                              {reactionPickerPopover}

                              <div className="relative max-w-full min-w-0">
                                {emojiOnly ? (
                                  <div
                                    className="text-3xl sm:text-4xl py-0.5 px-1 select-none animate-emoji-pop text-left"
                                    title={m.body}
                                  >
                                    {m.body}
                                  </div>
                                ) : (
                                  <div className="max-w-full px-3.5 py-2 rounded-2xl text-sm leading-relaxed bg-gray-200/90 text-gray-900 rounded-tl-xs break-words [overflow-wrap:anywhere] whitespace-pre-wrap shadow-2xs">
                                    {m.body}
                                  </div>
                                )}
                                {reactionBadge}
                              </div>

                              {messageActionButtons}
                            </div>

                            {/* Timestamp */}
                            <div className="flex items-center gap-1 px-1 mt-0.5">
                              <span className="text-[9px] text-gray-400">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Replying-to Preview Banner (Messenger style) */}
              {replyingTo && (
                <div className="px-3 py-2 bg-orange-50/90 border-t border-orange-200/80 flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0 flex-1 border-l-2 border-orange-500 pl-2">
                    <p className="text-[11px] font-bold text-gray-800 flex items-center gap-1 truncate">
                      <ArrowUturnLeftIcon className="w-3 h-3 text-orange-600 shrink-0" />
                      <span>
                        Replying to{' '}
                        {replyingTo.senderId && replyingTo.senderId === currentProfileId
                          ? 'yourself'
                          : replyingTo.senderName}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {replyingTo.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-orange-100 transition-colors cursor-pointer shrink-0"
                    title="Cancel reply"
                  >
                    <XMarkIcon className="w-4 h-4 stroke-2" />
                  </button>
                </div>
              )}

              {/* Quick Emoji Reaction Strip */}
              <div className="px-3 py-1 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between text-xs shrink-0">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick:</span>
                <div className="flex items-center gap-1.5">
                  {['🎓', '👍', '❤️', '🔥', '🎉', '👏', '🚀'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSend(em)}
                      className="text-base hover:scale-135 active:scale-95 transition-transform duration-150 p-1 rounded-md hover:bg-gray-200/70 cursor-pointer"
                      title={`Send ${em}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input / Send Bar */}
              <div className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5 relative">
                {showEmojiPicker && (
                  <EmojiPicker
                    position="top"
                    className="left-2 bottom-full mb-2"
                    onSelect={(emoji) => {
                      setInputText((prev) => prev + emoji);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    showEmojiPicker
                      ? 'text-orange-600 bg-orange-100'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Choose dynamic emoji"
                >
                  <FaceSmileIcon className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    replyingTo
                      ? `Reply to ${replyingTo.senderId === currentProfileId ? 'yourself' : replyingTo.senderName}...`
                      : activeChat.isGroup
                        ? 'Message group...'
                        : 'Write a message...'
                  }
                  className="flex-1 bg-gray-100 hover:bg-gray-200/60 focus:bg-white focus:ring-1 focus:ring-orange-500 border border-transparent focus:border-orange-400 rounded-full px-3.5 py-1.5 text-sm text-gray-800 placeholder-gray-500 outline-none transition-all"
                />

                {inputText.trim() ? (
                  <button
                    onClick={() => handleSend()}
                    className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-colors shadow-xs cursor-pointer active:scale-95"
                    title="Send message"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend('👋')}
                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-full transition-colors text-base cursor-pointer active:scale-95"
                    title="Send Wave"
                  >
                    👋
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
