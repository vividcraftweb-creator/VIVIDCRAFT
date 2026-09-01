-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop restrictive select policies
DROP POLICY IF EXISTS "Public view" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view published profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow select for published profiles" ON public.profiles;

-- Create open SELECT policy for published profiles
CREATE POLICY "Allow select for published profiles"
ON public.profiles FOR SELECT
USING (is_published = true OR auth.uid() = id);

-- Explicitly grant SELECT permission to roles
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
