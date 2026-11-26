import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightIcon,
  AtSymbolIcon,
  ChatBubbleLeftRightIcon,
  FaceSmileIcon,
  MinusIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface MobileChatPreviewItem {
  name: string;
  batch: string;
  img: string;
  body: string;
  tag: string;
}

interface MobileAlumniChatSectionProps {
  chatItems: MobileChatPreviewItem[];
  revealed: boolean;
}

const FILTER_TABS = ['All', 'Job Hiring', 'Alumni Chat', 'Alumni Post'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const QUICK_EMOJIS = ['🎓', '👍', '👏', '🤝', '💼', '🚀'] as const;

const MESSAGE_TIMES = ['9:14 AM', '9:15 AM', '9:18 AM', '9:20 AM', '9:24 AM', '9:26 AM'];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const CHRISTIAN_SALINAS_PROFILE = {
  name: 'Christian Salinas',
  batch: "BSIT '27",
  img: 'https://unfvgvnqqjxcyisievqf.supabase.co/storage/v1/object/public/profiles/avatars/c4c6bf62-cb6e-46c3-82cf-e83bad54c19c.jpg',
};

export function MobileAlumniChatSection({
  chatItems,
  revealed,
}: MobileAlumniChatSectionProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [pageOffset, setPageOffset] = useState(0);
  const [selectedQuickEmoji, setSelectedQuickEmoji] = useState<string>('👏');

  // Ensure Christian Salinas is used as the primary example and never Ashlie Mañacap
  const normalizedChatItems = chatItems.map((item) => {
    if (/ashlie/i.test(item.name) && /ma[nñ]acap/i.test(item.name)) {
      return {
        ...item,
        name: CHRISTIAN_SALINAS_PROFILE.name,
        batch: CHRISTIAN_SALINAS_PROFILE.batch,
        img: CHRISTIAN_SALINAS_PROFILE.img,
      };
    }
    return item;
  });

  const filteredMessages =
    activeTab === 'All'
      ? normalizedChatItems
      : normalizedChatItems.filter((item) => item.tag === activeTab);

  // Show 2 messages per view (1 incoming + 1 outgoing) so the full section fits cleanly in 1 mobile viewport
  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const safePage = pageOffset % totalPages;
  const visibleMessages = filteredMessages.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  return (
    <div className="lg:hidden w-full max-w-lg md:max-w-xl mx-auto px-2 sm:px-3">
      {/* ─── 1. Clean Centered Header ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <span className="text-ctu-marigold text-[10px] sm:text-xs uppercase tracking-[0.22em] font-semibold inline-flex items-center gap-2.5">
          <span className="w-6 h-px bg-ctu-marigold/60" />
          Alumni Chat &amp; Messaging
          <span className="w-6 h-px bg-ctu-marigold/60" />
        </span>

        <h2 className="text-[1.65rem] sm:text-4xl font-bold font-display text-ctu-charcoal leading-[1.1] tracking-tight mt-2">
          Direct Conversations{' '}
          <span className="text-ctu-blue">Across Batches</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
          Built-in messaging keeps career referrals, mentorship advice, and batch homecoming coordination flowing without leaving the portal.
        </p>
      </motion.div>

      {/* ─── 2. Authentic DockedChatBox-Matched Chat Preview Window ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 sm:mt-5"
      >
        <div className="bg-white rounded-2xl shadow-[0_18px_45px_-14px_rgba(15,23,42,0.18)] border border-gray-300/90 flex flex-col overflow-hidden">
          {/* Top Title Bar — matches DockedChatBox.tsx */}
          <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center shadow-sm">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-snug">
                  CTU-Naga Alumni Group
                </p>
                <div className="flex items-center gap-1.5 leading-none mt-0.5">
                  <span className="text-[11px] text-orange-600 font-medium">
                    {chatItems.length} members
                  </span>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Active now
                  </span>
                </div>
              </div>
            </div>

            {/* Authentic Window Action Icons */}
            <div className="flex items-center gap-1 text-gray-400 shrink-0">
              <span className="p-1 rounded-full bg-orange-50 text-orange-600">
                <UserGroupIcon className="w-4 h-4 stroke-2" />
              </span>
              <span className="p-1 rounded-full">
                <MinusIcon className="w-4 h-4 stroke-2" />
              </span>
              <span className="p-1 rounded-full">
                <XMarkIcon className="w-4 h-4 stroke-2" />
              </span>
            </div>
          </div>

          {/* Business-Only Policy Notice — matches DockedChatBox.tsx */}
          <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-200/80 flex items-center gap-2 text-[10px] sm:text-[11px] text-orange-900">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <p className="truncate leading-snug">
              <span className="font-semibold">Business, career &amp; alumni inquiries only</span>
              {' · '}
              Professional filter active
            </p>
          </div>

          {/* Filter Pill Bar — matches ChatDropdown.tsx */}
          <div className="px-3 py-1.5 bg-white border-b border-gray-100 flex items-center justify-between gap-2 text-[11px]">
            <div className="min-w-0 flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {FILTER_TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setPageOffset(0);
                    }}
                    className={`px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => setPageOffset((p) => (p + 1) % totalPages)}
                className="shrink-0 px-2 py-0.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-[10px] font-bold transition-colors cursor-pointer tabular-nums"
              >
                {safePage + 1}/{totalPages} →
              </button>
            )}
          </div>

          {/* Message List Body — matches DockedChatBox.tsx */}
          <div className="p-3 bg-gradient-to-b from-gray-50/50 to-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${safePage}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="space-y-3 min-h-[178px] flex flex-col justify-center"
              >
                {visibleMessages.map((msg, idx) => {
                  const isMe = idx === 1;
                  const timeLabel = MESSAGE_TIMES[(safePage * pageSize + idx) % MESSAGE_TIMES.length];

                  if (isMe) {
                    return (
                      <div key={`out-${safePage}-${idx}-${msg.name}`} className="w-full flex justify-end">
                        <div className="flex flex-col items-end max-w-[85%] min-w-0">
                          <div className="relative mb-2">
                            <div className="px-3.5 py-2 rounded-2xl rounded-br-sm text-xs sm:text-[13px] leading-relaxed bg-orange-600 text-white shadow-sm">
                              {msg.body}
                            </div>
                            {/* Anchored Messenger Reaction Badge */}
                            <span className="absolute -bottom-2.5 right-2 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white border border-orange-300 shadow-sm text-[10px] leading-none">
                              <span>{selectedQuickEmoji}</span>
                              <span className="font-bold text-gray-700 pl-0.5">3</span>
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 px-1 mt-0.5">
                            {timeLabel}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`in-${safePage}-${idx}-${msg.name}`} className="w-full flex justify-start">
                      <div className="flex items-start gap-2 max-w-[88%] min-w-0">
                        <div className="relative shrink-0 mt-0.5">
                          {msg.img ? (
                            <img
                              src={msg.img}
                              alt={msg.name}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200/90"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                              {getInitials(msg.name)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-start min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 ml-1 max-w-full">
                            <span className="text-[11px] font-semibold text-gray-700 truncate">
                              {msg.name}
                            </span>
                            <span className="text-[9px] font-semibold text-orange-700 bg-orange-50 border border-orange-200/80 px-1.5 rounded shrink-0">
                              {msg.tag}
                            </span>
                          </div>

                          <div className="relative mb-2">
                            <div className="px-3.5 py-2 rounded-2xl rounded-tl-sm text-xs sm:text-[13px] leading-relaxed bg-gray-200/90 text-gray-900 shadow-sm">
                              {msg.body}
                            </div>
                            <span className="absolute -bottom-2.5 left-2 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white border border-gray-200 shadow-sm text-[10px] leading-none">
                              <span>👍</span>
                              <span>🔥</span>
                              <span className="font-bold text-gray-700 pl-0.5">5</span>
                            </span>
                          </div>

                          <span className="text-[9px] text-gray-400 px-1 mt-0.5">
                            {msg.batch} · {timeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Quick Emoji Reaction Strip — exact match to DockedChatBox.tsx */}
          <div className="px-3 py-1 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Quick:
            </span>
            <div className="flex items-center gap-1">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setSelectedQuickEmoji(em)}
                  className={`text-sm p-1 rounded-md transition-transform active:scale-95 cursor-pointer ${
                    selectedQuickEmoji === em
                      ? 'bg-orange-100 ring-1 ring-orange-300 scale-110'
                      : 'hover:bg-gray-200/70'
                  }`}
                  title={`React with ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Input / Send Bar — exact match to DockedChatBox.tsx */}
          <div className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5">
            <span className="p-1 text-gray-400 shrink-0">
              <FaceSmileIcon className="w-4 h-4" />
            </span>
            <span className="p-1 text-gray-400 shrink-0">
              <PhotoIcon className="w-4 h-4" />
            </span>
            <span className="p-1 text-gray-400 shrink-0 hidden sm:inline-flex">
              <AtSymbolIcon className="w-4 h-4" />
            </span>

            <Link
              to="/auth/register"
              className="flex-1 bg-gray-100 hover:bg-gray-200/70 rounded-full px-3 py-1.5 text-xs text-gray-500 truncate transition-colors"
            >
              Message group (type @ to mention)...
            </Link>

            <Link
              to="/auth/register"
              aria-label="Start chatting with alumni"
              className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full transition-colors shadow-sm shrink-0 active:scale-95"
            >
              <PaperAirplaneIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ─── 3. Compact Feature Summary + CTA ─── */}
      <motion.div
        initial={false}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.45, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex flex-col items-center gap-3.5"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-gray-600">
          <span className="inline-flex items-center gap-1">
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-orange-600" />
            1-on-1 &amp; Group Chats
          </span>
          <span className="inline-flex items-center gap-1">
            <SparklesIcon className="w-3.5 h-3.5 text-orange-600" />
            Photos &amp; Links
          </span>
          <span className="inline-flex items-center gap-1">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-orange-600" />
            Pro Filter
          </span>
        </div>

        <Link
          to="/auth/register"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-ctu-marigold hover:bg-[#d4893a] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
        >
          <span>Start Connecting with Alumni</span>
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}
