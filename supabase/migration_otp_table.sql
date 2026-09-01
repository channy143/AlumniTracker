-- Replace ephemeral in-memory OTP storage with a database table.
-- OTPs are hashed before storage and auto-purged after expiry.

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'reset', 'verify')),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_purpose ON public.otp_codes(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Purge expired OTPs periodically (called on write operations).
CREATE OR REPLACE FUNCTION purge_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purge_expired_otps ON public.otp_codes;
CREATE TRIGGER trigger_purge_expired_otps
  AFTER INSERT ON public.otp_codes
  FOR EACH STATEMENT EXECUTE FUNCTION purge_expired_otps();
