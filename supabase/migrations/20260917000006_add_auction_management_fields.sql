-- Migration: Add auction fields to artworks table and support live auction management
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_bid NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'LIVE';

-- Index for live bidding queries
CREATE INDEX IF NOT EXISTS idx_artworks_bidding_status ON public.artworks (selling_mode, status);
CREATE INDEX IF NOT EXISTS idx_artworks_end_time ON public.artworks (end_time);

-- Optional auctions table for dedicated auction relational storage
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  starting_bid NUMERIC NOT NULL DEFAULT 0,
  current_bid NUMERIC DEFAULT 0,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'LIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON public.auctions (status);

-- Permissions
GRANT ALL ON public.artworks TO service_role;
GRANT ALL ON public.artworks TO authenticated;
GRANT ALL ON public.artworks TO anon;

GRANT ALL ON public.auctions TO service_role;
GRANT ALL ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO anon;
