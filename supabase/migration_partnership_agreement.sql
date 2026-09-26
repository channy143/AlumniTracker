-- Migration: Partnership Agreement & Verification System for Companies
-- Adds agreement metadata, verification workflow, and audit logging support

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employer_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_type VARCHAR(10);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_title VARCHAR(255);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_number VARCHAR(100);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_file TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_start_date DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_end_date DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS agreement_verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS verification_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_employer_type ON public.companies(employer_type);
CREATE INDEX IF NOT EXISTS idx_companies_agreement_verification ON public.companies(agreement_verification_status);
