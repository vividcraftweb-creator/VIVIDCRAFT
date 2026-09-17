-- Migration: Ensure advertisements table columns match application schema
-- Adds target_route column if not present and synchronizes link_url & target_route

ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS target_route TEXT DEFAULT '/gallery';
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT '/gallery';

-- Sync link_url and target_route bidirectionally
UPDATE public.advertisements
SET target_route = COALESCE(target_route, link_url, '/gallery')
WHERE target_route IS NULL;

UPDATE public.advertisements
SET link_url = COALESCE(link_url, target_route, '/gallery')
WHERE link_url IS NULL;
