import { useState, useEffect, useCallback, useRef } from 'react';
import { connectionsApi, directoryApi, profileApi } from '@/services/api';
import { getCached } from '@/utils/apiCache';

export interface MentionCandidate {
  id: string; // profiles.id
  user_id?: string;
  name: string;
  avatar_url?: string | null;
  headline?: string | null;
  isConnection?: boolean;
}

function buildInitialCandidates(): MentionCandidate[] {
  const byId = new Map<string, MentionCandidate>();
  const myProfileId = getCached<any>('/profile')?.id || null;

  const cachedAccepted = getCached<any[]>('/connections?status=accepted') || getCached<any[]>('/connections') || [];
  (Array.isArray(cachedAccepted) ? cachedAccepted : []).forEach((c: any) => {
    if (c.status && c.status !== 'accepted') return;
    const other = c.requester_id === myProfileId ? c.recipient : c.requester;
    if (other?.id) {
      const name = `${other.first_name || ''} ${other.last_name || ''}`.trim();
      if (name) {
        byId.set(other.id, {
          id: other.id,
          user_id: other.user_id,
          name,
          avatar_url: other.avatar_url || null,
          headline: other.headline || null,
          isConnection: true,
        });
      }
    }
  });

  const cachedDir = getCached<any>('/directory/search?page=1&limit=15&sort=name') ||
    getCached<any>('/directory/search?page=1&limit=50&sort=name');
  (cachedDir?.data || []).forEach((p: any) => {
    if (p?.id && p.id !== myProfileId && !byId.has(p.id)) {
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      if (name) {
        byId.set(p.id, {
          id: p.id,
          user_id: p.user_id,
          name,
          avatar_url: p.avatar_url || null,
          headline: p.headline || null,
          isConnection: false,
        });
      }
    }
  });

  return Array.from(byId.values());
}

export function useMentionPeople() {
  const [basePeople, setBasePeople] = useState<MentionCandidate[]>(buildInitialCandidates);
  const myProfileIdRef = useRef<string | null>(getCached<any>('/profile')?.id || null);

  useEffect(() => {
    let active = true;
    Promise.all([
      profileApi.get().catch(() => null),
      connectionsApi.list('accepted').catch(() => []),
      directoryApi.search({ page: 1, limit: 25, sort: 'name' }).catch(() => ({ data: [] })),
    ]).then(([prof, conns, dirRes]) => {
      if (!active) return;
      const myId = prof?.id || myProfileIdRef.current;
      myProfileIdRef.current = myId;

      const byId = new Map<string, MentionCandidate>();
      (Array.isArray(conns) ? conns : []).forEach((c: any) => {
        const other = myId && c.requester_id === myId ? c.recipient : c.requester;
        if (other?.id && other.id !== myId) {
          const name = `${other.first_name || ''} ${other.last_name || ''}`.trim();
          if (name) {
            byId.set(other.id, {
              id: other.id,
              user_id: other.user_id,
              name,
              avatar_url: other.avatar_url || null,
              headline: other.headline || null,
              isConnection: true,
            });
          }
        }
      });

      ((dirRes as any)?.data || []).forEach((p: any) => {
        if (p?.id && p.id !== myId && !byId.has(p.id)) {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          if (name) {
            byId.set(p.id, {
              id: p.id,
              user_id: p.user_id,
              name,
              avatar_url: p.avatar_url || null,
              headline: p.headline || null,
              isConnection: false,
            });
          }
        }
      });

      setBasePeople(Array.from(byId.values()));
    });

    return () => {
      active = false;
    };
  }, []);

  const searchRemote = useCallback(async (query: string): Promise<MentionCandidate[]> => {
    const q = query.trim();
    if (!q) return basePeople.slice(0, 8);

    const qLower = q.toLowerCase();
    const localMatches = basePeople.filter((p) => p.name.toLowerCase().includes(qLower));

    try {
      const res: any = await directoryApi.search({ q, page: 1, limit: 8, sort: 'name' });
      const merged = new Map<string, MentionCandidate>();
      localMatches.forEach((p) => merged.set(p.id, p));

      (res?.data || []).forEach((p: any) => {
        if (p?.id && p.id !== myProfileIdRef.current && !merged.has(p.id)) {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          if (name) {
            merged.set(p.id, {
              id: p.id,
              user_id: p.user_id,
              name,
              avatar_url: p.avatar_url || null,
              headline: p.headline || null,
              isConnection: false,
            });
          }
        }
      });

      return Array.from(merged.values()).slice(0, 8);
    } catch {
      return localMatches.slice(0, 8);
    }
  }, [basePeople]);

  return { basePeople, searchRemote };
}

