-- Migration: Add selling_mode, price, starting_bid, and art_code to artworks table
-- Supports clean separation between Fixed Price Gallery and Dedicated Bidding Page

ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS selling_mode TEXT DEFAULT 'NOT_FOR_SALE',
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS starting_bid NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS art_code TEXT DEFAULT NULL;

-- Create index on selling_mode for fast gallery / bidding page filtering
CREATE INDEX IF NOT EXISTS idx_artworks_selling_mode ON public.artworks (selling_mode);

-- Create sequence for art_code generation if needed
CREATE SEQUENCE IF NOT EXISTS artwork_code_seq START WITH 101;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
