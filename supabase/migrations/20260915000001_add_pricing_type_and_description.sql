-- Migration: Add pricing_type and description to artworks table, ensure bidirectional sync with selling_mode
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'NOT_FOR_SALE',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS selling_mode TEXT DEFAULT 'NOT_FOR_SALE',
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS starting_bid NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS art_code TEXT DEFAULT NULL;

-- Sync existing rows where one column might have data while the other is NULL
UPDATE public.artworks
SET pricing_type = selling_mode
WHERE (pricing_type IS NULL OR pricing_type = 'NOT_FOR_SALE') AND selling_mode IS NOT NULL AND selling_mode != 'NOT_FOR_SALE';

UPDATE public.artworks
SET selling_mode = pricing_type
WHERE (selling_mode IS NULL OR selling_mode = 'NOT_FOR_SALE') AND pricing_type IS NOT NULL AND pricing_type != 'NOT_FOR_SALE';

-- Ensure indexes for fast gallery and auction queries
CREATE INDEX IF NOT EXISTS idx_artworks_pricing_type ON public.artworks (pricing_type);
CREATE INDEX IF NOT EXISTS idx_artworks_selling_mode ON public.artworks (selling_mode);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
