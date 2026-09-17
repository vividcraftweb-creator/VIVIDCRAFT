-- Migration: Master cascade delete constraints for user deletion
-- Ensures that deleting a user or profile cascades cleanly without foreign key blocks.

-- 1. Profiles to auth.users cascade constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    BEGIN
      -- Drop old foreign key if existing
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter profiles_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- 2. Artworks to profiles cascade constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artworks') THEN
    BEGIN
      ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_user_id_fkey;
      ALTER TABLE public.artworks
        ADD CONSTRAINT artworks_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter artworks_user_id_fkey: %', SQLERRM;
    END;

    BEGIN
      ALTER TABLE public.artworks DROP CONSTRAINT IF EXISTS artworks_artist_id_fkey;
      ALTER TABLE public.artworks
        ADD CONSTRAINT artworks_artist_id_fkey
        FOREIGN KEY (artist_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter artworks_artist_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- 3. Artwork likes & ratings cascade constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artwork_likes') THEN
    BEGIN
      ALTER TABLE public.artwork_likes DROP CONSTRAINT IF EXISTS artwork_likes_artwork_id_fkey;
      ALTER TABLE public.artwork_likes
        ADD CONSTRAINT artwork_likes_artwork_id_fkey
        FOREIGN KEY (artwork_id) REFERENCES public.artworks(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter artwork_likes_artwork_id_fkey: %', SQLERRM;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artwork_ratings') THEN
    BEGIN
      ALTER TABLE public.artwork_ratings DROP CONSTRAINT IF EXISTS artwork_ratings_artwork_id_fkey;
      ALTER TABLE public.artwork_ratings
        ADD CONSTRAINT artwork_ratings_artwork_id_fkey
        FOREIGN KEY (artwork_id) REFERENCES public.artworks(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter artwork_ratings_artwork_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- 4. Verifications cascade constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verifications') THEN
    BEGIN
      ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_profiles_user_id_fkey;
      ALTER TABLE public.verifications
        ADD CONSTRAINT verifications_profiles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Notice: Could not alter verifications_profiles_user_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
