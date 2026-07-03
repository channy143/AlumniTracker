-- CTU-Naga Alumni Connect Database Schema
-- "Bridging Education to Eternity"

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE (managed by Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'alumni' CHECK (role IN ('admin', 'staff', 'alumni')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Philippines',
  avatar_url TEXT,
  id_number VARCHAR(50) UNIQUE,
  headline VARCHAR(200),
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  privacy_settings JSONB DEFAULT '{
    "show_email": false,
    "show_phone": false,
    "show_address": false,
    "show_employment": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EDUCATION TABLE
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program VARCHAR(200) NOT NULL,
  major VARCHAR(200),
  year_started INTEGER,
  year_graduated INTEGER NOT NULL,
  campus VARCHAR(200) DEFAULT 'Naga Extension Campus',
  honors VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYMENT TABLE
CREATE TABLE public.employment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  company_industry VARCHAR(100),
  position VARCHAR(200) NOT NULL,
  employment_status VARCHAR(30) DEFAULT 'employed' CHECK (
    employment_status IN ('employed', 'self-employed', 'unemployed', 'seeking', 'student', 'entrepreneur', 'retired')
  ),
  job_type VARCHAR(20) DEFAULT 'full-time' CHECK (
    job_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')
  ),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT TRUE,
  salary_range VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SKILLS TABLE
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  proficiency_level INTEGER DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 5),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CERTIFICATIONS TABLE
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  issuer VARCHAR(200) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MENTORSHIPS TABLE
CREATE TABLE public.mentorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id UUID,
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'completed', 'cancelled')
  ),
  goals TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNITY GROUPS TABLE
CREATE TABLE public.community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general' CHECK (
    category IN ('tech', 'business', 'education', 'entrepreneurship', 'general')
  ),
  member_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GROUP MEMBERS TABLE
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.community_groups(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

-- FORUM POSTS TABLE
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.community_groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOB POSTINGS TABLE
CREATE TABLE public.job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(200) NOT NULL,
  company_logo TEXT,
  position VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  location VARCHAR(200) NOT NULL,
  job_type VARCHAR(20) DEFAULT 'full-time' CHECK (
    job_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship')
  ),
  salary_range VARCHAR(50),
  application_url TEXT,
  posted_by UUID REFERENCES public.profiles(id),
  is_alumni_exclusive BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JOB APPLICATIONS TABLE
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, user_id)
);

-- SURVEYS TABLE
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  target_groups TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SURVEY RESPONSES TABLE
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(survey_id, user_id)
);

-- EVENTS TABLE
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  type VARCHAR(30) DEFAULT 'other' CHECK (
    type IN ('reunion', 'webinar', 'networking', 'workshop', 'other')
  ),
  modality VARCHAR(20) DEFAULT 'online' CHECK (modality IN ('online', 'in-person', 'hybrid')),
  location VARCHAR(300),
  meeting_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_participants INTEGER,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_employment_profile_id ON public.employment(profile_id);
CREATE INDEX idx_employment_is_current ON public.employment(is_current);
CREATE INDEX idx_education_profile_id ON public.education(profile_id);
CREATE INDEX idx_skills_profile_id ON public.skills(profile_id);
CREATE INDEX idx_mentorships_mentor ON public.mentorships(mentor_id);
CREATE INDEX idx_mentorships_mentee ON public.mentorships(mentee_id);
CREATE INDEX idx_forum_posts_group ON public.forum_posts(group_id);
CREATE INDEX idx_job_postings_active ON public.job_postings(expires_at);
CREATE INDEX idx_surveys_active ON public.surveys(is_active);

-- ROW LEVEL SECURITY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- USERS POLICIES
CREATE POLICY "Users can read own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- EMPLOYMENT POLICIES
CREATE POLICY "Employment is viewable by authenticated users"
  ON public.employment FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own employment"
  ON public.employment FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employment_updated_at
  BEFORE UPDATE ON public.employment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
