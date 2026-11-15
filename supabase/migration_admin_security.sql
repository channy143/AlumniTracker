-- Migration: Admin security enhancements (session revocation cutoff & login IP tracking)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_valid_after TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(64);

