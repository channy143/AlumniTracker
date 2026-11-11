// Universal Client-Side Stale-While-Revalidate (SWR) Cache
// Scoped per authenticated user session and automatically invalidated on mutations.

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();
const INFLIGHT_MAP = new Map<string, Promise<any>>();
const LISTENERS = new Map<string, Set<() => void>>();

const STORAGE_PREFIX = 'ctu_cache_v1:';
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 15; // 15 minutes max stale window
const DEFAULT_STALE_TIME_MS = 1000 * 30; // 30 seconds before background revalidation
const MAX_STORAGE_BYTES = 200_000; // Skip persisting oversized payloads (>200KB) to sessionStorage

function decodeUserNamespace(): string {
  try {
    const token =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access_token')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('access_token'));
    if (!token) return 'anon';
    const parts = token.split('.');
    if (parts.length !== 3) return 'auth';
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return String(payload.userId || payload.sub || 'auth');
  } catch {
    return 'anon';
  }
}

export function normalizeCacheEndpoint(endpoint: string): string {
  if (!endpoint) return '';
  // Strip volatile cache-buster query param `_t=...`
  const [path, query] = endpoint.split('?');
  if (!query) return path;
  const filtered = query
    .split('&')
    .filter((pair) => pair && !pair.startsWith('_t='))
    .join('&');
  return filtered ? `${path}?${filtered}` : path;
}

function fullKey(endpoint: string): string {
  const ns = decodeUserNamespace();
  return `${ns}:${normalizeCacheEndpoint(endpoint)}`;
}

export function isEndpointCacheable(endpoint: string): boolean {
  if (!endpoint) return false;
  if (endpoint.includes('format=csv') || endpoint.includes('format=xlsx') || endpoint.includes('/export')) {
    return false;
  }
  return true;
}

export function getDefaultStaleTime(endpoint: string): number {
  const norm = normalizeCacheEndpoint(endpoint);
  // High-frequency live polling endpoints always check server when polled,
  // while still storing responses so initial modal/drawer mounts hydrate in 0ms via getCached().
  if (
    norm.startsWith('/notifications/unread-count') ||
    norm.startsWith('/messages/')
  ) {
    return 0;
  }
  // Single post detail / inline comments poll runs every 3-3.5s
  if (/^\/feed\/[^/?]+$/.test(norm)) {
    return 1_000;
  }
  if (norm === '/feed' || norm.startsWith('/feed?') || norm.startsWith('/notifications')) {
    return 10_000;
  }
  return DEFAULT_STALE_TIME_MS;
}

export function getCacheEntry<T = any>(
  endpoint: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): CacheEntry<T> | undefined {
  const key = fullKey(endpoint);
  const now = Date.now();

  const mem = MEMORY_CACHE.get(key);
  if (mem) {
    if (now - mem.timestamp <= maxAgeMs) {
      return mem as CacheEntry<T>;
    }
    MEMORY_CACHE.delete(key);
  }

  // Fallback to sessionStorage so hard refreshes / restored tabs remain warm
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (parsed && typeof parsed.timestamp === 'number' && now - parsed.timestamp <= maxAgeMs) {
          MEMORY_CACHE.set(key, parsed);
          return parsed;
        }
        sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      }
    } catch {
      // Ignore storage read issues
    }
  }

  return undefined;
}

export function getCached<T = any>(endpoint: string, maxAgeMs = DEFAULT_MAX_AGE_MS): T | undefined {
  return getCacheEntry<T>(endpoint, maxAgeMs)?.data;
}

export function isCacheFresh(endpoint: string, staleTimeMs?: number): boolean {
  const effectiveStale = staleTimeMs ?? getDefaultStaleTime(endpoint);
  if (effectiveStale <= 0) return false;
  const entry = getCacheEntry(endpoint);
  if (!entry) return false;
  return Date.now() - entry.timestamp < effectiveStale;
}

export function setCached<T = any>(endpoint: string, data: T): void {
  const key = fullKey(endpoint);
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(key, entry);

  if (typeof sessionStorage !== 'undefined') {
    try {
      const serialized = JSON.stringify(entry);
      if (serialized.length <= MAX_STORAGE_BYTES) {
        sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
      }
    } catch {
      // If sessionStorage is full, prune old cache keys and retry once
      try {
        pruneStorageCache();
        const serialized = JSON.stringify(entry);
        if (serialized.length <= MAX_STORAGE_BYTES) {
          sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
        }
      } catch {
        // Silently ignore if quota still exceeded
      }
    }
  }

  notifyListeners(normalizeCacheEndpoint(endpoint));
}

