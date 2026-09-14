-- Migration: Add whatsapp_verification_status to profiles table
-- Supports WhatsApp manual verification flow for Artist accounts
-- Possible values: NULL (default), 'pending_whatsapp', 'verified'

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "whatsapp_verification_status" TEXT DEFAULT NULL;

-- Index for fast admin querying of pending verifications
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp_verification_status
  ON "public"."profiles" ("whatsapp_verification_status")
  WHERE "whatsapp_verification_status" IS NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
