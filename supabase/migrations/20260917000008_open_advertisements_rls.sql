-- Migration: Open RLS policy for advertisements table and ensure all columns exist
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge TEXT NOT NULL DEFAULT 'Special Offer',
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT 'Get Offer',
  target_route TEXT NOT NULL DEFAULT '/gallery',
  link_url TEXT NOT NULL DEFAULT '/gallery',
  image_url TEXT NOT NULL,
  accent TEXT DEFAULT 'from-amber-500/20 to-orange-500/10',
  offer_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist on advertisements table
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS target_route TEXT DEFAULT '/gallery';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '/gallery';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT '';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT 'Special Offer';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Get Offer';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS accent TEXT DEFAULT 'from-amber-500/20 to-orange-500/10';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Sync target_route and link_url
UPDATE public.advertisements
SET target_route = COALESCE(target_route, link_url, '/gallery')
WHERE target_route IS NULL;

UPDATE public.advertisements
SET link_url = COALESCE(link_url, target_route, '/gallery')
WHERE link_url IS NULL;

-- Enable Row Level Security
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive policies
DROP POLICY IF EXISTS "Allow public select on advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Allow admin full access on advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "Allow public full access on advertisements" ON public.advertisements;
DROP POLICY IF EXISTS "advertisements_open_access" ON public.advertisements;

-- Create Open RLS Policy allowing select, insert, update, delete
CREATE POLICY "advertisements_open_access"
  ON public.advertisements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions to anon, authenticated, and service_role
GRANT ALL ON public.advertisements TO anon, authenticated, service_role;
