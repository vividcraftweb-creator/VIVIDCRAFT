-- Migration: Add chat_code column to messages table and ensure admin full read access

-- 1. Add chat_code column to public.messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS chat_code text;
CREATE INDEX IF NOT EXISTS idx_messages_chat_code ON public.messages (chat_code);

-- 2. If legacy Message table exists, also add chat_code column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Message' AND table_schema = 'public') THEN
    ALTER TABLE public."Message" ADD COLUMN IF NOT EXISTS chat_code text;
    CREATE INDEX IF NOT EXISTS idx_Message_chat_code ON public."Message" (chat_code);
  END IF;
END $$;

-- 3. Ensure permissions and permissive select for monitoring
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO anon;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow admin full access on messages" ON public.messages;
  CREATE POLICY "Allow admin full access on messages" ON public.messages
    FOR ALL
    USING (true)
    WITH CHECK (true);
END $$;
