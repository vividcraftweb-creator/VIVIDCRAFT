-- Ensure avatar_url column exists on public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
