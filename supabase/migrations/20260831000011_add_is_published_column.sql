-- Add missing is_published column to public.profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old SELECT policy if exists
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view published profiles" ON public.profiles;

-- Create permissive SELECT policy for published profiles
CREATE POLICY "Anyone can view published profiles"
ON public.profiles FOR SELECT
USING (is_published = true OR auth.uid() = id);

-- Refresh Schema Cache
NOTIFY pgrst, 'reload schema';
