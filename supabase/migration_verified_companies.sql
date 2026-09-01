-- Verified companies instead of free-text company names for job postings.
--
-- Introduces a company_id foreign key on job_postings that references the
-- companies table. New job postings should be created against a verified
-- company rather than a free-text company_name string.

-- Add company_id column if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_postings' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.job_postings
      ADD COLUMN company_id UUID REFERENCES public.companies(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_postings_company_id ON public.job_postings(company_id);

-- Only verified companies may be referenced by new job postings.
-- (Enforcement is done in the application layer; this index speeds lookups.)
