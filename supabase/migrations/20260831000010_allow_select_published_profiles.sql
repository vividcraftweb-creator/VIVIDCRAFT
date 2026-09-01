-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old SELECT policy if exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view published profiles" ON public.profiles;

-- Create permissive SELECT policy for published profiles
CREATE POLICY "Anyone can view published profiles"
ON public.profiles FOR SELECT
USING (is_published = true OR auth.uid() = id);
