// In-memory failed authentication attempt tracking.
//
// Purpose: throttle repeated failed logins / MFA submissions without
// permanently locking accounts (which could enable abuse/lockout attacks).
//
// Keyed by a combination of normalized account identifier AND IP so that:
//   - legitimate users behind a shared NAT are not blocked by others
//   - attackers cannot trivially evade by rotating IPs alone
//   - a malicious actor cannot permanently lock a victim by flooding their email
//
// A successful authentication resets the counter for the identifier/IP.
// The cooldown is temporary and escalates on repeated abuse.

const MAX_ATTEMPTS = 5;
const BASE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const ESCALATION_MULTIPLIER = 2; // 15m -> 30m -> 60m -> ...
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000; // cap at 24h
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // prune stale entries every 10 min

interface AttemptRecord {
  count: number;
  lastAttemptAt: number;
  lockedAt: number | null;
  lockCount: number; // number of times a lock was triggered (for escalation)
}

// key -> record. Keys are prefixed to keep attempts per identifier/IP separate.
const store = new Map<string, AttemptRecord>();

function keyFor(identifier: string, ip: string): string {
  return `${identifier}|${ip}`;
}

function now(): number {
  return Date.now();
}

function remainingMs(record: AttemptRecord): number {
  if (record.lockedAt === null) return 0;
  return lockedDurationMs(record) - (now() - record.lockedAt);
}

function lockedDurationMs(record: AttemptRecord): number {
  const base = BASE_COOLDOWN_MS * Math.pow(ESCALATION_MULTIPLIER, Math.max(0, record.lockCount - 1));
  return Math.min(base, MAX_COOLDOWN_MS);
}

/**
 * Record a failed attempt for (identifier, ip).
 * After reaching MAX_ATTEMPTS consecutive failures, a temporary lock is applied.
 * Returns the number of attempts recorded so far.
 */
export function recordFailedAttempt(identifier: string, ip: string): number {
  const key = keyFor(identifier, ip);
  const existing = store.get(key);
  const entry: AttemptRecord = existing || {
    count: 0,
    lastAttemptAt: now(),
    lockedAt: null,
    lockCount: 0,
  };

  // If currently locked, don't accumulate further within the lock window.
  if (entry.lockedAt !== null && remainingMs(entry) > 0) {
    return entry.count;
  }

  // A prior lock has expired -> reset count but keep escalation history.
  if (entry.lockedAt !== null) {
    entry.count = 0;
    entry.lockedAt = null;
  }

  entry.count += 1;
  entry.lastAttemptAt = now();

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedAt = now();
    entry.lockCount += 1;
    entry.count = 0; // counter resets; lock enforces the cooldown
  }

  store.set(key, entry);
  return entry.count;
}

/**
 * Number of ms still locked, or 0 if the (identifier, ip) is not locked.
 */
export function getCoolDownMs(identifier: string, ip: string): number {
  const key = keyFor(identifier, ip);
  const entry = store.get(key);
  if (!entry || entry.lockedAt === null) return 0;
  const wait = remainingMs(entry);
  if (wait <= 0) {
    entry.lockedAt = null;
    entry.count = 0;
    return 0;
  }
  return wait;
}

/**
 * Clear any lock/count for a successful authentication.
 */
export function resetFailedAttempts(identifier: string, ip: string): void {
  store.delete(keyFor(identifier, ip));
}

// Periodic cleanup of expired entries to bound memory.
setInterval(() => {
  const threshold = now() - MAX_COOLDOWN_MS - 60 * 1000;
  for (const [key, entry] of store) {
    if (entry.lockedAt !== null && now() - entry.lockedAt > MAX_COOLDOWN_MS) {
      store.delete(key);
    } else if (entry.lockedAt === null && entry.lastAttemptAt < threshold) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();
