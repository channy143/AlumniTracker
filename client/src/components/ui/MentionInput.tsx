import React, { useState, useEffect, useRef } from 'react';
import { useMentionPeople, MentionCandidate } from '@/hooks/useMentionPeople';

interface MentionInputProps {
  as?: 'input' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (candidate: MentionCandidate) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  rows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  dropdownPosition?: 'top' | 'bottom';
  inputRefExternal?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export default function MentionInput({
  as = 'input',
  value,
  onChange,
  onMentionSelect,
  onKeyDown,
  placeholder,
  className = '',
  wrapperClassName = 'relative flex-1 min-w-0',
  rows = 3,
  autoFocus = false,
  disabled = false,
  dropdownPosition = 'bottom',
  inputRefExternal,
}: MentionInputProps) {
  const { basePeople, searchRemote } = useMentionPeople();
  const internalRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const inputRef = inputRefExternal || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTriggerPos, setMentionTriggerPos] = useState(-1);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<MentionCandidate[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMentionQuery(null);
        setMentionTriggerPos(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }

    const qLower = mentionQuery.toLowerCase().trim();
    const immediate = qLower
      ? basePeople.filter((p) => p.name.toLowerCase().includes(qLower)).slice(0, 8)
      : basePeople.slice(0, 8);
    setSuggestions(immediate);

    if (!qLower) return;
    let active = true;
    const timer = setTimeout(() => {
      searchRemote(qLower).then((res) => {
        if (active) setSuggestions(res);
      });
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mentionQuery, basePeople, searchRemote]);

  const detectMentionTrigger = (val: string, cursorPos: number) => {
    const beforeCursor = val.slice(0, cursorPos);
    const match = beforeCursor.match(/(?:^|[\s(\["'])@([^\n@]{0,30})$/);
    if (match) {
      const query = match[1];
      const atPos = cursorPos - query.length - 1;
      setMentionQuery(query);
      setMentionTriggerPos(atPos);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionTriggerPos(-1);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    onChange(nextVal);
    const cursorPos = e.target.selectionStart ?? nextVal.length;
    detectMentionTrigger(nextVal, cursorPos);
  };

  const handleSelectCandidate = (candidate: MentionCandidate) => {
    if (mentionTriggerPos < 0) return;
    const cursorPos = inputRef.current?.selectionStart ?? value.length;
    const beforeAt = value.slice(0, mentionTriggerPos);
    const afterCursor = value.slice(cursorPos);
    const inserted = `@${candidate.name} `;
    const nextVal = beforeAt + inserted + afterCursor;

    onChange(nextVal);
    onMentionSelect?.(candidate);
    setMentionQuery(null);
    setMentionTriggerPos(-1);
    setMentionIndex(0);

    const newCursor = beforeAt.length + inserted.length;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 15);
  };

  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectCandidate(suggestions[mentionIndex] || suggestions[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        setMentionTriggerPos(-1);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const dropdownOpen = mentionQuery !== null && suggestions.length > 0;
  const posClasses =
    dropdownPosition === 'top'
      ? 'bottom-full mb-1.5 left-0'
      : 'top-full mt-1.5 left-0';

  return (
    <div ref={containerRef} className={wrapperClassName}>
      {as === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={rows}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          className={className}
          autoFocus={autoFocus}
          disabled={disabled}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          className={className}
          autoFocus={autoFocus}
          disabled={disabled}
        />
      )}

      {dropdownOpen && (
        <div
          className={`absolute ${posClasses} z-[10050] w-72 max-w-[85vw] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100`}
        >
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Mention Alumni</span>
            <span className="text-[9px] font-medium text-gray-400">↑↓ Navigate · Enter</span>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
            {suggestions.map((person, idx) => {
              const initials = person.name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const isHighlighted = idx === mentionIndex;

              return (
                <button
                  key={person.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectCandidate(person);
                  }}
                  onMouseEnter={() => setMentionIndex(idx)}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">{person.name}</span>
                      {person.isConnection && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold shrink-0">
                          Connection
                        </span>
                      )}
                    </div>
                    {person.headline && (
                      <p className="text-[10px] text-gray-400 truncate">{person.headline}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

