import { supabase } from './supabase';

// In-memory cutoff timestamps (unix seconds) so session invalidation works immediately
// even if the optional token_valid_after column hasn't been migrated yet.
const memoryCutoffMap = new Map<string, number>();

export interface AdminSecurityPolicy {
  requireAdminMfa: boolean;
  adminIdleTimeoutMinutes: number;
  requireSudoForSensitive: boolean;
}

const DEFAULT_POLICY: AdminSecurityPolicy = {
  requireAdminMfa: true,
  adminIdleTimeoutMinutes: 15,
  requireSudoForSensitive: true,
};

let cachedPolicy: { value: AdminSecurityPolicy; expiresAt: number } | null = null;

export function clearAdminSecurityPolicyCache(): void {
  cachedPolicy = null;
}

export async function getAdminSecurityPolicy(): Promise<AdminSecurityPolicy> {
  const now = Date.now();
  if (cachedPolicy && cachedPolicy.expiresAt > now) {
    return cachedPolicy.value;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system_settings')
      .maybeSingle();

    if (!error && data?.value && typeof data.value === 'object') {
      const v = data.value as Record<string, any>;
      const parsedIdle = Number(v.admin_idle_timeout_minutes);
      const policy: AdminSecurityPolicy = {
        requireAdminMfa: v.require_admin_mfa !== undefined ? Boolean(v.require_admin_mfa) : true,
        adminIdleTimeoutMinutes:
          Number.isFinite(parsedIdle) && parsedIdle >= 5 && parsedIdle <= 120 ? parsedIdle : 15,
        requireSudoForSensitive:
          v.require_sudo_for_sensitive !== undefined ? Boolean(v.require_sudo_for_sensitive) : true,
      };
      cachedPolicy = { value: policy, expiresAt: now + 60_000 };
      return policy;
    }
  } catch {
    // Fall back to safe defaults
  }

  cachedPolicy = { value: DEFAULT_POLICY, expiresAt: now + 30_000 };
  return DEFAULT_POLICY;
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  memoryCutoffMap.set(userId, nowSeconds);
  try {
    const { error } = await supabase
      .from('users')
      .update({ token_valid_after: new Date(nowSeconds * 1000).toISOString() })
      .eq('id', userId);
    if (error && error.code !== '42703') {
      console.warn('[sessionSecurity] Failed to persist token_valid_after:', error.message);
    }
  } catch {
    // Non-blocking: in-memory cutoff still enforces revocation for active instance
  }
}

export function isTokenBeforeSessionCutoff(
  userId: string,
  tokenIatSeconds?: number,
  dbTokenValidAfterIso?: string | null,
): boolean {
  if (typeof tokenIatSeconds !== 'number') return false;

  const memCutoff = memoryCutoffMap.get(userId);
  if (memCutoff && tokenIatSeconds < memCutoff) {
    return true;
  }

  if (dbTokenValidAfterIso) {
    const dbCutoffSec = Math.floor(new Date(dbTokenValidAfterIso).getTime() / 1000);
    if (Number.isFinite(dbCutoffSec) && tokenIatSeconds < dbCutoffSec) {
      return true;
    }
  }

  return false;
}

