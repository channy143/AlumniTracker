-- Migration: Fix Alumni Deletion and Cascade / Null Constraints
-- Decouples foreign key on immutable audit_logs and adds ON DELETE SET NULL to user/profile reference tables

-- 1. Drop foreign key constraint on audit_logs.user_id
-- Audit logs are immutable records of historical activity protected by trg_prevent_audit_tamper.
-- Retaining the user_id UUID column without an FK constraint preserves historical audit trail
-- while allowing users to be deleted when requested by an administrator.
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- 2. Update events created_by foreign key to ON DELETE SET NULL
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Update job_postings posted_by foreign key to ON DELETE SET NULL
ALTER TABLE public.job_postings DROP CONSTRAINT IF EXISTS job_postings_posted_by_fkey;
ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_posted_by_fkey
  FOREIGN KEY (posted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Update community_groups created_by foreign key to ON DELETE SET NULL
ALTER TABLE public.community_groups DROP CONSTRAINT IF EXISTS community_groups_created_by_fkey;
ALTER TABLE public.community_groups
  ADD CONSTRAINT community_groups_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 5. Update companies verified_by foreign key to ON DELETE SET NULL
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_verified_by_fkey;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 6. Update settings updated_by foreign key to ON DELETE SET NULL
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_updated_by_fkey;
ALTER TABLE public.settings
  ADD CONSTRAINT settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
