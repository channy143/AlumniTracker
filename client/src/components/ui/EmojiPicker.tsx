import { useState, useRef, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  AcademicCapIcon,
  FaceSmileIcon,
  HandThumbUpIcon,
  SparklesIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

export interface EmojiCategory {
  id: string;
  name: string;
  icon: any;
  emojis: Array<{ emoji: string; name: string }>;
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'campus',
    name: 'Alumni & Campus',
    icon: AcademicCapIcon,
    emojis: [
      { emoji: '🎓', name: 'graduation cap mortarboard alumni graduate' },
      { emoji: '📜', name: 'diploma certificate degree' },
      { emoji: '🏛️', name: 'university college campus school' },
      { emoji: '📚', name: 'books studying library education' },
      { emoji: '💼', name: 'briefcase work job career business' },
      { emoji: '🚀', name: 'rocket promotion growth career launch' },
      { emoji: '💡', name: 'lightbulb idea insight innovation' },
      { emoji: '🏆', name: 'trophy award achievement winner' },
      { emoji: '🎖️', name: 'medal honor milestone' },
      { emoji: '🌟', name: 'star shining excellence' },
      { emoji: '🤝', name: 'handshake partnership connect network' },
      { emoji: '💻', name: 'laptop coding technology software IT' },
      { emoji: '📊', name: 'chart analytics trends data' },
      { emoji: '📖', name: 'book reading study' },
      { emoji: '🖋️', name: 'pen signing agreement contract' },
      { emoji: '🏢', name: 'office corporate building company' },
    ],
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: FaceSmileIcon,
    emojis: [
      { emoji: '😀', name: 'grinning face happy' },
      { emoji: '😃', name: 'smiling big eyes smile' },
      { emoji: '😄', name: 'happy laughing smile' },
      { emoji: '😁', name: 'beaming grin teeth' },
      { emoji: '😆', name: 'excited laughing closed eyes' },
      { emoji: '😅', name: 'sweat smile relief' },
      { emoji: '😂', name: 'tears of joy laughing lol' },
      { emoji: '🤣', name: 'rolling on floor laughing rofl' },
      { emoji: '😊', name: 'blushing smile warm' },
      { emoji: '😇', name: 'angel halo good' },
      { emoji: '🙂', name: 'slight smile calm' },
      { emoji: '😉', name: 'wink playful' },
      { emoji: '😍', name: 'heart eyes love adore' },
      { emoji: '🥰', name: 'smiling hearts warm loving' },
      { emoji: '😘', name: 'kiss blow heart' },
      { emoji: '😎', name: 'cool sunglasses chill' },
      { emoji: '🥳', name: 'partying celebration horn' },
      { emoji: '🤩', name: 'star struck amazed wow' },
      { emoji: '🤔', name: 'thinking wondering curious' },
      { emoji: '🤗', name: 'hugging warm hands' },
      { emoji: '😌', name: 'relieved peaceful' },
      { emoji: '🙌', name: 'raising hands praise hooray' },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: HandThumbUpIcon,
    emojis: [
      { emoji: '👍', name: 'thumbs up endorse like approve yes' },
      { emoji: '👏', name: 'clapping applaud congratulations well done' },
      { emoji: '🤝', name: 'handshake agree connect deal' },
      { emoji: '👊', name: 'fist bump solidarity' },
      { emoji: '✌️', name: 'peace victory v sign' },
      { emoji: '🤞', name: 'fingers crossed good luck hope' },
      { emoji: '🤟', name: 'love you hand sign' },
      { emoji: '👌', name: 'ok hand perfect great' },
      { emoji: '👋', name: 'waving wave hello goodbye hi' },
      { emoji: '✍️', name: 'writing note author sign' },
      { emoji: '💪', name: 'flexed biceps strong strength workout' },
      { emoji: '🙏', name: 'folded hands pray thank you gratitude' },
      { emoji: '🎯', name: 'target bullseye goal aim' },
      { emoji: '🔥', name: 'fire lit hot awesome trending' },
    ],
  },
  {
    id: 'celebration',
    name: 'Celebration',
    icon: SparklesIcon,
    emojis: [
      { emoji: '🎉', name: 'party popper tada congrats celebration' },
      { emoji: '🎊', name: 'confetti ball celebrate event' },
      { emoji: '🎈', name: 'balloon festive party' },
      { emoji: '🥂', name: 'clinking glasses toast cheers celebration' },
      { emoji: '🍾', name: 'champagne bottle popping celebrate' },
      { emoji: '🎂', name: 'birthday cake anniversary milestone' },
      { emoji: '✨', name: 'sparkles shiny clean new magic' },
      { emoji: '💫', name: 'dizzy star shooting sparkle' },
      { emoji: '🔥', name: 'fire burning energy power' },
      { emoji: '💯', name: 'hundred points perfect keep it real' },
      { emoji: '🥇', name: 'first place gold medal winner champion' },
      { emoji: '🥈', name: 'second place silver medal' },
      { emoji: '🥉', name: 'third place bronze medal' },
      { emoji: '🌈', name: 'rainbow colorful hope bright' },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Symbols',
    icon: HeartIcon,
    emojis: [
      { emoji: '❤️', name: 'red heart love support passion' },
      { emoji: '🧡', name: 'orange heart ctu alumni warmth' },
      { emoji: '💙', name: 'blue heart loyalty trust' },
      { emoji: '💛', name: 'yellow heart gold friendship' },
      { emoji: '💚', name: 'green heart growth agriculture' },
      { emoji: '💜', name: 'purple heart honor courage' },
      { emoji: '🤍', name: 'white heart pure peace' },
      { emoji: '💖', name: 'sparkling heart love affection' },
      { emoji: '💝', name: 'heart with ribbon gift present' },
      { emoji: '⚡', name: 'high voltage lightning quick energy' },
      { emoji: '💎', name: 'gem stone diamond precious value' },
      { emoji: '👑', name: 'crown royalty leader king queen' },
      { emoji: '✅', name: 'check mark verified approved done' },
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  position?: 'top' | 'bottom';
  className?: string;
}

export default function EmojiPicker({
  onSelect,
  onClose,
  position = 'top',
  className = '',
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('campus');
  const [search, setSearch] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search.trim()
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase().trim())
      )
    : EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];

  return (
    <div
      ref={containerRef}
      className={`absolute z-[100] w-[270px] sm:w-[330px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 ${
        position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Bar */}
      <div className="relative mb-2 flex items-center bg-gray-100 rounded-full px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 border border-transparent focus-within:border-orange-400 transition-all">
        <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-gray-400 hover:text-gray-600 p-0.5"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!search.trim() && (
        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2 px-1">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-orange-100 text-orange-600 scale-110 shadow-2xs font-semibold'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={cat.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Grid of Dynamic Emojis */}
      <div className="max-h-48 overflow-y-auto scrollbar-thin px-0.5 py-1">
        {filteredEmojis.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400">No emojis found</p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
            {filteredEmojis.map((item, idx) => (
              <button
                key={`${item.emoji}-${idx}`}
                type="button"
                onClick={() => {
                  onSelect(item.emoji);
                  onClose?.();
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl rounded-xl hover:bg-orange-50 hover:scale-130 active:scale-95 transition-transform duration-150 cursor-pointer select-none"
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Alumni Reactions Footer */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick:</span>
        <div className="flex items-center gap-1.5">
          {['🎓', '👍', '❤️', '🔥', '🎉', '👏', '💼'].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => {
                onSelect(quick);
                onClose?.();
              }}
              className="text-base hover:scale-135 active:scale-95 transition-transform duration-150 p-1 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              {quick}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
