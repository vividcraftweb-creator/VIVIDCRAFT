-- Migration: Ensure contact columns and RLS policies on Profile and profiles tables
-- Supports: first_name, last_name, address, whatsapp_number, email, phone, location, businessEmail, etc.

DO $$
BEGIN
  -- Add columns to "Profile" table if they don't already exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Profile') THEN
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "address" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "whatsapp_number" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "email" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "first_name" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "last_name" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "phone" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "location" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "businessEmail" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "businessPhone" text;
    ALTER TABLE "public"."Profile" ADD COLUMN IF NOT EXISTS "businessAddressLine1" text;
  END IF;
END $$;

-- Create "profiles" table if not exists for direct supabase.from('profiles') queries
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" text PRIMARY KEY,
  "first_name" text,
  "last_name" text,
  "address" text,
  "whatsapp_number" text,
  "email" text,
  "updated_at" text DEFAULT now()::text,
  "created_at" text DEFAULT now()::text
);

-- Enable Row Level Security on profiles
ALTER TABLE IF EXISTS "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."Profile" ENABLE ROW LEVEL SECURITY;

-- Drop and recreate comprehensive RLS policies on profiles
DO $$
BEGIN
  DROP POLICY IF EXISTS "profiles_all_policy" ON "public"."profiles";
  CREATE POLICY "profiles_all_policy" ON "public"."profiles"
    FOR ALL
    USING (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'anon'
      OR (SELECT auth.role()) = 'authenticated'
    )
    WITH CHECK (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'anon'
      OR (SELECT auth.role()) = 'authenticated'
    );
END $$;

-- Drop and recreate comprehensive RLS update policy for users on Profile
DO $$
BEGIN
  DROP POLICY IF EXISTS "profile_update_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "Users can update own profile" ON "public"."Profile";

  CREATE POLICY "profile_update_policy" ON "public"."Profile"
    FOR UPDATE
    USING (
      (auth.uid())::text = "userId" 
      OR (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
    )
    WITH CHECK (
      (auth.uid())::text = "userId" 
      OR (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
    );

  DROP POLICY IF EXISTS "profile_insert_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."Profile";

  CREATE POLICY "profile_insert_policy" ON "public"."Profile"
    FOR INSERT
    WITH CHECK (
      (auth.uid())::text = "userId" 
      OR (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
    );

  DROP POLICY IF EXISTS "profile_select_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "Users can select profile" ON "public"."Profile";

  CREATE POLICY "profile_select_policy" ON "public"."Profile"
    FOR SELECT
    USING (
      (auth.uid())::text = "userId" 
      OR (auth.uid())::text = "id"
      OR "isPublished" = true
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
      OR (SELECT auth.role()) = 'anon'
    );
END $$;
