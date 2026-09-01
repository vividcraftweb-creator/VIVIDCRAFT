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

    // Try to read authoritative role from the User table
    let dbRole: string | null = null;
    try {
      const adminSupabase = createAdminClient();
      const { data: userRow, error: userRowError } = await adminSupabase
        .from('User')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userRowError && userRow?.role) {
        dbRole = userRow.role;
      }
    } catch {
      // Error accessing database - use metadata fallback
    }

    const resolvedRole = (dbRole || user.user_metadata?.role || '').toUpperCase() || 'CLIENT';

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
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    return null;
  }
}
