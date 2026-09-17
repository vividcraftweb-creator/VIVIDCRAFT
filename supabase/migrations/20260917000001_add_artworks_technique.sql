-- Migration: Add technique column to artworks table
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS technique TEXT DEFAULT NULL;

-- Performance index for technique
CREATE INDEX IF NOT EXISTS idx_artworks_technique ON public.artworks (technique);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
