-- =============================================================================
-- Migration: PRC Board Licensures & Postgraduate Studies for Accreditation
-- Adds tracking for PRC Board Exam passers (LET, CPA, etc.) and Advanced Degrees
-- (Master's, Doctorate) required for CHED / SUC Leveling institutional audits.
-- =============================================================================

-- 1. ALUMNI LICENSURES & PRC BOARD EXAMINATIONS
CREATE TABLE IF NOT EXISTS public.alumni_licensures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  exam_title VARCHAR(250) NOT NULL,          -- e.g. 'Licensure Examination for Teachers (LET) - Secondary'
  license_number VARCHAR(100),               -- PRC Registration / License Number
  exam_date DATE,                            -- Date exam was taken
  year_passed INTEGER NOT NULL,              -- Year passed
  rating NUMERIC(5,2),                       -- Board rating percentage (e.g. 87.50)
  status VARCHAR(50) DEFAULT 'passed' CHECK (status IN ('passed', 'pending_results')),
  verified_by_admin BOOLEAN DEFAULT FALSE,   -- Verified against PRC official gazette
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ALUMNI POSTGRADUATE & ADVANCED STUDIES
CREATE TABLE IF NOT EXISTS public.alumni_postgraduate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  degree_level VARCHAR(50) NOT NULL CHECK (degree_level IN ('masteral', 'doctoral', 'post_graduate_diploma')),
  institution VARCHAR(250) NOT NULL,         -- e.g. 'Cebu Technological University - Main Campus'
  program_title VARCHAR(250) NOT NULL,       -- e.g. 'Master of Science in Information Technology (MSIT)'
  major VARCHAR(150),                        -- Specialization or Major
  start_year INTEGER NOT NULL,               -- Year commenced
  completion_year INTEGER,                   -- Year completed / conferred (nullable if ongoing)
  status VARCHAR(50) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'candidate', 'graduated')),
  thesis_title TEXT,                         -- Title of thesis or dissertation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_alumni_licensures_profile ON public.alumni_licensures(profile_id);
CREATE INDEX IF NOT EXISTS idx_alumni_licensures_user ON public.alumni_licensures(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_licensures_exam ON public.alumni_licensures(exam_title);
CREATE INDEX IF NOT EXISTS idx_alumni_licensures_year ON public.alumni_licensures(year_passed);

CREATE INDEX IF NOT EXISTS idx_alumni_postgrad_profile ON public.alumni_postgraduate(profile_id);
CREATE INDEX IF NOT EXISTS idx_alumni_postgrad_user ON public.alumni_postgraduate(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_postgrad_level ON public.alumni_postgraduate(degree_level);
CREATE INDEX IF NOT EXISTS idx_alumni_postgrad_status ON public.alumni_postgraduate(status);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.alumni_licensures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_postgraduate ENABLE ROW LEVEL SECURITY;

-- Licensures Policies
CREATE POLICY "Allow public read licensures"
  ON public.alumni_licensures
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow owner insert licensures"
  ON public.alumni_licensures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );

CREATE POLICY "Allow owner update licensures"
  ON public.alumni_licensures
  FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );

CREATE POLICY "Allow owner delete licensures"
  ON public.alumni_licensures
  FOR DELETE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );

-- Postgraduate Policies
CREATE POLICY "Allow public read postgrad"
  ON public.alumni_postgraduate
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow owner insert postgrad"
  ON public.alumni_postgraduate
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );

CREATE POLICY "Allow owner update postgrad"
  ON public.alumni_postgraduate
  FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );

CREATE POLICY "Allow owner delete postgrad"
  ON public.alumni_postgraduate
  FOR DELETE
  TO authenticated
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'alumni_officer', 'staff'))
  );