function pruneStorageCache(): void {
  if (typeof sessionStorage === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  // Remove oldest half
  const half = Math.ceil(keysToRemove.length / 2);
  keysToRemove.slice(0, half).forEach((k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}

export function getInflight<T = any>(endpoint: string): Promise<T> | undefined {
  return INFLIGHT_MAP.get(fullKey(endpoint));
}

export function setInflight<T = any>(endpoint: string, promise: Promise<T>): void {
  const key = fullKey(endpoint);
  INFLIGHT_MAP.set(key, promise);
  promise.finally(() => {
    if (INFLIGHT_MAP.get(key) === promise) {
      INFLIGHT_MAP.delete(key);
    }
  });
}

export function invalidateCachePrefixes(prefixes: string | string[]): void {
  const list = (Array.isArray(prefixes) ? prefixes : [prefixes]).map((p) =>
    normalizeCacheEndpoint(p)
  );
  const ns = `${decodeUserNamespace()}:`;

  for (const fullK of Array.from(MEMORY_CACHE.keys())) {
    if (!fullK.startsWith(ns)) continue;
    const ep = fullK.slice(ns.length);
    if (list.some((prefix) => ep === prefix || ep.startsWith(prefix))) {
      MEMORY_CACHE.delete(fullK);
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (!k || !k.startsWith(`${STORAGE_PREFIX}${ns}`)) continue;
        const ep = k.slice(`${STORAGE_PREFIX}${ns}`.length);
        if (list.some((prefix) => ep === prefix || ep.startsWith(prefix))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }

  // Notify active listeners whose endpoint starts with any invalidated prefix
  for (const prefix of list) {
    for (const [listenerKey, set] of LISTENERS.entries()) {
      if (listenerKey === prefix || listenerKey.startsWith(prefix) || prefix.startsWith(listenerKey)) {
        set.forEach((cb) => {
          try {
            cb();
          } catch {
            // ignore
          }
        });
      }
    }
  }
}

export function clearAllCache(): void {
  MEMORY_CACHE.clear();
  INFLIGHT_MAP.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
  }
}

export function subscribeCache(endpoint: string, callback: () => void): () => void {
  const norm = normalizeCacheEndpoint(endpoint);
  if (!LISTENERS.has(norm)) {
    LISTENERS.set(norm, new Set());
  }
  const set = LISTENERS.get(norm)!;
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) {
      LISTENERS.delete(norm);
    }
  };
}

function notifyListeners(normEndpoint: string): void {
  const set = LISTENERS.get(normEndpoint);
  if (set) {
    set.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }
}

const MUTATION_INVALIDATION_RULES: Array<{ match: RegExp; prefixes: string[] }> = [
  { match: /^\/feed/, prefixes: ['/feed', '/activities', '/admin/activity', '/admin/audit-logs'] },
  { match: /^\/profile/, prefixes: ['/profile', '/employment', '/directory', '/feed', '/admin/alumni', '/admin/dashboard'] },
  { match: /^\/employment/, prefixes: ['/employment', '/profile', '/directory', '/admin/alumni', '/admin/dashboard', '/career-trends', '/admin/analytics'] },
  { match: /^\/connections/, prefixes: ['/connections', '/directory', '/notifications', '/feed'] },
  { match: /^\/mentorship/, prefixes: ['/mentorship', '/notifications'] },
  { match: /^\/community/, prefixes: ['/community'] },
  { match: /^\/jobs/, prefixes: ['/jobs', '/admin/jobs', '/admin/dashboard', '/employer'] },
  { match: /^\/surveys/, prefixes: ['/surveys', '/profile', '/admin/surveys', '/admin/dashboard', '/career-trends', '/admin/analytics'] },
  { match: /^\/events/, prefixes: ['/events', '/admin/events', '/admin/dashboard'] },
  { match: /^\/announcements/, prefixes: ['/announcements', '/admin/announcements', '/notifications'] },
  { match: /^\/messages\/heartbeat/, prefixes: [] },
  { match: /^\/messages/, prefixes: ['/messages'] },
  { match: /^\/notifications/, prefixes: ['/notifications'] },
  { match: /^\/admin\/alumni/, prefixes: ['/admin/alumni', '/admin/dashboard', '/directory', '/admin/reports', '/admin/analytics'] },
  { match: /^\/admin\/companies/, prefixes: ['/admin/companies', '/admin/dashboard', '/admin/employer-insights'] },
  { match: /^\/admin\/employer-insights/, prefixes: ['/admin/employer-insights', '/admin/companies'] },
  { match: /^\/admin\/jobs/, prefixes: ['/admin/jobs', '/jobs', '/admin/dashboard', '/employer'] },
  { match: /^\/admin\/surveys/, prefixes: ['/admin/surveys', '/surveys', '/admin/dashboard'] },
  { match: /^\/admin\/announcements/, prefixes: ['/admin/announcements', '/announcements'] },
  { match: /^\/admin\/events/, prefixes: ['/admin/events', '/events', '/admin/dashboard'] },
  { match: /^\/admin\/users/, prefixes: ['/admin/users', '/admin/dashboard'] },
  { match: /^\/admin\/eligible-alumni/, prefixes: ['/admin/eligible-alumni'] },
  { match: /^\/admin\/settings/, prefixes: ['/admin/settings'] },
  { match: /^\/admin\/audit-logs/, prefixes: ['/admin/audit-logs', '/feed'] },
  { match: /^\/admin\/security-incidents/, prefixes: ['/admin/security-incidents', '/admin/audit-logs'] },
  { match: /^\/admin\/reports/, prefixes: ['/admin/reports'] },
  { match: /^\/auth\/logout/, prefixes: [] },
  { match: /^\/auth/, prefixes: ['/auth/me', '/profile'] },
];

export function buildQueryEndpoint(basePath: string, params: Record<string, any> = {}): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `${basePath}?${q}` : basePath;
}

export function invalidateForMutation(endpoint: string): void {
  const norm = normalizeCacheEndpoint(endpoint);
  if (norm === '/auth/logout') {
    clearAllCache();
    return;
  }
  const toInvalidate = new Set<string>();
  for (const rule of MUTATION_INVALIDATION_RULES) {
    if (rule.match.test(norm)) {
      rule.prefixes.forEach((p) => toInvalidate.add(p));
    }
  }
  if (toInvalidate.size > 0) {
    invalidateCachePrefixes(Array.from(toInvalidate));
  }
}
