-- Migration: Clean bad/duplicate employment rows and enforce integrity constraints
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Remove placeholder / junk test rows in employment
DELETE FROM public.employment
WHERE lower(trim(coalesce(position, ''))) IN (
  'position',
  'current position',
  'imong mama',
  'ceo of being lazy-smart',
  'test',
  'sample',
  'n/a',
  'na',
  'none'
)
OR lower(trim(coalesce(company_name, ''))) IN (
  'organization',
  'position',
  'company',
  'imong mama',
  'test',
  'sample',
  'n/a',
  'na',
  'none'
);

-- 2. Normalize industry naming variants
UPDATE public.employment
SET company_industry = 'Information Technology'
WHERE lower(trim(coalesce(company_industry, ''))) IN ('technology', 'it', 'tech', 'information technology & software');

UPDATE public.profiles
SET industry = 'Information Technology'
WHERE lower(trim(coalesce(industry, ''))) IN ('technology', 'it', 'tech', 'information technology & software');

UPDATE public.employment
SET company_industry = 'Other'
WHERE lower(trim(coalesce(company_industry, ''))) = 'other industry';

-- 3. Remove duplicate (profile_id, company_name, position) rows, keeping the earliest start_date (or lowest id)
WITH ranked_dups AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY profile_id, lower(trim(company_name)), lower(trim(position))
      ORDER BY start_date ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.employment
)
DELETE FROM public.employment e
USING ranked_dups d
WHERE e.id = d.id AND d.rn > 1;

-- 4. Convert any literal 'Present' strings in end_date to NULL, and make end_date IS NULL the single source of truth for current positions
UPDATE public.employment
SET end_date = NULL
WHERE is_current = true
   OR lower(trim(coalesce(end_date::text, ''))) = 'present'
   OR trim(coalesce(end_date::text, '')) = '';

-- For any profile that has multiple rows with end_date IS NULL, keep only the latest start_date as end_date IS NULL (is_current = true) and close older ones
WITH ordered_open AS (
  SELECT
    id,
    profile_id,
    start_date,
    LEAD(start_date) OVER (PARTITION BY profile_id ORDER BY start_date ASC NULLS LAST, created_at ASC NULLS LAST, id ASC) AS next_start_date,
    ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY start_date DESC NULLS LAST, created_at DESC NULLS LAST, id DESC) AS rev_rn
  FROM public.employment
  WHERE end_date IS NULL
)
UPDATE public.employment e
SET
  is_current = false,
  end_date = GREATEST(coalesce(o.next_start_date, e.start_date), e.start_date)
FROM ordered_open o
WHERE e.id = o.id AND o.rev_rn > 1;

-- Sync is_current flag from end_date IS NULL
UPDATE public.employment
SET is_current = (end_date IS NULL);

-- Normalize salary_range formats and clear default 'Undisclosed' / test outliers (150000)
UPDATE public.employment
SET salary_range = CASE
  WHEN lower(trim(coalesce(salary_range, ''))) IN ('undisclosed', 'n/a', 'na', 'none', 'null', '150000', '') THEN NULL
  WHEN lower(trim(salary_range)) IN ('10001-20000', 'below 20000', '<20000') THEN 'Below ₱20,000'
  WHEN lower(trim(salary_range)) IN ('20000-40000', '20001-40000') THEN '₱20,000–₱40,000'
  WHEN lower(trim(salary_range)) IN ('40000-60000', '40001-60000') THEN '₱40,000–₱60,000'
  ELSE salary_range
END;

-- 5. Enforce date order and prevent duplicate (profile_id, company_name, position, start_date)
ALTER TABLE public.employment
  DROP CONSTRAINT IF EXISTS employment_end_after_start_chk;

ALTER TABLE public.employment
  ADD CONSTRAINT employment_end_after_start_chk
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

CREATE UNIQUE INDEX IF NOT EXISTS employment_unique_role_start_idx
  ON public.employment (profile_id, lower(trim(company_name)), lower(trim(position)), start_date);

COMMIT;
