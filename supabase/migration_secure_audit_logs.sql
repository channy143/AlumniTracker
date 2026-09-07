-- Migration: Secure Audit Logs Table and Immutability Triggers
-- Enhances audit_logs with actor details, severity, status, user_agent, and prevents tampering.

-- 1. Add enhanced audit columns
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(150);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON public.audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON public.audit_logs(actor_role);

-- 3. Sanitize existing legacy audit records (redact password hashes)
UPDATE public.audit_logs
SET details = (
  CASE 
    WHEN details ? 'new' AND details->'new' ? 'password_hash' THEN
      jsonb_set(details, '{new,password_hash}', '"[REDACTED]"'::jsonb, false)
    ELSE details
  END
)
WHERE details ? 'new' AND details->'new' ? 'password_hash';

UPDATE public.audit_logs
SET details = (
  CASE 
    WHEN details ? 'old' AND details->'old' ? 'password_hash' THEN
      jsonb_set(details, '{old,password_hash}', '"[REDACTED]"'::jsonb, false)
    ELSE details
  END
)
WHERE details ? 'old' AND details->'old' ? 'password_hash';

-- 4. Secure the trigger function to automatically redact credentials and handle DELETE operations
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_entity_id UUID;
BEGIN
  BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.id;
    v_old := to_jsonb(OLD) - 'password_hash' - 'token' - 'reset_token' - 'refresh_token';
    v_new := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_entity_id := NEW.id;
    v_old := to_jsonb(OLD) - 'password_hash' - 'token' - 'reset_token' - 'refresh_token';
    v_new := to_jsonb(NEW) - 'password_hash' - 'token' - 'reset_token' - 'refresh_token';
  ELSE
    v_entity_id := NEW.id;
    v_old := NULL;
    v_new := to_jsonb(NEW) - 'password_hash' - 'token' - 'reset_token' - 'refresh_token';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details, severity, status)
  VALUES (
    v_user_id,
    COALESCE(TG_ARGV[0], TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    jsonb_build_object('old', v_old, 'new', v_new),
    'info',
    'success'
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Immutability Trigger: Prohibit direct UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_tamper()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations on audit_logs are strictly prohibited for security compliance.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_tamper ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_tamper
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tamper();
