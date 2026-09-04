import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type Context = {
  session: Awaited<ReturnType<typeof auth>>;
  req: Request | undefined;
  res: undefined;
  supabase: SupabaseClient<Database>;
  adminSupabase: SupabaseClient<Database>;
};

export const createContext = async (opts?: FetchCreateContextFnOptions): Promise<Context> => {
  let session: Awaited<ReturnType<typeof auth>> = null;
  try {
    session = await auth();
  } catch (err) {
    console.error('[createContext] auth error caught gracefully:', err);
  }

  let adminSupabase: any = null;
  try {
    adminSupabase = createAdminClient();
  } catch (err) {
    console.error('[createContext] createAdminClient error caught gracefully:', err);
  }
  const supabase = adminSupabase;

  return {
    session,
    req: opts?.req as Request | undefined,
    res: undefined,
    supabase,
    adminSupabase,
  };
};
