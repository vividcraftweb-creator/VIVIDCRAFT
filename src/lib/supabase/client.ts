import { createBrowserClient } from '@supabase/ssr'

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

/**
 * Purge bloated cookies (such as serialized base64 data URIs or orphaned chunk cookies)
 * to prevent Vercel 494 REQUEST_HEADER_TOO_LARGE errors.
 */
export function cleanBloatedAuthCookies() {
  if (typeof document === 'undefined') return;
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const parts = cookie.split('=');
      const name = parts[0]?.trim() || '';
      const value = parts.slice(1).join('=');

      const isBloated =
        value.includes('data%3Aimage') ||
        value.includes('data:image') ||
        value.length > 3000 ||
        (name.includes('auth-token.') && parseInt(name.split('.').pop() || '0', 10) > 4);

      if (isBloated) {
        console.warn(`[Supabase Auth] Purging bloated cookie header: ${name} (${value.length} bytes)`);
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        if (typeof window !== 'undefined' && window.location?.hostname) {
          const hostname = window.location.hostname;
          document.cookie = `${name}=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          if (hostname.includes('.')) {
            const rootDomain = hostname.split('.').slice(-2).join('.');
            document.cookie = `${name}=; path=/; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[cleanBloatedAuthCookies] Error during cleanup:', err);
  }
}

export function createClient() {
  if (typeof document !== 'undefined') {
    cleanBloatedAuthCookies();
  }

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
