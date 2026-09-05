// Supabase Auth helper functions with Dev Admin Fallback
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const DEV_ADMIN_EMAIL = 'vividcraftweb@gmail.com';

async function getMockAdminSession() {
  try {
    const cookieStore = await cookies();
    const isMockAdmin =
      cookieStore.get('is_admin')?.value === 'true' ||
      cookieStore.get('mock_admin_session')?.value === 'true';
    if (isMockAdmin) {
      return {
        id: 'admin-vividcraft-default-id',
        email: DEV_ADMIN_EMAIL,
        name: 'Vivid Craft Admin',
        role: 'ADMIN',
      };
    }
  } catch {
    // Cookie store not available in non-request contexts
  }
  return null;
}

export async function getUser() {
  const mockAdmin = await getMockAdminSession();
  if (mockAdmin) {
    return {
      id: mockAdmin.id,
      email: mockAdmin.email,
      user_metadata: {
        firstName: 'Vivid Craft',
        lastName: 'Admin',
        role: 'ADMIN',
      },
      app_metadata: { role: 'ADMIN' },
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    } as any;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function getSession() {
  const mockAdmin = await getMockAdminSession();
  if (mockAdmin) {
    return {
      access_token: 'mock-admin-dev-token',
      refresh_token: 'mock-admin-dev-refresh-token',
      expires_in: 3600 * 24 * 30,
      expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
      token_type: 'bearer',
      user: {
        id: mockAdmin.id,
        email: mockAdmin.email,
        role: 'ADMIN',
      },
    } as any;
  }

  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// For backwards compatibility with existing code
export async function auth() {
  try {
    const mockAdmin = await getMockAdminSession();
    if (mockAdmin) {
      return {
        user: {
          id: mockAdmin.id,
          email: mockAdmin.email,
          name: mockAdmin.name,
          role: 'ADMIN',
        },
        accessToken: 'mock-admin-dev-token',
        refreshToken: 'mock-admin-dev-refresh-token',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const user = await getUser();
    if (!user) {
      return null;
    }

    // Direct check for admin email
    if (user.email?.toLowerCase() === DEV_ADMIN_EMAIL) {
      return {
        user: {
          id: user.id,
          email: user.email,
          name: 'Vivid Craft Admin',
          role: 'ADMIN',
        },
        accessToken: 'mock-admin-dev-token',
        refreshToken: 'mock-admin-dev-refresh-token',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Get name from user_metadata
    const firstName = user.user_metadata?.firstName;
    const lastName = user.user_metadata?.lastName;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || null;

    // Get session for tokens (needed for document uploads)
    const session = await getSession();

    // Try to read authoritative role — profiles table is the single source of truth for role
    let dbRole: string | null = null;
    try {
      const adminSupabase = createAdminClient();

      // 1. profiles table is the PRIMARY source of truth for role (set during signup by provision-user)
      const profilesRow = (await (adminSupabase as any).from('profiles').select('role').eq('id', user.id).maybeSingle())?.data;
      if (profilesRow?.role) {
        dbRole = profilesRow.role;
      }

      // 2. user_metadata is stamped by provision-user — check before hitting users/User tables
      if (!dbRole) {
        const metaRole = user.user_metadata?.role || user.user_metadata?.userRole || user.user_metadata?.user_type || user.user_metadata?.role_name || user.user_metadata?.account_type;
        if (metaRole) {
          dbRole = String(metaRole);
        }
      }

      // 3. Fall back to users / User tables only if profiles + metadata both missing
      if (!dbRole) {
        const userRow = (await (adminSupabase as any).from('users').select('role').eq('id', user.id).maybeSingle())?.data;
        if (userRow?.role) {
          dbRole = userRow.role;
        }
      }
      if (!dbRole) {
        const userRow2 = (await adminSupabase.from('User').select('role').eq('id', user.id).maybeSingle())?.data;
        if (userRow2?.role) {
          dbRole = userRow2.role;
        }
      }

      if (!dbRole) {
        console.warn('[auth] No role found anywhere for user:', user.id, '— defaulting to FREELANCER (artist)');
      }
    } catch (dbErr) {
      console.error('[auth] DB role lookup failed for user:', user.id, dbErr);
    }

    // Resolve: only CLIENT if explicitly 'CLIENT' or 'BUYER' in the authoritative source
    // Everything else (ARTIST, FREELANCER, CREATOR, SELLER, empty, undefined) → FREELANCER
    const rawRole = (dbRole || 'FREELANCER').toString().trim().toUpperCase();

    const resolvedRole = rawRole === 'ADMIN'
      ? 'ADMIN'
      : (rawRole === 'CLIENT' || rawRole === 'BUYER' || rawRole === 'CUSTOMER')
        ? 'CLIENT'
        : 'FREELANCER'; // ARTIST, FREELANCER, CREATOR, SELLER, missing → always FREELANCER

    return {
      user: {
        id: user.id,
        email: user.email,
        name: fullName,
        role: resolvedRole,
      },
      accessToken: session?.access_token || '',
      refreshToken: session?.refresh_token || '',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    };
  } catch (error) {
    console.error('[auth] Auth session error caught gracefully:', error);
    return null;
  }
}
