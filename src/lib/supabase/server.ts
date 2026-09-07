import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export async function createClient() {
  let supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';

  try {
    const cookieStore = await cookies()

    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll().filter(c => {
              return !c.value.includes('data%3Aimage') && !c.value.includes('data:image');
            });
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  } catch {
    // Fallback for API routes where cookies() might not be available
    return createSupabaseClient(
      supabaseUrl,
      supabaseAnonKey
    )
  }
}

// Create admin client with service role key (or anon key fallback)
export function createAdminClient() {
  let supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  // If serviceKey starts with sb_secret_, it triggers 401 Invalid API key on PostgREST; fallback to working anonKey
  const serviceRoleKey = (serviceKey && !serviceKey.startsWith('sb_secret_')) ? serviceKey : anonKey;

  try {
    return createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } catch (err) {
    console.error('Failed to create Supabase admin client:', err);
    return createSupabaseClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}

// Next.js Route Handler client helper (compatible with Next.js 15 async cookies)
export async function createRouteHandlerClient(_context?: { cookies?: any }) {
  return createClient();
}
