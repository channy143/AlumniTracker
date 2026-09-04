-- Private storage bucket for resumes (PDF/DOC/DOCX)
-- Bucket is NOT public: resumes are accessed via time-limited signed URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users may upload resumes.
CREATE POLICY "resumes_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.role() = 'authenticated');

-- Owners may update their own resume objects (path prefix is /job-applications/<jobId>/<userId>).
CREATE POLICY "resumes_auth_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Owners may delete their own resume objects.
CREATE POLICY "resumes_auth_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
