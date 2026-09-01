-- Ensure public.profiles table has open authenticated access for upsert / update
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR ALL 
USING (auth.uid()::text = id::text OR auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon')
WITH CHECK (auth.uid()::text = id::text OR auth.role() = 'authenticated' OR auth.role() = 'service_role' OR auth.role() = 'anon');
