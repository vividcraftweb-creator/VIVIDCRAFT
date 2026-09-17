-- Migration: Configure banners storage bucket and advertisements table sync

-- 1. Create storage bucket 'banners' and set public = true
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage policies for banners bucket
DO $$
BEGIN
  -- Allow public read access on banners bucket
  DROP POLICY IF EXISTS "Public Banner Access" ON storage.objects;
  CREATE POLICY "Public Banner Access" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'banners');

  -- Allow uploads to banners bucket
  DROP POLICY IF EXISTS "Allow banner uploads" ON storage.objects;
  CREATE POLICY "Allow banner uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'banners'
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
    );

  -- Allow update and delete on banners bucket
  DROP POLICY IF EXISTS "Allow banner management" ON storage.objects;
  CREATE POLICY "Allow banner management" ON storage.objects
    FOR ALL
    USING (
      bucket_id = 'banners'
      AND (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
    );
END $$;

-- 3. Ensure advertisements table exists and matches banners schema
CREATE TABLE IF NOT EXISTS public.advertisements (
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

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' AND policyname = 'Allow public select on advertisements'
  ) THEN
    CREATE POLICY "Allow public select on advertisements"
      ON public.advertisements FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisements' AND policyname = 'Allow admin full access on advertisements'
  ) THEN
    CREATE POLICY "Allow admin full access on advertisements"
      ON public.advertisements FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
