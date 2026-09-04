import jwt from 'jsonwebtoken';

// =============================================================================
// Supabase-Compatible JWT minting
// -----------------------------------------------------------------------------
// The app issues its own custom JWTs (signed with JWT_SECRET) for authentication.
// PostgREST cannot resolve those tokens to a role, so Row Level Security (RLS)
// policies would reject or ignore them.
//
// To make the RLS policies in supabase/migration_rls_hardening.sql effective,
// we re-issue a per-request token that PostgREST understands:
//   - signed with the SUPABASE_JWT_SECRET (the secret that signs the anon key,
//     which is what PostgREST trusts)
//   - role = 'authenticated' so auth.role() = 'authenticated' policies pass
//   - sub  = the user's UUID so auth.uid() resolves to the user
//   - aud  = 'authenticated' (standard Supabase audience)
//
// The identity and expiry are taken from the app's already-verified token, so
// this must only ever be called after the `authenticate` middleware has run.
// =============================================================================

export interface SupabaseTokenUser {
  userId: string;
  email: string;
  exp?: number;
}

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Mint a Supabase-compatible JWT for a verified user.
 * Returns null if SUPABASE_JWT_SECRET is not configured.
 */
export function mintSupabaseUserToken(user: SupabaseTokenUser): string | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);

  // Reuse the app token's remaining lifetime but never exceed our configured
  // max so stale tokens don't linger long after the underlying session.
  let exp: number;
  if (typeof user.exp === 'number' && user.exp > now) {
    exp = user.exp;
  } else {
    exp = now + DEFAULT_TOKEN_TTL_SECONDS;
  }
  if (exp - now > DEFAULT_TOKEN_TTL_SECONDS * 24) {
    exp = now + DEFAULT_TOKEN_TTL_SECONDS * 24; // cap at 24h
  }

  return jwt.sign(
    {
      role: 'authenticated',
      sub: user.userId,
      aud: 'authenticated',
      email: user.email,
    },
    secret,
    { expiresIn: exp - now, algorithm: 'HS256' },
  );
}
