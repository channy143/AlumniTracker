-- Security Hardening: Row Level Security policies for user-facing tables
-- These policies ensure users can only access their own data via PostgREST RLS.
-- Admin routes continue to use the service-role client which bypasses RLS.
--
-- ACTIVATION: The backend mints Supabase-compatible JWTs per request
-- (role='authenticated', sub=user UUID, signed with SUPABASE_JWT_SECRET) and
-- attaches them to the user-scoped client, so these auth.uid()/auth.role()
-- policies are enforced. The SUPABASE_JWT_SECRET env var must be set and this
-- migration must be applied to the Supabase project.

-- =============================================================================
-- PROFILES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Profiles are viewable by any authenticated user (directory feature)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- EDUCATION
-- =============================================================================
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Education viewable by authenticated users" ON public.education;
DROP POLICY IF EXISTS "Users can manage own education" ON public.education;

-- Education records are viewable by authenticated users (for directory)
CREATE POLICY "Education viewable by authenticated users"
  ON public.education FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can manage education records belonging to their own profile
CREATE POLICY "Users can insert own education"
  ON public.education FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own education"
  ON public.education FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own education"
  ON public.education FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =============================================================================
-- EMPLOYMENT
-- =============================================================================
ALTER TABLE public.employment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employment is viewable by authenticated users" ON public.employment;
DROP POLICY IF EXISTS "Users can manage own employment" ON public.employment;

-- Employment records are viewable by authenticated users (for directory)
CREATE POLICY "Employment viewable by authenticated users"
  ON public.employment FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can manage employment records belonging to their own profile
CREATE POLICY "Users can insert own employment"
  ON public.employment FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own employment"
  ON public.employment FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own employment"
  ON public.employment FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =============================================================================
-- MESSAGES
-- =============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages are viewable by sender or receiver" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they received (mark read)" ON public.messages;

-- Messages are only viewable by the sender or receiver
CREATE POLICY "Messages viewable by sender or receiver"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = sender_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = receiver_id
    )
  );

-- Users can only send messages as themselves (sender must be their profile)
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = sender_id)
  );

-- Only the receiver can update messages (mark as read)
CREATE POLICY "Receiver can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = receiver_id)
  );

-- =============================================================================
-- JOB APPLICATIONS
-- =============================================================================
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create own applications" ON public.job_applications;

-- Users can only view their own applications (admins use service-role, bypassing RLS)
CREATE POLICY "Users can view own job applications"
  ON public.job_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create applications as themselves
CREATE POLICY "Users can create own job applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own applications (e.g., withdraw)
CREATE POLICY "Users can update own job applications"
  ON public.job_applications FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- CONNECTIONS
-- =============================================================================
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connections are viewable by involved parties" ON public.connections;
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update connections they are involved in" ON public.connections;

-- Connections are viewable by the requester or recipient
CREATE POLICY "Connections viewable by involved parties"
  ON public.connections FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- Users can create connection requests as themselves
CREATE POLICY "Users can create connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = requester_id)
  );

-- Involved parties can update connections (accept/decline)
CREATE POLICY "Users can update connections they are involved in"
  ON public.connections FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- Involved parties can delete connections
CREATE POLICY "Users can delete connections they are involved in"
  ON public.connections FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = requester_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = recipient_id
    )
  );

-- =============================================================================
-- MENTORSHIPS
-- =============================================================================
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentorships viewable by involved parties" ON public.mentorships;
DROP POLICY IF EXISTS "Users can create mentorship requests" ON public.mentorships;
DROP POLICY IF EXISTS "Users can update mentorships they are involved in" ON public.mentorships;

-- Mentorships are viewable by the mentor or mentee
CREATE POLICY "Mentorships viewable by involved parties"
  ON public.mentorships FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = mentor_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = mentee_id
    )
  );

-- Users can create mentorship requests as themselves (mentee)
CREATE POLICY "Users can create mentorship requests"
  ON public.mentorships FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = mentee_id)
  );

-- Involved parties can update mentorships (accept/decline/complete)
CREATE POLICY "Users can update mentorships they are involved in"
  ON public.mentorships FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = mentor_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = mentee_id
    )
  );
