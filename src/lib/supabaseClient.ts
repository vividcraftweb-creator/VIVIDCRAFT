import { createClient } from './supabase/client';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    !url.includes('your-project') &&
    key &&
    key !== 'placeholder' &&
    key !== 'your-anon-key-placeholder'
  );
};

export const supabase = createClient();

/**
 * Safe wrapper utility to execute Supabase operations without unhandled network exceptions
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallbackData: T | null = null
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn();
    return result;
  } catch (err: any) {
    console.warn('Supabase query network/execution warning:', err?.message || err);
    return {
      data: fallbackData,
      error: { message: err?.message || 'Network request failed' },
    };
  }
}

export default supabase;