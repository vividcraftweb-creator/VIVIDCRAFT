-- Migration: Add Fiverr-style gig fields to artworks table
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS badge_title TEXT DEFAULT 'Top Rated',
ADD COLUMN IF NOT EXISTS gig_title TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS base_rating NUMERIC DEFAULT 4.9,
ADD COLUMN IF NOT EXISTS review_count_text TEXT DEFAULT '(1k+)';

-- Index for badge searches if needed
CREATE INDEX IF NOT EXISTS idx_artworks_badge_title ON public.artworks(badge_title);
