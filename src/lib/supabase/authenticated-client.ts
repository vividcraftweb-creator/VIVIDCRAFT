import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Creates an authenticated Supabase client carrying the user's active JWT session token
 * in the Authorization header. This allows PostgREST to properly evaluate auth.uid()
 * for Row-Level Security (RLS) policies (e.g., auth.uid() = id, auth.uid() = artist_id).
 */
export async function getAuthenticatedClient(ctx: any): Promise<SupabaseClient<any>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edvoffgfattcoladypii.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_o2t69o3py5_mC2rQh7PX5w_WaqJNuNA';

  // 1. Try Authorization header from incoming tRPC request
  let token = ctx.req?.headers?.get?.('authorization')?.replace(/^Bearer\s+/i, '');

  // 2. Try accessToken from session context
  if (!token && ctx.session?.accessToken && ctx.session.accessToken !== 'mock-admin-dev-token') {
    token = ctx.session.accessToken;
  }

  // 3. Try reading session from server cookie store
  const serverClient = await createClient();
  if (!token) {
    try {
      const { data: { session } } = await serverClient.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch {}
  }

  // If a JWT token was retrieved, build client with explicit Authorization header
  if (token) {
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  // Fallback to cookie-based server client
  return serverClient;
}
