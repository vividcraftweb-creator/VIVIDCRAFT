-- Migration: Add missing columns to public.profiles table
-- Fixes: "Could not find the 'bio' column of 'profiles' in the schema cache."

DO $$
BEGIN
  -- Ensure columns exist on "profiles" table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE "public"."profiles" 
      ADD COLUMN IF NOT EXISTS "bio" text,
      ADD COLUMN IF NOT EXISTS "title" text,
      ADD COLUMN IF NOT EXISTS "address" text,
      ADD COLUMN IF NOT EXISTS "skills" text,
      ADD COLUMN IF NOT EXISTS "profile_picture" text,
      ADD COLUMN IF NOT EXISTS "slug" text,
      ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT false;
  END IF;

  -- Ensure columns exist on "Profile" table (if present)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Profile') THEN
    ALTER TABLE "public"."Profile" 
      ADD COLUMN IF NOT EXISTS "bio" text,
      ADD COLUMN IF NOT EXISTS "title" text,
      ADD COLUMN IF NOT EXISTS "address" text,
      ADD COLUMN IF NOT EXISTS "location" text,
      ADD COLUMN IF NOT EXISTS "skills" text,
      ADD COLUMN IF NOT EXISTS "profilePicture" text,
      ADD COLUMN IF NOT EXISTS "isPublished" boolean DEFAULT false;
  END IF;
END $$;
