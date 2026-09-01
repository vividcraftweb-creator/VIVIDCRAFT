-- Add experience and education text columns to profiles table
-- These allow Experience & Education wizard steps to save directly to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT;
