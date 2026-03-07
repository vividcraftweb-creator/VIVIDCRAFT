// Supabase Auth helper functions
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

// For backwards compatibility with existing code
export async function auth() {
  try {
    const user = await getUser();
    if (!user) {
      return null;
    }

    // Get name from user_metadata
    const firstName = user.user_metadata?.firstName;
    const lastName = user.user_metadata?.lastName;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || null;

    // Get session for tokens (needed for document uploads)
    const session = await getSession();

    // Try to read authoritative role from the User table
    let dbRole: string | null = null;
    try {
      const adminSupabase = createAdminClient();
      const { data: userRow, error: userRowError } = await adminSupabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userRowError) {
        // Error fetching user role - use metadata fallback
      } else {
        dbRole = userRow?.role || null;
      }
    } catch (dbError) {
      // Error accessing database - use metadata fallback
    }

    const resolvedRole = (dbRole || user.user_metadata?.role || '').toUpperCase() || 'FREELANCER';

    const finalRole = resolvedRole;



    return {
      user: {
        id: user.id,
        email: user.email,
        name: fullName,
        role: finalRole,
      },
      accessToken: session?.access_token || '',
      refreshToken: session?.refresh_token || '',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };
  } catch (error) {
    // Error in auth - sign out
    const supabase = await createClient();
    await supabase.auth.signOut();
    return null;
  }
}
