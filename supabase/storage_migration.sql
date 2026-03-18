-- ============================================================
-- Supabase Storage — images bucket
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Create public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,  -- 5 MB max per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public can read all images
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Only service role (admin) can upload/update/delete
CREATE POLICY "Admin insert images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Admin update images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'images');

CREATE POLICY "Admin delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images');
