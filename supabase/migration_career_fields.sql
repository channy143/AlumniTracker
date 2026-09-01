-- Add career tracking fields to the profiles table
-- These are nullable to preserve all existing records

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) CHECK (
    employment_status IN ('Employed', 'Unemployed', 'Self-employed', 'Student', 'Seeking Opportunities', 'Retired')
  ),
  ADD COLUMN IF NOT EXISTS current_job_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS salary_range VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON public.profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_industry ON public.profiles(industry);
CREATE INDEX IF NOT EXISTS idx_profiles_last_updated_at ON public.profiles(last_updated_at);
