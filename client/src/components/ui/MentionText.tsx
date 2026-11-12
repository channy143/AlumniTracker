import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { directoryApi } from '@/services/api';

interface MentionRef {
  id: string;
  name: string;
}

interface MentionTextProps {
  text: string;
  mentionedProfiles?: MentionRef[];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function MentionText({ text, mentionedProfiles = [] }: MentionTextProps) {
  const navigate = useNavigate();
  const [resolving, setResolving] = useState<string | null>(null);

  if (!text) return null;
  if (!text.includes('@')) return <>{text}</>;

  const nameToId = new Map<string, string>();
  mentionedProfiles.forEach((m) => {
    if (m?.id && m?.name) {
      nameToId.set(m.name.trim().toLowerCase(), m.id);
    }
  });

  const knownNames = Array.from(
    new Set(
      mentionedProfiles
        .map((m) => m?.name?.trim())
        .filter((n): n is string => Boolean(n))
    )
  ).sort((a, b) => b.length - a.length);

  // Match known multi-word alumni mentions first, else general @Token (never emails because of leading boundary)
  const namePatterns = knownNames.map((n) => `@${escapeRegExp(n)}(?=$|[\\s.,!?:;)\\]}"'])`);
  namePatterns.push('@[A-Za-z0-9_]+(?:\\s+[A-Z][a-zA-Z0-9_]+){0,2}(?=$|[\\s.,!?:;)\\]}"\'])');

  const regex = new RegExp(`(?:^|[\\s(\\[{"'])(?:${namePatterns.join('|')})`, 'gi');

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const handleMentionClick = async (rawName: string, profileId?: string) => {
    if (profileId) {
      navigate(`/directory/${profileId}`);
      return;
    }
    const cleanName = rawName.trim();
    if (!cleanName || resolving) return;
    setResolving(cleanName);
    try {
      const res: any = await directoryApi.search({ q: cleanName, limit: 5 });
      const list = res?.data || [];
      if (list.length > 0) {
        const exact = list.find(
          (p: any) =>
            `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase() === cleanName.toLowerCase()
        );
        navigate(`/directory/${(exact || list[0]).id}`);
      } else {
        navigate(`/directory?q=${encodeURIComponent(cleanName)}`);
      }
    } catch {
      navigate(`/directory?q=${encodeURIComponent(cleanName)}`);
    } finally {
      setResolving(null);
    }
  };

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const atIndexInMatch = fullMatch.indexOf('@');
    const prefix = fullMatch.slice(0, atIndexInMatch);
    const mentionToken = fullMatch.slice(atIndexInMatch);
    const matchStart = match.index;

    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart));
    }
    if (prefix) {
      nodes.push(prefix);
    }

    const rawName = mentionToken.slice(1).trim();
    const resolvedId = nameToId.get(rawName.toLowerCase());

    nodes.push(
      <button
        key={`${matchStart}-${mentionToken}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleMentionClick(rawName, resolvedId);
        }}
        className="inline font-semibold text-orange-600 hover:text-orange-700 hover:underline bg-orange-50/90 hover:bg-orange-100 px-1 py-0.2 rounded transition-colors cursor-pointer"
        title={`View ${rawName}'s profile`}
      >
        {mentionToken}
      </button>
    );

    lastIndex = matchStart + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
}
