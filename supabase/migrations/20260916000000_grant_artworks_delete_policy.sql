-- Migration: Grant delete policy and permissions for artworks
-- Grants delete permissions to authenticated, anon, and service_role, with permissive delete policy

GRANT ALL ON public.artworks TO authenticated;
GRANT ALL ON public.artworks TO anon;
GRANT ALL ON public.artworks TO service_role;

GRANT ALL ON public.artwork_likes TO authenticated;
GRANT ALL ON public.artwork_likes TO anon;

GRANT ALL ON public.artwork_ratings TO authenticated;
GRANT ALL ON public.artwork_ratings TO anon;

-- Ensure RLS is active
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

-- Recreate delete policy
DROP POLICY IF EXISTS "Users can delete own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Allow delete artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artworks are deletable" ON public.artworks;

CREATE POLICY "Allow delete artworks" ON public.artworks
  FOR DELETE
  USING (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
