const STORAGE_KEY_PREFIX = 'ctu_recently_viewed_v3:';
const MAX_ITEMS = 10;

// Clean up legacy shared un-scoped keys so entries do not leak across accounts
try {
  localStorage.removeItem('ctu_recently_viewed');
  localStorage.removeItem('ctu_recently_viewed_v2');
} catch {} // eslint-disable-line

export interface RecentProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  timestamp: number;
}

function resolveUserStorageKey(userId?: string | null): string | null {
  try {
    const uid = userId || sessionStorage.getItem('ctu_cache_uid');
    if (!uid) return null;
    return `${STORAGE_KEY_PREFIX}${uid}`;
  } catch {
    return null;
  }
}

export function getRecentlyViewed(userId?: string | null): RecentProfile[] {
  const key = resolveUserStorageKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addRecentlyViewed(profile: Omit<RecentProfile, 'timestamp'>, userId?: string | null) {
  const key = resolveUserStorageKey(userId);
  if (!key) return;
  const list = getRecentlyViewed(userId).filter((p) => p.id !== profile.id);
  list.unshift({ ...profile, timestamp: Date.now() });
  localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event('recently-viewed-changed'));
}
