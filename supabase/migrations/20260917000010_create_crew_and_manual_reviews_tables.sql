-- Migration: Create crew_members and manual_reviews tables
CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  short_bio TEXT NOT NULL,
  full_story TEXT NOT NULL DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Verified Collector',
  avatar_url TEXT DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_reviews ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if any
DROP POLICY IF EXISTS "crew_members_open_access" ON public.crew_members;
DROP POLICY IF EXISTS "manual_reviews_open_access" ON public.manual_reviews;

-- Create Open RLS Policies
CREATE POLICY "crew_members_open_access"
  ON public.crew_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "manual_reviews_open_access"
  ON public.manual_reviews
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissions
GRANT ALL ON public.crew_members TO anon, authenticated, service_role;
GRANT ALL ON public.manual_reviews TO anon, authenticated, service_role;

-- Seed initial crew members
INSERT INTO public.crew_members (name, position, avatar_url, short_bio, full_story, is_featured, display_order)
VALUES
  (
    'Elena Rostova',
    'Lead Fine Art Curator',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    'Curating rare masterpieces with 12+ years of international gallery and exhibition experience.',
    'Elena holds a Master in Art History from the Courtauld Institute of Art and spent over a decade curating avant-garde and classical exhibitions across Paris, London, and Tokyo. At Vivid Art, she leads creator vetting, portfolio authenticity verification, and international exhibition curation, connecting collectors with museum-grade physical and digital works.',
    true,
    1
  ),
  (
    'Marcus Vance',
    'Master Painter & Creative Director',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    'Pioneering contemporary oil portraits and mixed-media storytelling across world stages.',
    'With solo exhibitions at the Venice Biennale and prestigious New York galleries, Marcus bridges classical oil techniques with modern expressionism. He oversees creative quality, artist mentorship programs, and bespoke private commission workflows at Vivid Art.',
    false,
    2
  ),
  (
    'Amara Chen',
    'Digital Art & 3D Sculpting Lead',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    'Crafting next-gen immersive 3D sculptures, concept art, and high-fidelity generative visual worlds.',
    'Amara worked for 8 years as senior visual designer in premier animation and visual effects studios. Her award-winning digital sculptures explore the harmony between biological forms and futuristic architectures. At Vivid Art, she helps digital creators mint, showcase, and license high-value 3D creations.',
    false,
    3
  ),
  (
    'David Sterling',
    'Head of Art Auctions & Valuations',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    'Guiding high-stakes art bidding, fair market valuations, and private collector acquisitions.',
    'Former senior cataloguer and auctioneer at top European auction houses, David brings deep domain mastery in provenance research, secondary market pricing, and live auction mechanics. He ensures transparency, liquidity, and competitive bidder satisfaction on Vivid Art.',
    false,
    4
  ),
  (
    'Sophia Al-Mansoor',
    'Artist Community Advocate',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    'Empowering independent creators worldwide with resources, visibility, and direct patron links.',
    'Sophia is a community builder and visual artist whose grassroots campaigns have supported hundreds of emerging creators across South Asia and the Middle East. She manages our artist community initiatives, fair-pay advisory, and creator residency opportunities.',
    false,
    5
  )
ON CONFLICT DO NOTHING;

-- Seed initial manual reviews
INSERT INTO public.manual_reviews (author_name, author_role, avatar_url, rating, content, is_active, display_order)
VALUES
  (
    'Julian Thorne',
    'Private Art Collector, London',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    5,
    'Commissioning a bespoke canvas through Vivid Art was an extraordinary experience. The curated artists are genuine masters, and the direct communication made the creative journey unforgettable.',
    true,
    1
  ),
  (
    'Camilla DuPont',
    'Interior Architect & Designer',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    5,
    'We sourced six signature mixed-media pieces for our luxury penthouse project in Geneva. The art valuation and authentication handled by the Vivid Art team was impeccably professional.',
    true,
    2
  ),
  (
    'Alexander Ross',
    'Contemporary Art Gallerist',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    5,
    'The caliber of talent on this platform is unmatched. From live auctions to custom portraits, Vivid Art has created the most seamless bridge between collectors and world-class visionaries.',
    true,
    3
  ),
  (
    'Dr. Maya Senaratne',
    'Museum Benefactor & Patron',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    5,
    'The transparency, verified artist profiles, and personalized guidance from Elena and the curation crew gave us absolute confidence in expanding our permanent foundation collection.',
    true,
    4
  )
ON CONFLICT DO NOTHING;
