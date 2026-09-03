import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth';
import { mintSupabaseUserToken } from '../utils/supabaseJwt';
import { AuthPayload } from '../types';

// =============================================================================
// SERVICE-ROLE CLIENT — Use ONLY for admin routes (server/src/routes/admin/**)
// This client bypasses Row Level Security. Never use for user-facing reads/writes.
// =============================================================================
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// ANON KEY — Used to create per-request user-scoped clients so RLS applies.
// =============================================================================
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let loggedFallbackWarning = false;

/**
 * Creates a per-request Supabase client scoped to the requesting user.
 *
 * The app authenticates users with its own JWTs (signed with JWT_SECRET). To let
 * PostgREST enforce Row Level Security, we:
 *   1. Re-verify the app token to recover the user's identity + expiry.
 *   2. Mint a Supabase-compatible JWT (role='authenticated', sub=user UUID)
 *      signed with SUPABASE_JWT_SECRET.
 *   3. Attach it as Bearer token so PostgREST applies the RLS policies from
 *      supabase/migration_rls_hardening.sql (auth.uid() / auth.role()).
 *
 * REQUIREMENTS:
 *   - SUPABASE_JWT_SECRET must be set (the secret that signs the anon key).
 *   - The RLS migrations must be applied to the Supabase project.
 *
 * FALLBACK: If SUPABASE_JWT_SECRET is not configured, we fall back to the
 * service-role client (bypasses RLS) so the app keeps working. Application-layer
 * filtering by req.user.userId still applies.
 */
export function createUserScopedClient(userJwt: string): SupabaseClient {
  let authPayload: AuthPayload | null = null;
  try {
    authPayload = jwt.verify(userJwt, getJwtSecret()) as AuthPayload;
  } catch {
    // Token unverifiable — bailing out to the fallback below is safe because the
    // higher-level `authenticate` middleware already rejected invalid tokens.
    authPayload = null;
  }

  if (authPayload) {
    const supabaseToken = mintSupabaseUserToken({
      userId: authPayload.userId,
      email: authPayload.email,
      exp: authPayload.exp,
    });
    if (supabaseToken) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${supabaseToken}`,
          },
        },
      });
    }
  }

  if (!loggedFallbackWarning) {
    loggedFallbackWarning = true;
    console.warn(
      '[supabase] SUPABASE_JWT_SECRET not configured (or token unverifiable); ' +
        'createUserScopedClient() using service-role client. RLS is NOT being enforced.',
    );
  }

  return supabase;
}
