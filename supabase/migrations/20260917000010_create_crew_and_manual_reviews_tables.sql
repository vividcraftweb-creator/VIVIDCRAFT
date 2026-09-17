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

