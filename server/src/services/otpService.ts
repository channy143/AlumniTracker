import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';

export type OtpPurpose = 'register' | 'reset' | 'verify' | 'mfa';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MFA_OTP_TTL_MS = 5 * 60 * 1000; // MFA codes expire sooner (5 minutes)
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_MFA_ATTEMPTS = 5; // incorrect MFA codes allowed before rate-limit

// In-memory map tracking consecutive wrong MFA attempts per email.
const mfaAttempts = new Map<string, { count: number; lockedUntil: number }>();

function mfaKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Track a failed MFA code attempt for an email.
 * Returns true if the email is now temporarily locked out of MFA.
 */
export function recordMfaFailure(email: string): boolean {
  const key = mfaKey(email);
  const existing = mfaAttempts.get(key);
  const entry = existing || { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= MAX_MFA_ATTEMPTS) {
    entry.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
    entry.count = 0;
  }
  mfaAttempts.set(key, entry);
  return Date.now() < entry.lockedUntil;
}

/**
 * Milliseconds remaining in the MFA lockout for an email, or 0 if not locked.
 */
export function getMfaLockoutMs(email: string): number {
  const key = mfaKey(email);
  const entry = mfaAttempts.get(key);
  if (!entry) return 0;
  const wait = entry.lockedUntil - Date.now();
  if (wait <= 0) {
    mfaAttempts.delete(key);
    return 0;
  }
  return wait;
}

/**
 * Reset the MFA attempt counter on a successful code.
 */
export function resetMfaFailures(email: string): void {
  mfaAttempts.delete(mfaKey(email));
}

// Normalize the email used as the canonical identity for OTP records.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create (or replace) an OTP code for an email/purpose, storing only a hash.
 * Returns the plaintext code so the caller can email it to the user.
 */
export async function createOtp(purpose: OtpPurpose, email: string): Promise<{ code: string }> {
  const normalized = normalizeEmail(email);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  // Delete any prior unconsumed code for this email/purpose, then insert the new one.
  try {
    await supabase
      .from('otp_codes')
      .delete()
      .eq('email', normalized)
      .eq('purpose', purpose)
      .is('consumed_at', null);
  } catch {
    // Best-effort cleanup; insertion below still proceeds.
  }

  const expiresAt = new Date(Date.now() + (purpose === 'mfa' ? MFA_OTP_TTL_MS : OTP_TTL_MS)).toISOString();
  const { error } = await supabase
    .from('otp_codes')
    .insert({ email: normalized, purpose, code_hash: codeHash, expires_at: expiresAt });

  if (error) throw new Error(`Failed to store OTP: ${error.message}`);

  return { code };
}

/**
 * Check whether a new OTP request is allowed for this email/purpose,
 * respecting the resend cooldown. Returns the number of ms to wait, or 0 if allowed.
 */
export async function getOtpCooldownMs(purpose: OtpPurpose, email: string): Promise<number> {
  const normalized = normalizeEmail(email);
  let data: any[] | null | undefined;
  try {
    const result = await supabase
      .from('otp_codes')
      .select('created_at, expires_at')
      .eq('email', normalized)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    data = result.data;
  } catch {
    data = null;
  }

  if (!data || data.length === 0) return 0;

  const last = data[0] as any;
  const lastCreated = new Date(last.created_at).getTime();
  const elapsed = Date.now() - lastCreated;
  const wait = RESEND_COOLDOWN_MS - elapsed;
  return wait > 0 ? wait : 0;
}

/**
 * Verify an OTP code for a given email/purpose. On success the code is
 * marked consumed so it cannot be replayed. Returns true if valid.
 */
export async function verifyOtp(purpose: OtpPurpose, email: string, code: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  let data: any[] | null | undefined;
  try {
    const result = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', normalized)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    data = result.data;
  } catch {
    data = null;
  }

  if (!data || data.length === 0) return false;

  const record = data[0] as any;
  if (new Date(record.expires_at).getTime() < Date.now()) return false;

  const matches = await bcrypt.compare(code, record.code_hash).catch(() => false);
  if (!matches) return false;

  // Mark as consumed to prevent replay.
  try {
    await supabase
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id);
  } catch {
    // Best-effort; treat as success even if consumption marking fails.
  }

  return true;
}
