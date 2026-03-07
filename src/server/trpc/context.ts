import { type inferAsyncReturnType } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { auth } from '@/lib/auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const createContext = async (opts?: FetchCreateContextFnOptions) => {
  const session = await auth();

  return {
    session,
    req: opts?.req,
    res: undefined,
    adminSupabase: undefined as SupabaseClient<Database> | undefined,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;
