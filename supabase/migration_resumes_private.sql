-- Private storage bucket for resumes (PDF/DOC/DOCX)
-- Bucket is NOT public: resumes are accessed via time-limited signed URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users may read/sign resume objects via authenticated routes.
DROP POLICY IF EXISTS "resumes_auth_select" ON storage.objects;
CREATE POLICY "resumes_auth_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
  );

-- Only authenticated users may upload resumes.
DROP POLICY IF EXISTS "resumes_auth_upload" ON storage.objects;
CREATE POLICY "resumes_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
  );

-- Owners may update their own resume objects (profile resumes or job-application resumes).
DROP POLICY IF EXISTS "resumes_auth_update_own" ON storage.objects;
CREATE POLICY "resumes_auth_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (
      name LIKE ('resumes/' || auth.uid()::text || '.%')
      OR name LIKE ('job-applications/%/' || auth.uid()::text || '-%')
    )
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (
      name LIKE ('resumes/' || auth.uid()::text || '.%')
      OR name LIKE ('job-applications/%/' || auth.uid()::text || '-%')
    )
  );

-- Owners may delete their own resume objects.
DROP POLICY IF EXISTS "resumes_auth_delete_own" ON storage.objects;
CREATE POLICY "resumes_auth_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (
      name LIKE ('resumes/' || auth.uid()::text || '.%')
      OR name LIKE ('job-applications/%/' || auth.uid()::text || '-%')
    )
  );
