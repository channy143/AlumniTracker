-- Storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profiles', 'profiles', true, 5242880, '{image/jpeg,image/png,image/gif,image/webp}')
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "profiles_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

-- Allow authenticated uploads
CREATE POLICY "profiles_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');

-- Allow authenticated updates
CREATE POLICY "profiles_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');

-- Allow authenticated deletes
CREATE POLICY "profiles_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'profiles' AND auth.role() = 'authenticated');
