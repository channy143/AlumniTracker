const STORAGE_KEY = 'ctu_recently_viewed_v2';
const MAX_ITEMS = 10;

// Migrate from old key
try {
  const old = localStorage.getItem('ctu_recently_viewed');
  if (old) localStorage.removeItem('ctu_recently_viewed');
} catch {} // eslint-disable-line

export interface RecentProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  timestamp: number;
}

export function getRecentlyViewed(): RecentProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addRecentlyViewed(profile: Omit<RecentProfile, 'timestamp'>) {
  const list = getRecentlyViewed().filter((p) => p.id !== profile.id);
  list.unshift({ ...profile, timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  window.dispatchEvent(new Event('recently-viewed-changed'));
}
