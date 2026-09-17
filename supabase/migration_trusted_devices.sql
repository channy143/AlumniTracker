-- Migration: User Trusted Devices table for MFA "Remember this device"
CREATE TABLE IF NOT EXISTS public.user_trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  device_name VARCHAR(255),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days')
);

CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_user_device ON public.user_trusted_devices(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_user_trusted_devices_expires_at ON public.user_trusted_devices(expires_at);

-- Purge expired devices periodically on insert
CREATE OR REPLACE FUNCTION purge_expired_trusted_devices()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_trusted_devices WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purge_expired_trusted_devices ON public.user_trusted_devices;
CREATE TRIGGER trigger_purge_expired_trusted_devices
  AFTER INSERT ON public.user_trusted_devices
  FOR EACH STATEMENT EXECUTE FUNCTION purge_expired_trusted_devices();
