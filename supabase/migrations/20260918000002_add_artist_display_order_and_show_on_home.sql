-- Migration: Add display_order and show_on_home columns to profiles table
-- Ensures admin can manually order artists and toggle which artists appear on the home page

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false;

-- Create indexes for efficient querying and sorting on home page
CREATE INDEX IF NOT EXISTS idx_profiles_show_on_home_order
ON public.profiles(show_on_home, display_order ASC);

-- Ensure public can read display_order and show_on_home
COMMENT ON COLUMN public.profiles.display_order IS 'Manual sort order for displaying artists on home and showcase pages (lower numbers appear first)';
COMMENT ON COLUMN public.profiles.show_on_home IS 'Toggle whether artist appears in the Top Artists showcase on the landing page';
