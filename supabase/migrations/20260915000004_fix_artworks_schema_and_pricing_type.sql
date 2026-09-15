-- Migration: Add pricing_type, price, starting_bid, description, category, medium, tags to artworks
-- and update existing uploaded test artworks with realistic pricing_type values

-- 1. Ensure all required columns exist on artworks table
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'NOT_FOR_SALE',
ADD COLUMN IF NOT EXISTS selling_mode TEXT DEFAULT 'NOT_FOR_SALE',
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS starting_bid NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS medium TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS art_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL;

-- 2. Backfill user_id and artist_id
UPDATE public.artworks
SET user_id = artist_id
WHERE user_id IS NULL AND artist_id IS NOT NULL;

UPDATE public.artworks
SET artist_id = user_id
WHERE artist_id IS NULL AND user_id IS NOT NULL;

-- 3. Update existing uploaded test artworks with realistic pricing_type, prices, categories, and descriptions
-- Test Artwork 1: Fixed Price ("sale")
UPDATE public.artworks
SET 
  pricing_type = 'FIXED_PRICE',
  selling_mode = 'FIXED_PRICE',
  price = 85000,
  starting_bid = NULL,
  category = 'Painting',
  medium = 'Oil on Canvas',
  description = 'An evocative original oil on canvas artwork showcasing vibrant contrasts, rich palette knife textures, and contemporary impressionism.'
WHERE title ILIKE '%sale%' 
   OR id = '207b3975-7710-4adc-9770-8eb8e341042a' 
   OR id = 'e79b8fce-9c09-43fb-b721-e3a882f9f11e';

-- Test Artwork 2: Open Bidding ("bid")
UPDATE public.artworks
SET 
  pricing_type = 'BIDDING',
  selling_mode = 'BIDDING',
  price = NULL,
  starting_bid = 45000,
  category = 'Digital Art',
  medium = 'Digital Illustration',
  description = 'Exclusive auction piece featuring celestial aesthetics and dramatic ambient lighting, available for collector bidding.'
WHERE title ILIKE '%bid%' 
   OR id = '44b950d2-5346-44b1-a510-9d8b5a885aa2';

-- Test Artwork 3: Not For Sale ("not for sale")
UPDATE public.artworks
SET 
  pricing_type = 'NOT_FOR_SALE',
  selling_mode = 'NOT_FOR_SALE',
  price = NULL,
  starting_bid = NULL,
  category = 'Sculpture',
  medium = 'Mixed Media',
  description = 'A curated master study created exclusively for exhibition display and portfolio representation.'
WHERE title ILIKE '%not for sale%' 
   OR id = 'c8102179-c4e2-4b05-aa3c-60a523a16616';

-- 4. Sync pricing_type and selling_mode for all remaining rows
UPDATE public.artworks
SET pricing_type = COALESCE(selling_mode, 'NOT_FOR_SALE')
WHERE pricing_type IS NULL;

UPDATE public.artworks
SET selling_mode = pricing_type
WHERE selling_mode IS NULL;

-- 5. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_artworks_pricing_type ON public.artworks (pricing_type);
CREATE INDEX IF NOT EXISTS idx_artworks_selling_mode ON public.artworks (selling_mode);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON public.artworks (category);
CREATE INDEX IF NOT EXISTS idx_artworks_price ON public.artworks (price);
CREATE INDEX IF NOT EXISTS idx_artworks_starting_bid ON public.artworks (starting_bid);

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
