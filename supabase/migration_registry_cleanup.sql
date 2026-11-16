-- Migration: Clean Alumni Master Registry data issues
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Title-case all-caps first_name, last_name, middle_name in profiles
UPDATE public.profiles
SET
  first_name = initcap(lower(trim(first_name))),
  last_name = initcap(lower(trim(last_name))),
  middle_name = CASE WHEN middle_name IS NOT NULL AND trim(middle_name) <> '' THEN initcap(lower(trim(middle_name))) ELSE NULL END
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;

-- 2. Fix Janice Ferez: swapped name ("Ferez Janice" / "A"), malformed email ("janice3219gmail.com"), and unbacked "Employed" status
UPDATE public.profiles
SET
  first_name = 'Janice',
  last_name = 'Ferez',
  middle_name = 'A.',
  email = 'janice3219@gmail.com'
WHERE lower(trim(coalesce(email, ''))) = 'janice3219gmail.com'
   OR (lower(trim(coalesce(first_name, ''))) LIKE '%ferez%janice%');

UPDATE public.users
SET
  email = 'janice3219@gmail.com',
  is_verified = false
WHERE lower(trim(coalesce(email, ''))) = 'janice3219gmail.com';

-- Mark any user with a malformed email (missing @ or domain) as unverified
UPDATE public.users
SET is_verified = false
WHERE email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$';

-- 3. Fix Donald Obeso: swapped first_name ("Obeso") and last_name ("Donald")
UPDATE public.profiles
SET
  first_name = 'Donald',
  last_name = 'Obeso'
WHERE lower(trim(coalesce(first_name, ''))) = 'obeso'
  AND lower(trim(coalesce(last_name, ''))) = 'donald';

-- 4. Normalize Philippine phone numbers to 09XXXXXXXXX (11 digits)
UPDATE public.profiles
SET phone = '0' || substring(regexp_replace(phone, '[^0-9]', '', 'g') FROM 3)
WHERE phone IS NOT NULL
  AND regexp_replace(phone, '[^0-9]', '', 'g') ~ '^639[0-9]{9}$';

-- 5. Clear default 'Philippines' country where both city and province are blank
UPDATE public.profiles
SET country = NULL
WHERE (city IS NULL OR trim(city) = '')
  AND (province IS NULL OR trim(province) = '')
  AND lower(trim(coalesce(country, ''))) = 'philippines';

-- 6. Clear unbacked 'Employed' / 'Self-employed' status on profiles that have no job title, no company, and no active employment record
UPDATE public.profiles p
SET
  employment_status = NULL,
  current_job_title = NULL,
  company_name = NULL
WHERE lower(trim(coalesce(p.employment_status, ''))) IN ('employed', 'self-employed')
  AND (p.current_job_title IS NULL OR trim(p.current_job_title) = '')
  AND (p.company_name IS NULL OR trim(p.company_name) = '')
  AND NOT EXISTS (
    SELECT 1 FROM public.employment e
    WHERE e.profile_id = p.id AND e.is_current = true
  );

-- 7. Clear default 'Unemployed' status on students (graduation year > current year) or users who haven't completed onboarding
UPDATE public.profiles p
SET employment_status = NULL
WHERE lower(trim(coalesce(p.employment_status, ''))) = 'unemployed'
  AND (
    EXISTS (
      SELECT 1 FROM public.education ed
      WHERE ed.profile_id = p.id
        AND ed.year_graduated > EXTRACT(YEAR FROM CURRENT_DATE)
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p.user_id
        AND coalesce(u.survey_completed, false) = false
    )
  );

-- 8. Flag/archive disposable-email test account (Quizzel Espinosa @ mediseat.com)
UPDATE public.users
SET is_archived = true, is_verified = false
WHERE lower(trim(coalesce(email, ''))) LIKE '%@mediseat.com';

COMMIT;
