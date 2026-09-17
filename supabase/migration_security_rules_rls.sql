-- =============================================================================
-- Migration: Security Rules & Row Level Security (RLS) Policy Enforcement
-- Rules 4, 5, and 6 — RA 10173 (Data Privacy Act of 2012) Compliance
-- =============================================================================

-- Enable UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER FUNCTION: is_admin()
-- Evaluates whether the current authenticated user has administrative privileges.
-- Marked SECURITY DEFINER to bypass table recursion issues during policy checks.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    (COALESCE(auth.jwt() ->> 'role', '') = 'service_role')
    OR
    (COALESCE(auth.jwt() ->> 'user_role', '') = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RULE 4: SECURE DATABASE MANAGEMENT
-- Protection against accidental deletion, alteration, and unauthorized access
-- =============================================================================

-- 1. Anti-Tamper & Privilege Escalation Trigger on public.users
-- Prevents non-admin users from escalating their own role, verified status, or flags.
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role or admin to perform any modification
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Disallow regular users from altering critical security fields
  IF (OLD.role IS DISTINCT FROM NEW.role) THEN
    RAISE EXCEPTION 'Security Policy Violation: You cannot alter your account role.';
  END IF;

  IF (OLD.is_verified IS DISTINCT FROM NEW.is_verified) THEN
    RAISE EXCEPTION 'Security Policy Violation: Account verification status can only be managed by administrators.';
  END IF;

  IF (OLD.is_active IS DISTINCT FROM NEW.is_active) OR (OLD.is_archived IS DISTINCT FROM NEW.is_archived) THEN
    RAISE EXCEPTION 'Security Policy Violation: Account status flags can only be managed by administrators.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();

-- 2. Accidental & Unauthorized Deletion Prevention Trigger on public.profiles
-- Prevents accidental deletion of alumni profiles; only institutional administrators can hard-delete records.
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Data Protection Rule 4: Alumni records must not be deleted without administrator authorization. Contact system administrator.';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_profile_delete ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_profile_delete();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL APPLICATION TABLES
-- =============================================================================

-- A. CERTIFICATIONS
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Certifications viewable by authenticated users" ON public.certifications;
DROP POLICY IF EXISTS "Users can insert own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can update own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can delete own certifications" ON public.certifications;

CREATE POLICY "Certifications viewable by authenticated users"
  ON public.certifications FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own certifications"
  ON public.certifications FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can update own certifications"
  ON public.certifications FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can delete own certifications"
  ON public.certifications FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- B. ACHIEVEMENTS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Achievements viewable by authenticated users" ON public.achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can delete own achievements" ON public.achievements;

CREATE POLICY "Achievements viewable by authenticated users"
  ON public.achievements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can update own achievements"
  ON public.achievements FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can delete own achievements"
  ON public.achievements FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- C. CAREER FEEDBACK / TRACER STUDY DATA
ALTER TABLE public.career_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Career feedback viewable by owner and admin" ON public.career_feedback;
DROP POLICY IF EXISTS "Users can manage own career feedback" ON public.career_feedback;

CREATE POLICY "Career feedback viewable by owner and admin"
  ON public.career_feedback FOR SELECT
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can insert own career feedback"
  ON public.career_feedback FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own career feedback"
  ON public.career_feedback FOR UPDATE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- D. COMMUNITY GROUPS & FORUMS
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Community groups viewable by authenticated users" ON public.community_groups;
DROP POLICY IF EXISTS "Users and admin can insert community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Group creator and admin can update community groups" ON public.community_groups;

CREATE POLICY "Community groups viewable by authenticated users"
  ON public.community_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users and admin can insert community groups"
  ON public.community_groups FOR INSERT
  WITH CHECK (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Group creator and admin can update community groups"
  ON public.community_groups FOR UPDATE
  USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group members viewable by authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Group members viewable by authenticated users"
  ON public.group_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Forum posts viewable by authenticated users" ON public.forum_posts;
DROP POLICY IF EXISTS "Users can create forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors and admins can update forum posts" ON public.forum_posts;
DROP POLICY IF EXISTS "Authors and admins can delete forum posts" ON public.forum_posts;

CREATE POLICY "Forum posts viewable by authenticated users"
  ON public.forum_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create forum posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Authors and admins can update forum posts"
  ON public.forum_posts FOR UPDATE
  USING (
    author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Authors and admins can delete forum posts"
  ON public.forum_posts FOR DELETE
  USING (
    author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- E. JOB POSTINGS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Job postings viewable by authenticated users" ON public.job_postings;
DROP POLICY IF EXISTS "Alumni and employers can insert job postings" ON public.job_postings;
DROP POLICY IF EXISTS "Posters and admins can update job postings" ON public.job_postings;
DROP POLICY IF EXISTS "Posters and admins can delete job postings" ON public.job_postings;

CREATE POLICY "Job postings viewable by authenticated users"
  ON public.job_postings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alumni and employers can insert job postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (
    posted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Posters and admins can update job postings"
  ON public.job_postings FOR UPDATE
  USING (
    posted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Posters and admins can delete job postings"
  ON public.job_postings FOR DELETE
  USING (
    posted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- F. SURVEYS AND SURVEY RESPONSES (Rule 4 & 5 Protection of Tracer Survey Data)
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active surveys viewable by authenticated users" ON public.surveys;
DROP POLICY IF EXISTS "Admins can manage surveys" ON public.surveys;

CREATE POLICY "Active surveys viewable by authenticated users"
  ON public.surveys FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage surveys"
  ON public.surveys FOR ALL
  USING (public.is_admin());

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own survey responses or admin" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can insert own survey response" ON public.survey_responses;
DROP POLICY IF EXISTS "Users can update own survey response" ON public.survey_responses;

CREATE POLICY "Users can view own survey responses or admin"
  ON public.survey_responses FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "Users can insert own survey response"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own survey response"
  ON public.survey_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- G. EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Organizers and admins can manage events" ON public.events;

CREATE POLICY "Events viewable by authenticated users"
  ON public.events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Organizers and admins can manage events"
  ON public.events FOR ALL
  USING (
    created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- H. COMPANIES
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies viewable by authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;

CREATE POLICY "Companies viewable by authenticated users"
  ON public.companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (public.is_admin());

-- I. AUDIT LOGS (Immutable, Admin View Only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admin only" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs insertable by system only" ON public.audit_logs;

CREATE POLICY "Audit logs viewable by admin only"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- J. SYSTEM SETTINGS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings viewable by admin only" ON public.settings;
DROP POLICY IF EXISTS "Settings manageable by admin only" ON public.settings;

CREATE POLICY "Settings viewable by admin only"
  ON public.settings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Settings manageable by admin only"
  ON public.settings FOR ALL
  USING (public.is_admin());

-- K. OTP CODES (Zero-Trust lockdown: No direct client access)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- By enabling RLS without any SELECT/INSERT/UPDATE/DELETE policies, PostgREST will deny
-- all direct client/anon/authenticated access. Only service_role client on backend can access.

-- L. USER TRUSTED DEVICES
ALTER TABLE public.user_trusted_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own trusted devices" ON public.user_trusted_devices;
DROP POLICY IF EXISTS "Users can delete own trusted devices" ON public.user_trusted_devices;

CREATE POLICY "Users can view own trusted devices"
  ON public.user_trusted_devices FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own trusted devices"
  ON public.user_trusted_devices FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- M. EMPLOYERS, APPLICATION SCREENING, AND EMPLOYER REPORTS
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employers viewable by authenticated users" ON public.employers;
DROP POLICY IF EXISTS "Admins can manage employers" ON public.employers;

CREATE POLICY "Employers viewable by authenticated users"
  ON public.employers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage employers"
  ON public.employers FOR ALL
  USING (public.is_admin());

ALTER TABLE public.application_screening ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Application screening viewable by admin only" ON public.application_screening;
DROP POLICY IF EXISTS "Application screening manageable by admin only" ON public.application_screening;

CREATE POLICY "Application screening viewable by admin only"
  ON public.application_screening FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Application screening manageable by admin only"
  ON public.application_screening FOR ALL
  USING (public.is_admin());

ALTER TABLE public.employer_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employer reports viewable by admin only" ON public.employer_reports;
DROP POLICY IF EXISTS "Employer reports manageable by admin only" ON public.employer_reports;

CREATE POLICY "Employer reports viewable by admin only"
  ON public.employer_reports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Employer reports manageable by admin only"
  ON public.employer_reports FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- RULE 5: PROPER USE OF REPORTS AND ANALYTICS
-- Secure report export tracking table & immutability
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.report_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  report_name VARCHAR(150) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('csv', 'json', 'pdf', 'xlsx')),
  record_count INTEGER DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  purpose TEXT DEFAULT 'Administrative and Institutional Analytics',
  ip_address VARCHAR(45),
  user_agent TEXT,
  dpa_compliance_notice TEXT DEFAULT 'Governed by Republic Act No. 10173 (Data Privacy Act of 2012). Strictly confidential.',
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_exports_user_id ON public.report_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_report_type ON public.report_exports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_exports_exported_at ON public.report_exports(exported_at DESC);

-- Enable RLS on report_exports
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Report exports viewable by admin only" ON public.report_exports;
DROP POLICY IF EXISTS "Report exports insertable by admin only" ON public.report_exports;

CREATE POLICY "Report exports viewable by admin only"
  ON public.report_exports FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Report exports insertable by admin only"
  ON public.report_exports FOR INSERT
  WITH CHECK (public.is_admin());

-- Prevent tampering/deletion of report export audit logs
CREATE OR REPLACE FUNCTION public.prevent_report_export_tamper()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Report export audit records are immutable under Rule 5 and RA 10173.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_report_export_tamper ON public.report_exports;
CREATE TRIGGER trg_prevent_report_export_tamper
  BEFORE UPDATE OR DELETE ON public.report_exports
  FOR EACH ROW EXECUTE FUNCTION public.prevent_report_export_tamper();

-- =============================================================================
-- RULE 6: SECURE LOGOUT AND ACCOUNT PROTECTION
-- Server-side token revocation table & suspicious activity incident reporting
-- =============================================================================

-- 1. Revoked Tokens Table (for session ending & token invalidation)
CREATE TABLE IF NOT EXISTS public.revoked_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW(),
  reason VARCHAR(50) DEFAULT 'logout' CHECK (reason IN ('logout', 'all_devices', 'password_change', 'security_incident', 'admin_revocation'))
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash ON public.revoked_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON public.revoked_tokens(expires_at);

-- Auto-purge expired revoked tokens
CREATE OR REPLACE FUNCTION public.purge_expired_revoked_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.revoked_tokens WHERE expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purge_expired_revoked_tokens ON public.revoked_tokens;
CREATE TRIGGER trg_purge_expired_revoked_tokens
  AFTER INSERT ON public.revoked_tokens
  FOR EACH STATEMENT EXECUTE FUNCTION public.purge_expired_revoked_tokens();

-- RLS on revoked_tokens (accessible only by backend service_role)
ALTER TABLE public.revoked_tokens ENABLE ROW LEVEL SECURITY;

-- 2. Security Incidents & Suspicious Activity Reports Table
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  incident_type VARCHAR(50) NOT NULL CHECK (
    incident_type IN (
      'unauthorized_access',
      'suspicious_login',
      'password_sharing',
      'data_tampering',
      'unauthorized_report_sharing',
      'shared_computer_unlogged',
      'other'
    )
  ),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  ip_address VARCHAR(45),
  user_agent TEXT,
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_reported_by ON public.security_incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON public.security_incidents(created_at DESC);

-- Enable RLS on security_incidents
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can report security incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "Users can view own reported incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "Admins can view and manage all security incidents" ON public.security_incidents;

-- Authenticated users can insert their own reports
CREATE POLICY "Users can report security incidents"
  ON public.security_incidents FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (reported_by = auth.uid() OR reported_by IS NULL OR public.is_admin())
  );

-- Users can view their own reported incidents
CREATE POLICY "Users can view own reported incidents"
  ON public.security_incidents FOR SELECT
  USING (
    reported_by = auth.uid()
    OR public.is_admin()
  );

-- Administrators can update status and notes
CREATE POLICY "Admins can manage security incidents"
  ON public.security_incidents FOR UPDATE
  USING (public.is_admin());
