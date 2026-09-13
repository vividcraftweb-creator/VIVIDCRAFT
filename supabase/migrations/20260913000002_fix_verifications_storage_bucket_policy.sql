-- Migration: Ensure verifications storage bucket exists and configure permissive RLS policies
-- Supports reliable uploads for ID Front, ID Back, and Selfie documents

-- 1. Ensure 'verifications' bucket exists in storage.buckets with public read access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verifications',
  'verifications',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];

-- 2. Storage RLS policies for verifications bucket
DO $$
BEGIN
  -- Read policy: allow public and authenticated access to verifications documents
  DROP POLICY IF EXISTS "Public Verification Storage Access" ON storage.objects;
  DROP POLICY IF EXISTS "Allow select on verifications bucket" ON storage.objects;
  CREATE POLICY "Allow select on verifications bucket" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'verifications');

  -- Insert policy: allow authenticated, anon, and service_role uploads to verifications bucket
  DROP POLICY IF EXISTS "Authenticated users can upload verification docs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow upload to verifications bucket" ON storage.objects;
  CREATE POLICY "Allow upload to verifications bucket" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'verifications');

  -- Update policy: allow authenticated and service_role updates
  DROP POLICY IF EXISTS "Authenticated users can update verification docs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow update to verifications bucket" ON storage.objects;
  CREATE POLICY "Allow update to verifications bucket" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'verifications');

  -- Delete policy: allow authenticated and service_role deletes
  DROP POLICY IF EXISTS "Allow delete to verifications bucket" ON storage.objects;
  CREATE POLICY "Allow delete to verifications bucket" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'verifications');
END $$;
