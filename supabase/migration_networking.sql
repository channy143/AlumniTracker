-- Career Analytics & Alumni Networking Platform Migration
-- Adds tables for networking, referrals, messaging, and company features

-- Ensure prerequisite tables exist (defined in schema.sql but may not be applied)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  logo TEXT,
  industry VARCHAR(100),
  website VARCHAR(300),
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Philippines',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONNECTIONS TABLE (alumni networking)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  message TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  subject VARCHAR(300),
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.referral_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  position_title VARCHAR(200),
  company_name VARCHAR(200),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANY FOLLOWERS TABLE
CREATE TABLE IF NOT EXISTS public.company_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, company_id)
);

-- Add new columns to job_postings for richer job board
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT 'entry' CHECK (
  experience_level IN ('entry', 'junior', 'mid', 'senior', 'lead', 'executive')
);
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE;

-- Add referral availability to profiles (already has privacy_settings JSONB - extend)
-- Note: existing privacy_settings JSONB already stores show_email, show_phone, show_address, show_employment

-- Add columns for referral availability and networking preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_for_referral BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_for_mentoring BOOLEAN DEFAULT FALSE;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON public.connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_connection ON public.messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_referral_requests_requester ON public.referral_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_recipient ON public.referral_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_job ON public.referral_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_status ON public.referral_requests(status);
CREATE INDEX IF NOT EXISTS idx_company_followers_profile ON public.company_followers(profile_id);
CREATE INDEX IF NOT EXISTS idx_company_followers_company ON public.company_followers(company_id);

-- RLS POLICIES
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Connections are viewable by involved parties"
  ON public.connections FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

CREATE POLICY "Users can create connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = requester_id)
  );

CREATE POLICY "Users can update connections they are involved in"
  ON public.connections FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- Messages policies
CREATE POLICY "Messages are viewable by sender or receiver"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = sender_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = receiver_id
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = sender_id)
  );

CREATE POLICY "Users can update messages they received (mark read)"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = receiver_id)
  );

-- Referral requests policies
CREATE POLICY "Referral requests are viewable by involved parties"
  ON public.referral_requests FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

CREATE POLICY "Users can create referral requests"
  ON public.referral_requests FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = requester_id)
  );

CREATE POLICY "Users can update referral requests they are involved in"
  ON public.referral_requests FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- Company followers policies
CREATE POLICY "Company followers are viewable by authenticated users"
  ON public.company_followers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can follow/unfollow companies"
  ON public.company_followers FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );

CREATE POLICY "Users can unfollow companies"
  ON public.company_followers FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id)
  );
