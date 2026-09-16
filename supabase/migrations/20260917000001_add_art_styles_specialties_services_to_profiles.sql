-- Migration: Add art_styles, art_specialties, services_offered to public.profiles
-- Enables category storage and filtering for artist profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS art_styles TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS art_specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS services_offered TEXT[] DEFAULT '{}';

-- Sync from existing mediums, specialties, services if already populated
UPDATE public.profiles
SET art_styles = mediums
WHERE (art_styles IS NULL OR cardinality(art_styles) = 0)
  AND mediums IS NOT NULL
  AND cardinality(mediums) > 0;

UPDATE public.profiles
SET art_specialties = specialties
WHERE (art_specialties IS NULL OR cardinality(art_specialties) = 0)
  AND specialties IS NOT NULL
  AND cardinality(specialties) > 0;

UPDATE public.profiles
SET services_offered = services
WHERE (services_offered IS NULL OR cardinality(services_offered) = 0)
  AND services IS NOT NULL
  AND cardinality(services) > 0;

-- GIN Indexes for fast array overlap/containment queries
CREATE INDEX IF NOT EXISTS idx_profiles_art_styles ON public.profiles USING GIN (art_styles);
CREATE INDEX IF NOT EXISTS idx_profiles_art_specialties ON public.profiles USING GIN (art_specialties);
CREATE INDEX IF NOT EXISTS idx_profiles_services_offered ON public.profiles USING GIN (services_offered);

-- Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
