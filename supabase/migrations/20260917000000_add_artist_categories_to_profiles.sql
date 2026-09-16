-- Migration: Add artist category columns to public.profiles
-- Supports categorization: mediums, specialties, services, and other custom categories

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mediums TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS other_categories TEXT[] DEFAULT '{}';

-- Create GIN indexes for efficient array searching/filtering
CREATE INDEX IF NOT EXISTS idx_profiles_mediums ON public.profiles USING GIN (mediums);
CREATE INDEX IF NOT EXISTS idx_profiles_specialties ON public.profiles USING GIN (specialties);
CREATE INDEX IF NOT EXISTS idx_profiles_services ON public.profiles USING GIN (services);

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
