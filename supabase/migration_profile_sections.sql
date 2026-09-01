-- Additional profile URL fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS behance_url TEXT,
ADD COLUMN IF NOT EXISTS google_scholar_url TEXT,
ADD COLUMN IF NOT EXISTS personal_website_url TEXT;

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'other' CHECK (category IN ('award', 'recognition', 'publication', 'speaker', 'promotion', 'leadership', 'other')),
  date_achieved DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career feedback / tracer study table
CREATE TABLE IF NOT EXISTS public.career_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  degree_relevance INTEGER CHECK (degree_relevance BETWEEN 1 AND 5),
  curriculum_preparation INTEGER CHECK (curriculum_preparation BETWEEN 1 AND 5),
  recommend_changes BOOLEAN,
  suggested_skills TEXT[] DEFAULT '{}',
  suggested_subjects TEXT[] DEFAULT '{}',
  skills_used_at_work TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_profile_id ON public.achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_feedback_profile_id ON public.career_feedback(profile_id);
