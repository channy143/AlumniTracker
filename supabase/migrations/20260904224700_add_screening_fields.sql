ALTER TABLE job_applications
ADD COLUMN IF NOT EXISTS match_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS matched_skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS missing_skills TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS screening_notes TEXT,
ADD COLUMN IF NOT EXISTS is_screened BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_match_percentage ON job_applications(match_percentage);

COMMENT ON COLUMN job_applications.match_percentage IS 'Percentage of required skills matched (0-100)';
COMMENT ON COLUMN job_applications.matched_skills IS 'Array of skill names that the applicant has';
COMMENT ON COLUMN job_applications.missing_skills IS 'Array of skill names the applicant is missing';
COMMENT ON COLUMN job_applications.is_screened IS 'Flag indicating if admin has screened this application';
