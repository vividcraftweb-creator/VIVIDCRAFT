import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { slugFromName } from '@/lib/slug';

type DbClient = SupabaseClient<Database>;

/**
 * Generate a unique slug for a profile based on first and last name.
 */
export async function generateProfileSlug(
  supabase: DbClient,
  firstName?: string | null,
  lastName?: string | null,
  currentProfileId?: string
): Promise<string | null> {
  const baseSlug = slugFromName(firstName, lastName);
  if (!baseSlug) {
    return null;
  }

  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const query = (supabase as any)
      .from('profiles')
      .select('id')
      .eq('slug', candidate)
      .limit(1);

    if (currentProfileId) {
      query.neq('id', currentProfileId);
    }

    try {
      const { data: conflict, error } = await query.maybeSingle();

      if (error && error.code !== 'PGRST116') {
        return baseSlug;
      }

      if (!conflict) {
        return candidate;
      }
    } catch {
      return baseSlug;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
    if (suffix > 50) return `${baseSlug}-${Date.now()}`;
  }
}
