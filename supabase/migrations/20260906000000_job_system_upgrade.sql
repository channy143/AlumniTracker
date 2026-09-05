CREATE TABLE IF NOT EXISTS public.employers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employers_company_name ON public.employers(company_name);

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS employer_id UUID REFERENCES public.employers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON public.job_postings(employer_id);

INSERT INTO public.employers (company_name, industry, contact_email)
SELECT DISTINCT j.company_name, j.industry, NULL
FROM public.job_postings j
WHERE j.company_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.employers e WHERE e.company_name = j.company_name
  );

UPDATE public.job_postings j
SET employer_id = e.id
FROM public.employers e
WHERE j.company_name = e.company_name
  AND j.employer_id IS NULL;

ALTER TABLE public.job_applications ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('pending', 'under_review', 'shortlisted', 'rejected', 'hired', 'reviewed', 'accepted'));

CREATE TABLE IF NOT EXISTS public.application_screening (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.job_applications(id) ON DELETE CASCADE,
  skills_match_score DECIMAL(5,2) DEFAULT 0.00,
  experience_match_score DECIMAL(5,2) DEFAULT 0.00,
  education_match_score DECIMAL(5,2) DEFAULT 0.00,
  overall_match_score DECIMAL(5,2) DEFAULT 0.00,
  screening_notes TEXT,
  screened_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  screened_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_screening_app_id ON public.application_screening(application_id);
CREATE INDEX IF NOT EXISTS idx_application_screening_screened_at ON public.application_screening(screened_at);

CREATE TABLE IF NOT EXISTS public.employer_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE,
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE,
  report_data JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  exported_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employer_reports_employer_id ON public.employer_reports(employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_reports_job_posting_id ON public.employer_reports(job_posting_id);
