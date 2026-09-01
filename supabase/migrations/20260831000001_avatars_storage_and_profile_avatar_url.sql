-- Migration: Create and configure public storage buckets for avatars & uploads
-- And ensure avatar_url column exists on profiles

-- 1. Create buckets and make them public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('public-uploads', 'public-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Ensure columns exist on profiles table
ALTER TABLE "public"."profiles" 
  ADD COLUMN IF NOT EXISTS "avatar_url" text,
  ADD COLUMN IF NOT EXISTS "profile_picture" text;

-- 3. Storage RLS policies for avatars and public-uploads
DO $$
BEGIN
  -- Allow public read access on avatars and public-uploads
  DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
  CREATE POLICY "Public Avatar Access" ON storage.objects
    FOR SELECT
    USING (bucket_id IN ('avatars', 'public-uploads'));

  -- Allow authenticated users to upload their avatars
  DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
  CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id IN ('avatars', 'public-uploads')
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
    );

  -- Allow authenticated users to update their avatars
  DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
  CREATE POLICY "Authenticated users can update avatars" ON storage.objects
    FOR UPDATE
    USING (
      bucket_id IN ('avatars', 'public-uploads')
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );
END $$;
