-- Migration: Add social media columns to crew_members table
ALTER TABLE public.crew_members
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS twitter_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS x_url TEXT DEFAULT '';
