-- Migration: Add middle_name and graduation_date to alumni_eligible and education tables
-- Allows alumni identity verification via:
-- Last Name, First Name, Middle Name (optional), Graduation Day (date), Batch Year

ALTER TABLE public.alumni_eligible
  ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS graduation_date DATE,
  ALTER COLUMN student_id DROP NOT NULL,
  ALTER COLUMN birth_date DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alumni_eligible_names
  ON public.alumni_eligible(last_name, first_name);

ALTER TABLE public.education
  ADD COLUMN IF NOT EXISTS graduation_date DATE;
