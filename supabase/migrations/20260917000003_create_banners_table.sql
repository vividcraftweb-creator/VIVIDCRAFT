-- Create banners / promotional offers table
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge TEXT NOT NULL DEFAULT 'Special Offer',
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Get Offer',
  link_url TEXT NOT NULL DEFAULT '/gallery',
  image_url TEXT NOT NULL,
  accent TEXT DEFAULT 'from-amber-500/20 to-orange-500/10',
  offer_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Allow public read of all active banners
CREATE POLICY "Allow public select on active banners"
  ON public.banners FOR SELECT
  USING (true);

-- Allow full access for admin and service role
CREATE POLICY "Allow admin full access on banners"
  ON public.banners FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed initial promotional banners with unique offer codes
INSERT INTO public.banners (badge, title, subtitle, cta_text, link_url, image_url, accent, offer_code, is_active, display_order)
VALUES
  (
    'Curated Masterpieces',
    'Explore Original Fine Art & Portfolios',
    'Discover oil paintings, digital art, sculptures, and mixed media ranked by verified collectors and creators.',
    'Get Offer',
    '/gallery',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80',
    'from-amber-500/20 to-orange-500/10',
    'OFFER-7842',
    true,
    1
  ),
  (
    'Verified Creators',
    'Commission Elite Artists for Custom Works',
    'Connect directly with master painters, illustrators, and visual designers for custom portraits and bespoke commissions.',
    'Get Offer',
    '/artists',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1920&q=80',
    'from-purple-500/20 to-pink-500/10',
    'OFFER-5190',
    true,
    2
  ),
  (
    'Live Art Auctions',
    'Exclusive Art Auctions & Open Bidding',
    'Place competitive bids on rare, one-of-a-kind original creations or enter your masterpiece into live auctions.',
    'Get Offer',
    '/bidding',
    'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1920&q=80',
    'from-blue-500/20 to-cyan-500/10',
    'OFFER-3421',
    true,
    3
  ),
  (
    'Join Vivid Art',
    'Showcase Your Art & Sell to Global Collectors',
    'Join Sri Lanka’s premier digital art marketplace. Create your artist profile, upload artworks, and get discovered.',
    'Get Offer',
    '/auth/signup',
    'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1920&q=80',
    'from-emerald-500/20 to-teal-500/10',
    'OFFER-9018',
    true,
    4
  )
ON CONFLICT (offer_code) DO NOTHING;
