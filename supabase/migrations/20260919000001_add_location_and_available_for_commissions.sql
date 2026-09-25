-- Migration: Add location and available_for_commissions to public.profiles
-- Ensures seamless storage and filtering for artist locations and commission status

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS available_for_commissions BOOLEAN DEFAULT true;

-- Backfill location from address if address exists and location is null
UPDATE public.profiles
SET location = address
WHERE location IS NULL AND address IS NOT NULL;

-- Backfill address from location if location exists and address is null
UPDATE public.profiles
SET address = location
WHERE address IS NULL AND location IS NOT NULL;

-- Index for fast location filtering
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles (location);

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
