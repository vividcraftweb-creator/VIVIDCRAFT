-- 1. Force add all required columns to 'profiles' table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Reset Row Level Security Policies (Stop blocking saves!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view" ON public.profiles;
DROP POLICY IF EXISTS "User write" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual write access" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public view" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id::text OR (SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated');
CREATE POLICY "User update" ON public.profiles FOR UPDATE USING (auth.uid()::text = id::text OR (SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated') WITH CHECK (auth.uid()::text = id::text OR (SELECT auth.role()) = 'service_role' OR (SELECT auth.role()) = 'authenticated');

NOTIFY pgrst, 'reload schema';
