-- Migration: Add artist_name column to public.profiles
-- This provides a dedicated display name field for artist accounts,
-- taking priority over full_name in gallery and artwork card rendering.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS artist_name TEXT;

-- Optional: backfill artist_name from full_name for existing ARTIST/CREATOR/SELLER/FREELANCER rows
UPDATE public.profiles
SET artist_name = full_name
WHERE artist_name IS NULL
  AND full_name IS NOT NULL
  AND full_name <> ''
  AND role IN ('ARTIST', 'CREATOR', 'SELLER', 'FREELANCER', 'ADMIN', 'artist', 'creator', 'seller', 'freelancer', 'admin');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
