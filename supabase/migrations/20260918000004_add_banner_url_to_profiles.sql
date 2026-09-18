-- Migration: Add banner_url to profiles table
-- Stores artist and user cover banner images

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN public.profiles.banner_url IS 'Cover banner image URL for artist and user profiles';
