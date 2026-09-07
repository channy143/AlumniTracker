-- CTU-Naga Alumni Onboarding Survey & Data Privacy Consent Migration

-- 1. Add survey_completed column to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT FALSE;

-- 2. Add civil_status column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50);

-- 3. Insert or update default CTU-Naga Alumni Onboarding Survey record
INSERT INTO public.surveys (
  id,
  title,
  description,
  questions,
  target_groups,
  is_active,
  is_closed,
  status,
  starts_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CTU-Naga Graduate Tracer & Alumni Registration Survey',
  'Official onboarding survey and data privacy consent for newly registered Cebu Technological University - Naga Extension Campus alumni.',
  '[]'::jsonb,
  '{}',
  true,
  false,
  'published',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = true,
  status = 'published';
