import { useEffect, useRef, useState } from 'react';
import MentionText from '@/components/ui/MentionText';

interface MentionRef {
  id: string;
  name: string;
}

interface ExpandablePostTextProps {
  text: string;
  mentionedProfiles?: MentionRef[];
  className?: string;
  collapsedLines?: number;
}

export default function ExpandablePostText({
  text,
  mentionedProfiles = [],
  className = 'text-sm text-gray-800 leading-relaxed whitespace-pre-line break-words',
  collapsedLines = 4,
}: ExpandablePostTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;

    const checkOverflow = () => {
      if (!textRef.current) return;
      setIsOverflowing(textRef.current.scrollHeight > textRef.current.clientHeight + 2);
    };

    checkOverflow();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, expanded, collapsedLines]);

  if (!text) return null;

  return (
    <div>
      <p
        ref={textRef}
        className={className}
        style={
          !expanded
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: collapsedLines,
                overflow: 'hidden',
              }
            : undefined
        }
      >
        <MentionText text={text} mentionedProfiles={mentionedProfiles} />
      </p>
      {(isOverflowing || expanded) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
        >
          {expanded ? 'See less' : 'See more'}
        </button>
      )}
    </div>
  );
}
