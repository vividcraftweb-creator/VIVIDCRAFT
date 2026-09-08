-- Migration: Add optional foreign key relationship between verifications and profiles
-- and reload PostgREST schema cache to ensure joined queries work smoothly.

DO $$
BEGIN
  -- Add foreign key constraint if it doesn't already exist and profiles has the corresponding IDs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'verifications_profiles_user_id_fkey'
    AND table_name = 'verifications'
  ) THEN
    BEGIN
      ALTER TABLE "public"."verifications"
        ADD CONSTRAINT "verifications_profiles_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id")
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      -- In case table types or existing data prevent constraint, don't fail migration
      RAISE NOTICE 'Notice: Could not add verifications_profiles_user_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
