-- Migration: Ensure permissive access and reload schema for public.verifications
-- Fixes RLS blocking Admin from seeing other users' verification rows

DO $$
BEGIN
  -- 1. Drop old restrictive policies
  DROP POLICY IF EXISTS "Users can read their own verifications" ON "public"."verifications";
  DROP POLICY IF EXISTS "Users can insert their own verifications" ON "public"."verifications";
  DROP POLICY IF EXISTS "Users can update their own verifications" ON "public"."verifications";
  DROP POLICY IF EXISTS "Verifications read policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "Verifications insert policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "Verifications update policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "Verifications all policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "verifications_select_policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "verifications_insert_policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "verifications_update_policy" ON "public"."verifications";
  DROP POLICY IF EXISTS "verifications_delete_policy" ON "public"."verifications";

  -- 2. Create permissive policies for authenticated and anon users (and service role)
  CREATE POLICY "verifications_select_policy" ON "public"."verifications"
    FOR SELECT
    USING (true);

  CREATE POLICY "verifications_insert_policy" ON "public"."verifications"
    FOR INSERT
    WITH CHECK (true);

  CREATE POLICY "verifications_update_policy" ON "public"."verifications"
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

  CREATE POLICY "verifications_delete_policy" ON "public"."verifications"
    FOR DELETE
    USING (true);
END $$;

NOTIFY pgrst, 'reload schema';
