-- Migration: Create verifications table and verifications storage bucket
-- Supports ID Card, Passport, and Driving License verification submissions

-- 1. Create storage bucket for verifications
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS policies for verifications bucket
DO $$
BEGIN
  -- Allow public / authenticated read access on verifications bucket
  DROP POLICY IF EXISTS "Public Verification Storage Access" ON storage.objects;
  CREATE POLICY "Public Verification Storage Access" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'verifications');

  -- Allow authenticated users to upload verification documents
  DROP POLICY IF EXISTS "Authenticated users can upload verification docs" ON storage.objects;
  CREATE POLICY "Authenticated users can upload verification docs" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'verifications'
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
    );

  -- Allow authenticated users to update their verification documents
  DROP POLICY IF EXISTS "Authenticated users can update verification docs" ON storage.objects;
  CREATE POLICY "Authenticated users can update verification docs" ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'verifications'
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    );
END $$;

-- 3. Create verifications table (snake_case)
CREATE TABLE IF NOT EXISTS "public"."verifications" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "id_front_url" TEXT NOT NULL,
    "id_back_url" TEXT,
    "selfie_url" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending' NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast user query
CREATE INDEX IF NOT EXISTS "idx_verifications_user_id" ON "public"."verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_verifications_status" ON "public"."verifications" ("status");

-- 4. Enable RLS on verifications table
ALTER TABLE "public"."verifications" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read their own verifications" ON "public"."verifications";
  CREATE POLICY "Users can read their own verifications" ON "public"."verifications"
    FOR SELECT
    USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Users can insert their own verifications" ON "public"."verifications";
  CREATE POLICY "Users can insert their own verifications" ON "public"."verifications"
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

  DROP POLICY IF EXISTS "Users can update their own verifications" ON "public"."verifications";
  CREATE POLICY "Users can update their own verifications" ON "public"."verifications"
    FOR UPDATE
    USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
END $$;
