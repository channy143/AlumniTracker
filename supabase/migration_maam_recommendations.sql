-- ==============================================================================
-- Migration: Ma'am's Recommendations for CTU-Naga Alumni Connect
-- 1. Job Postings: Poster image, vacancies count, direct contact phone & email
-- 2. Employment: Proof of employment upload, verification audit workflow (Q-Pro)
-- 3. Profiles: Demographic fields (birth_date, gender) & indexing for PESO/Q-Pro
-- ==============================================================================

-- 1. Job Postings Enhancement
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS poster_url TEXT;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS vacancies_count INT DEFAULT 1;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);

-- 2. Employment Proof & Verification (Q-Pro Accreditation)
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS proof_type VARCHAR(50) DEFAULT 'coe';
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.employment ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Ensure constraint references users(id) so PostgREST embeds profiles-employment without ambiguity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employment_verified_by_fkey' AND confrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.employment DROP CONSTRAINT employment_verified_by_fkey;
    ALTER TABLE public.employment ADD CONSTRAINT employment_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Demographics in Profiles (Ensure existence)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_employment_verification_status ON public.employment(verification_status);
CREATE INDEX IF NOT EXISTS idx_employment_is_verified ON public.employment(is_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON public.profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
CREATE INDEX IF NOT EXISTS idx_job_postings_vacancies ON public.job_postings(vacancies_count);

