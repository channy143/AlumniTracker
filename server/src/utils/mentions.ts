import { supabase } from '../services/supabase';
import { createNotification } from '../routes/notifications';

export interface LightweightProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
}

export interface MentionedProfileRef {
  id: string;
  user_id: string;
  name: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getProfileIdByUserIdMap(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data } = await supabase
    .from('profiles')
    .select('id, user_id')
    .in('user_id', uniqueIds);

  (data || []).forEach((p: any) => {
    if (p.user_id && p.id) {
      map.set(p.user_id, p.id);
    }
  });
  return map;
}

export async function fetchAllMentionCandidateProfiles(): Promise<LightweightProfile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, first_name, last_name, middle_name');

  return (data || []).filter((p: any) => p?.id && (p.first_name || p.last_name));
}

function buildSearchableVariants(profiles: LightweightProfile[]) {
  const variants: Array<{ nameLower: string; displayName: string; id: string; user_id: string }> = [];
  const seenKey = new Set<string>();

  for (const p of profiles) {
    const first = (p.first_name || '').trim();
    const middle = (p.middle_name || '').trim();
    const last = (p.last_name || '').trim();
    const fullName = `${first} ${last}`.trim();
    if (!fullName) continue;

    const candidates = [
      middle ? `${first} ${middle} ${last}`.trim() : '',
      fullName,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const key = `${p.id}:${candidate.toLowerCase()}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        variants.push({
          nameLower: candidate.toLowerCase(),
          displayName: candidate,
          id: p.id,
          user_id: p.user_id,
        });
      }
    }
  }

  // Sort longest names first so multi-word full names match before shorter prefixes
  variants.sort((a, b) => b.nameLower.length - a.nameLower.length);
  return variants;
}

export function matchMentionsInText(
  text: string | null | undefined,
  profiles: LightweightProfile[]
): MentionedProfileRef[] {
  if (!text || !text.includes('@') || profiles.length === 0) return [];

  const variants = buildSearchableVariants(profiles);
  const found = new Map<string, MentionedProfileRef>();
  const lower = text.toLowerCase();

  for (const v of variants) {
    const pattern = new RegExp(`(?:^|[\\s(\\[{"'])@${escapeRegExp(v.nameLower)}(?=$|[\\s.,!?:;)\\]}"'])`, 'i');
    if (pattern.test(lower)) {
      if (!found.has(v.id)) {
        // Capture exact casing from text when available, falling back to canonical profile name
        found.set(v.id, {
          id: v.id,
          user_id: v.user_id,
          name: v.displayName,
        });
      }
    }
  }

  return Array.from(found.values());
}

export async function notifyMentionedUsers(opts: {
  content: string;
  actorUserId: string;
  actorName: string;
  link: string;
  titlePrefix: string;
  explicitMentions?: Array<{ id?: string; name?: string }>;
  excludeUserIds?: Array<string | null | undefined>;
}) {
  try {
    const {
      content,
      actorUserId,
      actorName,
      link,
      titlePrefix,
      explicitMentions = [],
      excludeUserIds = [],
    } = opts;

    const hasAt = typeof content === 'string' && content.includes('@');
    if (!hasAt && explicitMentions.length === 0) return;

    const profiles = await fetchAllMentionCandidateProfiles();
    const matchedFromText = hasAt ? matchMentionsInText(content, profiles) : [];

    const profileById = new Map<string, LightweightProfile>();
    profiles.forEach((p) => profileById.set(p.id, p));

    const targetUserIds = new Set<string>();
    const excluded = new Set<string>([actorUserId, ...(excludeUserIds.filter(Boolean) as string[])]);

    for (const m of matchedFromText) {
      if (m.user_id && !excluded.has(m.user_id)) {
        targetUserIds.add(m.user_id);
      }
    }

    for (const em of explicitMentions) {
      if (em?.id) {
        const p = profileById.get(em.id);
        if (p?.user_id && !excluded.has(p.user_id)) {
          targetUserIds.add(p.user_id);
        }
      }
    }

    if (targetUserIds.size === 0) return;

    const cleanSnippet = (content || '').trim();
    const snippet = cleanSnippet.length > 70 ? cleanSnippet.slice(0, 70) + '...' : cleanSnippet;

    await Promise.all(
      Array.from(targetUserIds).map((recipientUserId) =>
        createNotification({
          userId: recipientUserId,
          type: 'post',
          title: titlePrefix,
          message: snippet ? `${actorName} mentioned you: "${snippet}"` : `${actorName} mentioned you.`,
          link,
        }).catch(() => {})
      )
    );
  } catch {
    // Non-fatal: mention notifications must never fail primary post/comment creation
  }
}

