-- Native MFA toggle on the users table (used for the login MFA step).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Alumni eligibility registry for identity-verified registration.
-- Stores the canonical list of alumni/students eligible to create an account,
-- independent of registered user accounts. Registration verifies that a
-- submitted Student ID + Birthdate match a row here before allowing sign-up.

CREATE TABLE IF NOT EXISTS public.alumni_eligible (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  program VARCHAR(200),
  year_graduated INTEGER,
  -- Link to the registered account once activated (set by the server on success).
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alumni_eligible_student_id ON public.alumni_eligible(student_id);
CREATE INDEX IF NOT EXISTS idx_alumni_eligible_user_id ON public.alumni_eligible(user_id);

-- RLS: registry rows are visible/insertable only via the service role (server),
-- never to anon/authenticated clients directly. Birthdates stay private.
ALTER TABLE public.alumni_eligible ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alumni_eligible_admin_all" ON public.alumni_eligible
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
  );
