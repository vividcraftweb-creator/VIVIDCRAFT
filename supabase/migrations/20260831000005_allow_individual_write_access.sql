-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Allow individual write access" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_policy" ON public.profiles;

-- Create individual write access policy
CREATE POLICY "Allow individual write access" 
ON public.profiles FOR ALL 
USING (auth.uid()::text = id::text OR (SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated') 
WITH CHECK (auth.uid()::text = id::text OR (SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated');
