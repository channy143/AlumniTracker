import crypto from 'crypto';
import { supabase } from './supabase';

interface RevocationEntry {
  hash: string;
  expiresAt: number; // unix timestamp in seconds
}

// In-memory LRU/map cache of actively revoked token hashes to avoid DB hit on every request
const memoryRevocationCache = new Map<string, number>();

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Periodically cleans up expired entries from the memory cache.
 */
function cleanupExpiredMemoryEntries(): void {
  const now = Math.floor(Date.now() / 1000);
  for (const [hash, exp] of memoryRevocationCache.entries()) {
    if (exp <= now) {
      memoryRevocationCache.delete(hash);
    }
  }
}

// Clean up memory cache every 10 minutes
setInterval(cleanupExpiredMemoryEntries, 10 * 60 * 1000).unref();

/**
 * Revoke a token and persist to Supabase revoked_tokens table.
 */
export async function revokeToken(
  token: string,
  userId: string,
  expTimestamp?: number,
  reason: 'logout' | 'all_devices' | 'password_change' | 'security_incident' | 'admin_revocation' = 'logout',
): Promise<void> {
  const hash = hashToken(token);
  const now = Math.floor(Date.now() / 1000);
  const exp = expTimestamp && expTimestamp > now ? expTimestamp : now + 7 * 24 * 3600; // default 7 days

  // 1. Add to local memory cache
  memoryRevocationCache.set(hash, exp);

  // 2. Persist to Supabase database (service-role client bypasses RLS)
  try {
    const expiresAtIso = new Date(exp * 1000).toISOString();
    await supabase.from('revoked_tokens').insert({
      token_hash: hash,
      user_id: userId,
      expires_at: expiresAtIso,
      reason,
    });
  } catch (err) {
    console.error('[revokedTokenService] Failed to persist revoked token to database:', err);
  }
}

/**
 * Checks whether a given token has been revoked / logged out.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  if (!token) return true;
  const hash = hashToken(token);
  const now = Math.floor(Date.now() / 1000);

  // 1. Check in-memory cache
  const cachedExp = memoryRevocationCache.get(hash);
  if (cachedExp !== undefined) {
    if (cachedExp > now) {
      return true;
    } else {
      memoryRevocationCache.delete(hash);
      return false;
    }
  }

  // 2. Query Supabase database
  try {
    const { data, error } = await supabase
      .from('revoked_tokens')
      .select('id, expires_at')
      .eq('token_hash', hash)
      .maybeSingle();

    if (error) {
      console.warn('[revokedTokenService] Database query error checking revoked tokens:', error.message);
      return false;
    }

    if (data && new Date(data.expires_at).getTime() > Date.now()) {
      const expSec = Math.floor(new Date(data.expires_at).getTime() / 1000);
      memoryRevocationCache.set(hash, expSec);
      return true;
    }
  } catch (err) {
    console.error('[revokedTokenService] Exception checking revoked token in DB:', err);
  }

  return false;
}
