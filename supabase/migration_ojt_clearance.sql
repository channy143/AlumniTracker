-- Migration: Support dual OJT/Practice Teaching deployments & graduation clearance tracking
-- Run this in Supabase SQL Editor.

ALTER TABLE public.employment
  ADD COLUMN IF NOT EXISTS record_category VARCHAR(20) NOT NULL DEFAULT 'employment',
  ADD COLUMN IF NOT EXISTS clearance_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clearance_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clearance_verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Backfill existing internship/OJT entries
UPDATE public.employment
SET record_category = 'ojt'
WHERE lower(coalesce(job_type, '')) = 'internship'
   OR lower(coalesce(employment_status, '')) = 'ojt';

CREATE INDEX IF NOT EXISTS idx_employment_profile_category_current
  ON public.employment (profile_id, record_category, is_current);
