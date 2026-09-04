-- Applicant screening columns
-- Adds columns to job_applications for manual skill-matching screening.

ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS matched_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS missing_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS screening_notes TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS match_percentage INTEGER DEFAULT 0;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS is_screened BOOLEAN DEFAULT FALSE;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS screened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_job_applications_match_percentage ON public.job_applications(match_percentage);
CREATE INDEX IF NOT EXISTS idx_job_applications_is_screened ON public.job_applications(is_screened);
