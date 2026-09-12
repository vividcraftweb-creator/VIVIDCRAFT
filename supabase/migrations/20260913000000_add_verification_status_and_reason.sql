-- Migration: Ensure rejection_reason on verifications and verification_status, is_verified on profiles
-- Supports realtime status sync between Admin Approve/Reject and Artist Dashboard

ALTER TABLE "public"."verifications"
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "verification_status" TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT false;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
