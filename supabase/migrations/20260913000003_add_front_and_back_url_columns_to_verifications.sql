-- Migration: Add front_url and back_url columns to verifications table for dual schema compatibility
ALTER TABLE "public"."verifications"
ADD COLUMN IF NOT EXISTS "front_url" TEXT,
ADD COLUMN IF NOT EXISTS "back_url" TEXT;

-- Sync existing columns
UPDATE "public"."verifications"
SET
  front_url = COALESCE(front_url, id_front_url),
  back_url = COALESCE(back_url, id_back_url),
  id_front_url = COALESCE(id_front_url, front_url),
  id_back_url = COALESCE(id_back_url, back_url);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
