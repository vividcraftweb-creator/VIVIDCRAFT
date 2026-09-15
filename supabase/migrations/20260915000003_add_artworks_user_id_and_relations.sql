-- Migration: Add user_id column to artworks, ensure foreign key relations to profiles, and enforce pricing_type
-- Supports explicit relational query: .select('*, profiles:user_id(full_name, artist_name, avatar_url, role)')

-- 1. Ensure user_id column exists in artworks
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 2. Backfill user_id from artist_id
UPDATE public.artworks
SET user_id = artist_id
WHERE user_id IS NULL AND artist_id IS NOT NULL;

-- 3. Backfill artist_id from user_id if artist_id is null
UPDATE public.artworks
SET artist_id = user_id
WHERE artist_id IS NULL AND user_id IS NOT NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_artworks_user_id ON public.artworks (user_id);
CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON public.artworks (artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_pricing_type ON public.artworks (pricing_type);
CREATE INDEX IF NOT EXISTS idx_artworks_selling_mode ON public.artworks (selling_mode);

-- 5. Add foreign key from artworks(user_id) to profiles(id) if table profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'artworks_user_id_fkey' AND table_name = 'artworks'
    ) THEN
      ALTER TABLE public.artworks
      ADD CONSTRAINT artworks_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'artworks_artist_id_fkey' AND table_name = 'artworks'
    ) THEN
      ALTER TABLE public.artworks
      ADD CONSTRAINT artworks_artist_id_fkey
      FOREIGN KEY (artist_id) REFERENCES public.profiles(id)
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 6. Ensure pricing_type is properly synced with selling_mode
UPDATE public.artworks
SET pricing_type = COALESCE(selling_mode, 'NOT_FOR_SALE')
WHERE pricing_type IS NULL;

UPDATE public.artworks
SET selling_mode = pricing_type
WHERE selling_mode IS NULL;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
