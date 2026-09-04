-- Job Applications enhancements
-- Adds columns to job_applications to support resume/cover letter per application
-- and denormalized applicant info for the admin review flow.

ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(300);
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(300);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON public.job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

-- Allow resume files (PDF/DOC/DOCX) in the 'profiles' storage bucket and raise the size limit.
-- Required because the bucket was created image-only, but both the profile resume upload
-- and job applications store resumes there.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    file_size_limit = 10485760
WHERE id = 'profiles';
