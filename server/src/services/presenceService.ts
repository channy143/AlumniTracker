import { supabase } from './supabase';

interface PresenceRecord {
  lastSeen: number;
  isOnline: boolean;
}

// In-memory presence map: key = profileId or userId, value = PresenceRecord
export const userPresenceMap = new Map<string, PresenceRecord>();

// In-memory cache for user_id -> profile_id and profile_id -> profile_id to eliminate repeated DB lookups
export const userToProfileCache = new Map<string, string>();

// Throttle DB updates to at most once per 30 seconds per user
const lastDbUpdateMap = new Map<string, number>();

// User is considered online if marked online and last seen within 60 seconds
export const ONLINE_THRESHOLD_MS = 60 * 1000;

/**
 * Mark a user as actively online.
 * Triggered on heartbeats, page loads, and all authenticated user actions.
 */
export async function markUserActive(userId: string, profileId?: string) {
  if (!userId) return;
  const now = Date.now();
  const record: PresenceRecord = { lastSeen: now, isOnline: true };

  userPresenceMap.set(userId, record);
  if (profileId) {
    userPresenceMap.set(profileId, record);
    userToProfileCache.set(userId, profileId);
    userToProfileCache.set(profileId, profileId);
  }

  // Throttle DB updates to avoid overloading database on rapid interactions
  const lastDbUpdate = lastDbUpdateMap.get(userId) || 0;
  if (now - lastDbUpdate > 30000) {
    lastDbUpdateMap.set(userId, now);
    const nowIso = new Date(now).toISOString();
    try {
      if (profileId) {
        await supabase
          .from('profiles')
          .update({ last_active_at: nowIso })
          .eq('id', profileId);
      } else {
        const { data: p } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (p?.id) {
          userPresenceMap.set(p.id, record);
          userToProfileCache.set(userId, p.id);
          userToProfileCache.set(p.id, p.id);
          await supabase
            .from('profiles')
            .update({ last_active_at: nowIso })
            .eq('id', p.id);
        }
      }

      await supabase
        .from('users')
        .update({ last_active_at: nowIso })
        .eq('id', userId);
    } catch {
      // Ignore background DB update error
    }
  }
}

/**
 * Mark a user as offline immediately.
 * Triggered when user closes tab/browser (beforeunload/pagehide) or on logout.
 */
export async function markUserOffline(userIdOrProfileId: string) {
  if (!userIdOrProfileId) return;
  const now = Date.now();
  const record: PresenceRecord = { lastSeen: now, isOnline: false };

  userPresenceMap.set(userIdOrProfileId, record);

  try {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, user_id')
      .or(`id.eq.${userIdOrProfileId},user_id.eq.${userIdOrProfileId}`)
      .maybeSingle();

    if (p) {
      userPresenceMap.set(p.id, record);
      userPresenceMap.set(p.user_id, record);
      userToProfileCache.set(p.user_id, p.id);
      userToProfileCache.set(p.id, p.id);
      const nowIso = new Date(now).toISOString();

      await supabase
        .from('profiles')
        .update({ last_active_at: nowIso })
        .eq('id', p.id);

      await supabase
        .from('users')
        .update({ last_active_at: nowIso })
        .eq('id', p.user_id);
    }
  } catch {
    // Ignore error
  }
}

/**
 * Fast resolution of profile ID from user ID (cached in RAM)
 */
export async function getProfileIdForUser(userId: string): Promise<string | null> {
  if (!userId) return null;
  const cached = userToProfileCache.get(userId);
  if (cached) return cached;

  const { data: p } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (p?.id) {
    userToProfileCache.set(userId, p.id);
    userToProfileCache.set(p.id, p.id);
    return p.id;
  }
  return null;
}

/**
 * Fast resolution of receiver profile ID (handles either profile UUID or user UUID)
 */
export async function resolveReceiverProfileId(receiverIdOrUserId: string): Promise<string> {
  if (!receiverIdOrUserId) return receiverIdOrUserId;
  const cached = userToProfileCache.get(receiverIdOrUserId);
  if (cached) return cached;

  const { data: p } = await supabase
    .from('profiles')
    .select('id, user_id')
    .or(`id.eq.${receiverIdOrUserId},user_id.eq.${receiverIdOrUserId}`)
    .maybeSingle();

  if (p?.id) {
    userToProfileCache.set(p.user_id, p.id);
    userToProfileCache.set(p.id, p.id);
    return p.id;
  }
  return receiverIdOrUserId;
}

/**
 * Calculate legitimate presence for a specific user or profile.
 */
export function checkIsOnline(id: string, dbLastActiveAt?: string | null): { isOnline: boolean; lastActiveAt: string | null } {
  const now = Date.now();
  const mem = userPresenceMap.get(id);

  if (mem) {
    if (!mem.isOnline) {
      // Explicitly offline (closed window or logged out)
      return { isOnline: false, lastActiveAt: new Date(mem.lastSeen).toISOString() };
    }
    const isOnline = now - mem.lastSeen < ONLINE_THRESHOLD_MS;
    return { isOnline, lastActiveAt: new Date(mem.lastSeen).toISOString() };
  }

  // Fallback to database last_active_at
  if (dbLastActiveAt) {
    const dbTs = new Date(dbLastActiveAt).getTime();
    const isOnline = dbTs > 0 && now - dbTs < ONLINE_THRESHOLD_MS;
    return { isOnline, lastActiveAt: dbLastActiveAt };
  }

  return { isOnline: false, lastActiveAt: null };
}
