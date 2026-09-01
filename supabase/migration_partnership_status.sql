-- Add partnership tracking to the companies table
-- Used by the Employer Insights page to mark partner / non-partner organizations.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS partnership_status VARCHAR(20) DEFAULT 'non-partner' CHECK (
    partnership_status IN ('partner', 'non-partner')
  );

CREATE INDEX IF NOT EXISTS idx_companies_partnership_status ON public.companies(partnership_status);
