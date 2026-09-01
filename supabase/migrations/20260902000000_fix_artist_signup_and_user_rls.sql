-- Migration: Fix Artist Signup, User/Profile RLS Policies & Auth Trigger
-- Ensures role is properly assigned to 'FREELANCER' in User table and 'artist' in profiles/user_metadata

-- 1. Ensure profiles table exists with role column
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" text PRIMARY KEY,
  "first_name" text,
  "last_name" text,
  "role" text DEFAULT 'artist',
  "address" text,
  "location" text,
  "whatsapp_number" text,
  "phone" text,
  "email" text,
  "title" text,
  "bio" text,
  "skills" text,
  "avatar_url" text,
  "is_published" boolean DEFAULT true,
  "updated_at" text DEFAULT now()::text,
  "created_at" text DEFAULT now()::text
);

-- Ensure role column exists in public.profiles
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'artist';
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT true;

-- 2. Configure RLS Policies on public."User"
ALTER TABLE IF EXISTS "public"."User" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop existing User table policies to avoid conflicts
  DROP POLICY IF EXISTS "Users can view own record" ON "public"."User";
  DROP POLICY IF EXISTS "Users can update own lastLoginAt" ON "public"."User";
  DROP POLICY IF EXISTS "user_select_policy" ON "public"."User";
  DROP POLICY IF EXISTS "user_insert_policy" ON "public"."User";
  DROP POLICY IF EXISTS "user_update_policy" ON "public"."User";
  DROP POLICY IF EXISTS "user_all_service_role" ON "public"."User";

  -- Service role full access
  CREATE POLICY "user_all_service_role" ON "public"."User"
    FOR ALL
    USING (
      (SELECT auth.role()) = 'service_role'
      OR (auth.uid())::text = "id"
    )
    WITH CHECK (
      (SELECT auth.role()) = 'service_role'
      OR (auth.uid())::text = "id"
    );

  -- Users can view their own record or if admin
  CREATE POLICY "user_select_policy" ON "public"."User"
    FOR SELECT
    USING (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
      OR (SELECT auth.role()) = 'anon'
    );

  -- Users can insert their own record upon registration
  CREATE POLICY "user_insert_policy" ON "public"."User"
    FOR INSERT
    WITH CHECK (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
      OR (SELECT auth.role()) = 'anon'
    );

  -- Users can update their own record
  CREATE POLICY "user_update_policy" ON "public"."User"
    FOR UPDATE
    USING (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
    )
    WITH CHECK (
      (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
    );
END $$;

-- 3. Configure RLS Policies on public.profiles
ALTER TABLE IF EXISTS "public"."profiles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "profiles_all_policy" ON "public"."profiles";
  DROP POLICY IF EXISTS "profiles_select_policy" ON "public"."profiles";
  DROP POLICY IF EXISTS "profiles_insert_policy" ON "public"."profiles";
  DROP POLICY IF EXISTS "profiles_update_policy" ON "public"."profiles";

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

-- 4. Configure RLS Policies on public."Profile"
ALTER TABLE IF EXISTS "public"."Profile" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "profile_update_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "profile_insert_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "profile_select_policy" ON "public"."Profile";
  DROP POLICY IF EXISTS "Users can update own profile" ON "public"."Profile";
  DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."Profile";
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

  CREATE POLICY "profile_insert_policy" ON "public"."Profile"
    FOR INSERT
    WITH CHECK (
      (auth.uid())::text = "userId" 
      OR (auth.uid())::text = "id"
      OR (SELECT auth.role()) = 'service_role'
      OR (SELECT auth.role()) = 'authenticated'
      OR (SELECT auth.role()) = 'anon'
    );

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
END $$;

-- 5. Trigger function to handle user creation directly from auth.users (if enabled in Supabase)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_raw_role TEXT;
  assigned_role "public"."Role";
  meta_role TEXT;
  first_name_val TEXT;
  last_name_val TEXT;
  full_name_val TEXT;
  company_val TEXT;
  country_val TEXT;
  slug_val TEXT;
BEGIN
  -- Extract metadata safely
  user_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'user_type', 'artist');
  first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'firstName', '');
  last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'lastName', '');
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '');
  company_val := COALESCE(NEW.raw_user_meta_data->>'company', NEW.raw_user_meta_data->>'companyName', '');
  country_val := COALESCE(NEW.raw_user_meta_data->>'country', NEW.raw_user_meta_data->>'location', 'Sri Lanka');

  IF first_name_val = '' AND full_name_val <> '' THEN
    first_name_val := split_part(full_name_val, ' ', 1);
    last_name_val := substr(full_name_val, length(first_name_val) + 2);
  END IF;

  -- Normalize role: 'artist', 'freelancer', 'creator' -> 'FREELANCER'
  IF lower(trim(user_raw_role)) IN ('artist', 'freelancer', 'creator', 'seller') THEN
    assigned_role := 'FREELANCER'::"public"."Role";
    meta_role := 'artist';
  ELSIF lower(trim(user_raw_role)) = 'admin' THEN
    assigned_role := 'ADMIN'::"public"."Role";
    meta_role := 'admin';
  ELSE
    assigned_role := 'CLIENT'::"public"."Role";
    meta_role := 'client';
  END IF;

  -- 1. Insert into public."User"
  INSERT INTO "public"."User" (
    "id",
    "email",
    "role",
    "tokens",
    "subscriptionPlan",
    "isVerified",
    "profileCompleted",
    "createdAt",
    "updatedAt"
  ) VALUES (
    NEW.id::text,
    COALESCE(NEW.email, ''),
    assigned_role,
    CASE WHEN assigned_role = 'FREELANCER' THEN 250 ELSE 0 END,
    CASE WHEN assigned_role = 'CLIENT' THEN 'CLIENT_BUSINESS' ELSE 'FREELANCER_PRO' END,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    (first_name_val <> '' AND last_name_val <> ''),
    NOW(),
    NOW()
  )
  ON CONFLICT ("id") DO UPDATE SET
    "role" = EXCLUDED."role",
    "updatedAt" = NOW();

  -- 2. Insert into public.profiles
  INSERT INTO "public"."profiles" (
    "id",
    "first_name",
    "last_name",
    "role",
    "email",
    "location",
    "address",
    "updated_at",
    "created_at"
  ) VALUES (
    NEW.id::text,
    first_name_val,
    last_name_val,
    meta_role,
    COALESCE(NEW.email, ''),
    country_val,
    country_val,
    NOW()::text,
    NOW()::text
  )
  ON CONFLICT ("id") DO UPDATE SET
    "role" = EXCLUDED."role",
    "first_name" = COALESCE(NULLIF(EXCLUDED."first_name", ''), "public"."profiles"."first_name"),
    "last_name" = COALESCE(NULLIF(EXCLUDED."last_name", ''), "public"."profiles"."last_name"),
    "updated_at" = NOW()::text;

  -- 3. Insert into public."Profile"
  slug_val := lower(regexp_replace(COALESCE(NULLIF(first_name_val || '-' || last_name_val, '-'), 'user-' || substr(NEW.id::text, 1, 8)), '[^a-zA-Z0-9]+', '-', 'g'));

  INSERT INTO "public"."Profile" (
    "id",
    "userId",
    "slug",
    "firstName",
    "lastName",
    "companyName",
    "country",
    "location",
    "createdAt",
    "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    slug_val,
    NULLIF(first_name_val, ''),
    NULLIF(last_name_val, ''),
    NULLIF(company_val, ''),
    country_val,
    country_val,
    NOW(),
    NOW()
  )
  ON CONFLICT ("userId") DO UPDATE SET
    "firstName" = COALESCE(NULLIF(EXCLUDED."firstName", ''), "public"."Profile"."firstName"),
    "lastName" = COALESCE(NULLIF(EXCLUDED."lastName", ''), "public"."Profile"."lastName"),
    "updatedAt" = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort auth user creation on trigger exception
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users if auth schema is accessible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create trigger on auth.users: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
