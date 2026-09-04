-- Audit Log Triggers Migration
-- Attach log_audit() triggers to key tables

-- First, ensure the audit_logs table exists (should exist from schema.sql)
-- CREATE TABLE IF NOT EXISTS public.audit_logs (...);

-- Create/Replace the log_audit() trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, details)
  VALUES (
    COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NULL),
    TG_ARGV[0],
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS trigger_audit_users ON public.users;
CREATE TRIGGER trigger_audit_users
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION log_audit('user');

-- Trigger for profiles table
DROP TRIGGER IF EXISTS trigger_audit_profiles ON public.profiles;
CREATE TRIGGER trigger_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION log_audit('profile');

-- Trigger for employment table
DROP TRIGGER IF EXISTS trigger_audit_employment ON public.employment;
CREATE TRIGGER trigger_audit_employment
AFTER INSERT OR UPDATE OR DELETE ON public.employment
FOR EACH ROW EXECUTE FUNCTION log_audit('employment');

-- Trigger for education table
DROP TRIGGER IF EXISTS trigger_audit_education ON public.education;
CREATE TRIGGER trigger_audit_education
AFTER INSERT OR UPDATE OR DELETE ON public.education
FOR EACH ROW EXECUTE FUNCTION log_audit('education');

-- Trigger for skills table
DROP TRIGGER IF EXISTS trigger_audit_skills ON public.skills;
CREATE TRIGGER trigger_audit_skills
AFTER INSERT OR UPDATE OR DELETE ON public.skills
FOR EACH ROW EXECUTE FUNCTION log_audit('skill');

-- Trigger for certifications table
DROP TRIGGER IF EXISTS trigger_audit_certifications ON public.certifications;
CREATE TRIGGER trigger_audit_certifications
AFTER INSERT OR UPDATE OR DELETE ON public.certifications
FOR EACH ROW EXECUTE FUNCTION log_audit('certification');

-- Trigger for community_groups table
DROP TRIGGER IF EXISTS trigger_audit_community_groups ON public.community_groups;
CREATE TRIGGER trigger_audit_community_groups
AFTER INSERT OR UPDATE OR DELETE ON public.community_groups
FOR EACH ROW EXECUTE FUNCTION log_audit('community_group');

-- Trigger for forum_posts table
DROP TRIGGER IF EXISTS trigger_audit_forum_posts ON public.forum_posts;
CREATE TRIGGER trigger_audit_forum_posts
AFTER INSERT OR UPDATE OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION log_audit('forum_post');

-- Trigger for job_postings table
DROP TRIGGER IF EXISTS trigger_audit_job_postings ON public.job_postings;
CREATE TRIGGER trigger_audit_job_postings
AFTER INSERT OR UPDATE OR DELETE ON public.job_postings
FOR EACH ROW EXECUTE FUNCTION log_audit('job_posting');

-- Trigger for surveys table
DROP TRIGGER IF EXISTS trigger_audit_surveys ON public.surveys;
CREATE TRIGGER trigger_audit_surveys
AFTER INSERT OR UPDATE OR DELETE ON public.surveys
FOR EACH ROW EXECUTE FUNCTION log_audit('survey');

-- Trigger for survey_responses table
DROP TRIGGER IF EXISTS trigger_audit_survey_responses ON public.survey_responses;
CREATE TRIGGER trigger_audit_survey_responses
AFTER INSERT OR UPDATE OR DELETE ON public.survey_responses
FOR EACH ROW EXECUTE FUNCTION log_audit('survey_response');

-- Trigger for announcements table
DROP TRIGGER IF EXISTS trigger_audit_announcements ON public.announcements;
CREATE TRIGGER trigger_audit_announcements
AFTER INSERT OR UPDATE OR DELETE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION log_audit('announcement');

-- Trigger for companies table
DROP TRIGGER IF EXISTS trigger_audit_companies ON public.companies;
CREATE TRIGGER trigger_audit_companies
AFTER INSERT OR UPDATE OR DELETE ON public.companies
FOR EACH ROW EXECUTE FUNCTION log_audit('company');

-- Trigger for mentorships table
DROP TRIGGER IF EXISTS trigger_audit_mentorships ON public.mentorships;
CREATE TRIGGER trigger_audit_mentorships
AFTER INSERT OR UPDATE OR DELETE ON public.mentorships
FOR EACH ROW EXECUTE FUNCTION log_audit('mentorship');

-- Trigger for feed_posts table
DROP TRIGGER IF EXISTS trigger_audit_feed_posts ON public.feed_posts;
CREATE TRIGGER trigger_audit_feed_posts
AFTER INSERT OR UPDATE OR DELETE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION log_audit('feed_post');