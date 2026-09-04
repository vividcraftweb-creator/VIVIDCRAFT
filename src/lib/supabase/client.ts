import { createBrowserClient } from '@supabase/ssr'

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function createClient() {
  let supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
  if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
  const supabaseKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';

  const isConfigured = 
    Boolean(supabaseUrl) && 
    !supabaseUrl.includes('placeholder') && 
    !supabaseUrl.includes('your-project') &&
    Boolean(supabaseKey) &&
    supabaseKey !== 'placeholder' &&
    supabaseKey !== 'your-anon-key-placeholder' &&
    supabaseKey !== 'your-anon-key';

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          if (!isConfigured) {
            // Return safe mock response if not configured to prevent network exceptions
            return new Response(JSON.stringify({ data: null, error: null }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          try {
            return await fetch(input, init);
          } catch (error: any) {
            console.warn('Supabase request handled gracefully:', error?.message || error);
            return new Response(JSON.stringify({ data: null, error: { message: error?.message || 'Network unavailable' } }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        },
      },
    }
  );
}
