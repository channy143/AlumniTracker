-- Migration: Unify BTLEd degrees (BTLED-HE and BTLED-ICT into BTLED only)
-- Description: Consolidates Home Economics (HE) and Information & Communication Technology (ICT)
-- majors into a single unified Bachelor of Technology and Livelihood Education (BTLED) program.

-- 1. Update alumni eligibility registry table
UPDATE public.alumni_eligible
SET program = 'BTLED'
WHERE program IN ('BTLED-HE', 'BTLED-ICT', 'BTLEd-HE', 'BTLEd-ICT', 'BTLED_HE', 'BTLED_ICT')
   OR program ILIKE '%Technology and Livelihood Education%Home Economics%'
   OR program ILIKE '%Technology and Livelihood Education%Information and Communication%';

-- 2. Update education records for alumni profiles
UPDATE public.education
SET program = 'BTLED'
WHERE program IN ('BTLED-HE', 'BTLED-ICT', 'BTLEd-HE', 'BTLEd-ICT', 'BTLED_HE', 'BTLED_ICT')
   OR program ILIKE '%Technology and Livelihood Education%Home Economics%'
   OR program ILIKE '%Technology and Livelihood Education%Information and Communication%';

-- 3. Update any course-targeted surveys
UPDATE public.surveys
SET target_value = 'BTLED'
WHERE target_type = 'course'
  AND target_value IN ('BTLED-HE', 'BTLED-ICT', 'BTLEd-HE', 'BTLEd-ICT', 'BTLED_HE', 'BTLED_ICT');

-- 4. Update system settings default courses list if present
UPDATE public.settings
SET value = jsonb_set(
  value,
  '{courses}',
  '["BEEd", "BSEd-Math", "BTLED", "BIT", "BSIT"]'::jsonb
)
WHERE key = 'system_settings'
  AND value ? 'courses'
  AND (
    value->'courses' @> '["BTLED-HE"]'::jsonb
    OR value->'courses' @> '["BTLED-ICT"]'::jsonb
  );
