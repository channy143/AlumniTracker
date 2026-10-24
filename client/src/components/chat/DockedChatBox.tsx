import { useState, useEffect, useRef } from 'react';
import {
  MinusIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/store/chatStore';
import { messagesApi, profileApi } from '@/services/api';
import EmojiPicker from '@/components/ui/EmojiPicker';

function isOnlyEmojis(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\uFE0F|\u200D)+/g;
  const stripped = trimmed.replace(emojiRegex, '').replace(/\s+/g, '');
  return stripped.length === 0;
}

interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  failed?: boolean;
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
  } = useChatStore();
  const [overflowHovered, setOverflowHovered] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch current user's profile ID
  useEffect(() => {
    profileApi.get()
      .then((p) => {
        if (p?.id) setCurrentProfileId(p.id);
      })
      .catch(() => {});
  }, []);

  // Fetch presence for active conversation and minimized conversation heads
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

  // Fetch conversation messages for the specific active user
  const loadMessages = async (isInitial = false) => {
    if (!activeChat?.profileId) return;
    if (isInitial) setLoadingChat(true);
    try {
      const data = await messagesApi.getConversation(activeChat.profileId);
      if (Array.isArray(data)) {
        setMessages((prev) => {
          // Keep pending optimistic messages that haven't been confirmed yet
          const pending = prev.filter(
            (p) =>
              p.id.startsWith('temp-') &&
              !data.some(
                (d: any) =>
                  d.id === p.id ||
                  (d.body === p.body && (d.sender_id === p.sender_id || p.sender_id === 'me'))
              )
          );
          return [...data, ...pending];
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
      // Clear previous user's chat data immediately to keep conversations completely isolated
      setMessages([]);
      setInputText('');
      loadMessages(true);
      refreshPresence();
      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadMessages(false);
          refreshPresence();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeChat?.profileId, isOpen]);



  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !activeChat?.profileId) return;

    // Immediately clear input field if sending what was typed
    if (!textToSend) {
      setInputText('');
    }

    const targetProfileId = activeChat.profileId;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      sender_id: currentProfileId || 'me',
      receiver_id: targetProfileId,
      body: text,
      created_at: new Date().toISOString(),
    };

    // 1. Instant zero-delay optimistic append in UI
    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Immediate smooth scroll to newest message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 10);

    // 3. Asynchronous background delivery without freezing UI or disabling buttons
    try {
      const realMsg = await messagesApi.send(targetProfileId, text);
      if (realMsg?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: realMsg.id,
                  created_at: realMsg.created_at || m.created_at,
                  sender_id: realMsg.sender_id || m.sender_id,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to deliver message:', err);
      // Mark temporary message as failed if network error
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      {/* 1. Minimized State: Floating Circular Profile Avatars / Stack at right side of viewport */}
      {minimizedChats.length > 0 && (
        <div className="fixed right-[11px] bottom-12 z-40 flex flex-col items-end gap-2.5">
          {/* Up to 5 visible minimized conversation heads */}
          {visibleChats.map((c) => {
            const initials = getInitials(c.name);
            return (
              <div
                key={c.profileId}
                onMouseDown={closeHeaderDropdown}
                className="relative flex items-center group"
              >
                {/* Floating tooltip on hover (to the left) */}
                <div className="hidden group-hover:block absolute right-full mr-2.5 bg-gray-900/90 text-white text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap pointer-events-none z-50">
                  {c.name}
                </div>

                {/* Circular Floating Chat Head */}
                <button
                  onClick={() => restoreChat(c)}
                  className="relative w-[51px] h-[51px] rounded-full bg-white shadow-2xl ring-2 ring-blue-500/90 cursor-pointer flex items-center justify-center p-0.5 border border-gray-200"
                  title={`Message ${c.name}`}
                  aria-label={`Open conversation with ${c.name}`}
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      {initials}
                    </div>
                  )}

                  {/* Active online green dot - only when user is genuinely active */}
                  {c.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  )}

                  {/* Unread message badge */}
                  {typeof c.unread === 'number' && c.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </button>

                {/* Dismiss 'x' button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissMinimizedChat(c.profileId);
                  }}
                  className="absolute -top-1 -left-1 w-4 h-4 bg-gray-700/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-[10px] shadow-md z-10"
                  title="Close chat"
                >
                  <XMarkIcon className="w-3 h-3 stroke-2" />
                </button>
              </div>
            );
          })}

          {/* Overflow Icon (+N) when more than 5 conversations are minimized */}
          {overflowCount > 0 && (
            <div
              className="relative flex items-center"
              onMouseEnter={() => setOverflowHovered(true)}
              onMouseLeave={() => setOverflowHovered(false)}
              onMouseDown={closeHeaderDropdown}
            >
              {/* Modal popup positioned to the left of the +N icon with speech bubble pointer arrow */}
              {overflowHovered && (
                <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 min-w-[220px] max-w-[280px] bg-white border border-gray-200/90 rounded-2xl shadow-2xl py-2 px-1 z-50">
                  {/* Pointer arrow pointing right directly towards the +N bubble */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-t border-r border-gray-200/90 rotate-45 pointer-events-none" />

                  {/* Contact items in overflow */}
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
                          className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 flex-1 text-left"
                        >
                          {c.name}{typeof c.unread === 'number' && c.unread > 0 ? `(${c.unread})` : ''}
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

              {/* Overflow Circular Chat Head */}
              <button
                onClick={() => setOverflowHovered((prev) => !prev)}
                className="relative w-[51px] h-[51px] rounded-full bg-gray-900 shadow-2xl ring-2 ring-blue-500/90 cursor-pointer flex items-center justify-center p-0.5 border border-gray-200 overflow-hidden"
                title={`${overflowCount} more conversation${overflowCount > 1 ? 's' : ''}`}
                aria-label={`${overflowCount} more conversations`}
              >
                {overflowChats[0]?.avatar ? (
                  <img
                    src={overflowChats[0].avatar}
                    alt=""
                    className="w-full h-full rounded-full object-cover filter brightness-75"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-bold flex items-center justify-center text-xs">
                    {getInitials(overflowChats[0]?.name)}
                  </div>
                )}

                {/* Dark overlay with white bold +N */}
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

      {/* 2. Open Docked State: Bottom-right Alumni Connect docked messaging window */}
      {isOpen && activeChat && (
        <div
          onMouseDown={closeHeaderDropdown}
          onClick={closeHeaderDropdown}
          className="fixed bottom-0 right-4 sm:right-12 md:right-20 w-[340px] sm:w-[360px] h-[460px] max-h-[85vh] bg-white rounded-t-2xl shadow-2xl border border-gray-300 z-40 flex flex-col overflow-hidden"
        >
          {/* Top Title Bar */}
          <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {activeChat.avatar ? (
                  <img
                    src={activeChat.avatar}
                    alt={activeChat.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {getInitials(activeChat.name)}
                  </div>
                )}
                {/* Active online dot on avatar - only when user is genuinely online */}
                {activeChat.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/20" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-snug">
                  {activeChat.name}
                </p>
                {activeChat.isGroup ? (
                  <p className="text-[11px] text-gray-500 font-medium leading-none">
                    {activeChat.members?.length || 0} members
                  </p>
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

            {/* Action Buttons: Minimize, Close */}
            <div className="flex items-center gap-1 text-gray-500">
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

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-gray-50/50 to-white">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold mb-2 shadow-inner">
                  {getInitials(activeChat.name)}
                </div>
                <p className="text-sm font-semibold text-gray-800">{activeChat.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  You are connected on CTU-Naga Alumni Connect.
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Send a message to start networking with your fellow alumnus.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.id.startsWith('temp-') || (currentProfileId ? m.sender_id === currentProfileId : m.sender_id !== activeChat.profileId);
                const emojiOnly = isOnlyEmojis(m.body);
                const isPending = m.id.startsWith('temp-');
                const isFailed = m.failed;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-opacity duration-150 ${isPending ? 'opacity-90' : 'opacity-100'}`}
                  >
                    {emojiOnly ? (
                      <div
                        className={`text-3xl sm:text-4xl py-0.5 px-1 select-none animate-emoji-pop ${
                          isMe ? 'text-right' : 'text-left'
                        }`}
                        title={m.body}
                      >
                        {m.body}
                      </div>
                    ) : (
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed max-w-[80%] break-words ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-gray-200/90 text-gray-900 rounded-bl-xs'
                        } ${isFailed ? 'border border-red-400 bg-red-600 text-white' : ''}`}
                      >
                        {m.body}
                      </div>
                    )}
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
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

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
            {/* Dynamic Emoji Picker Popover */}
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
                  ? 'text-blue-600 bg-blue-100'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Choose dynamic emoji"
            >
              <FaceSmileIcon className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message..."
              className="flex-1 bg-gray-100 hover:bg-gray-200/60 focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-400 rounded-full px-3.5 py-1.5 text-sm text-gray-800 placeholder-gray-500 outline-none transition-all"
            />

            {inputText.trim() ? (
              <button
                onClick={() => handleSend()}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-xs cursor-pointer active:scale-95"
                title="Send message"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSend('👋')}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors text-base cursor-pointer active:scale-95"
                title="Send Wave"
              >
                👋
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
