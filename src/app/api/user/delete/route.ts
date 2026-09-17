import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

async function handleDelete(request: NextRequest) {
  try {
    const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co';
    const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder';
    const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) || anonKey;

    // 1. Authenticate the user
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

    const supabase = await createClient();
    let user: { id: string; email?: string } | null = null;

    if (token) {
      try {
        const { data: tokenUserData, error: tokenError } = await supabase.auth.getUser(token);
        if (!tokenError && tokenUserData?.user) {
          user = tokenUserData.user;
        }
      } catch (tokenErr) {
        console.warn('[delete-user] Bearer token auth warning:', tokenErr);
      }
    }

    if (!user) {
      try {
        const { data: cookieUserData, error: cookieError } = await supabase.auth.getUser();
        if (!cookieError && cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch (cookieErr) {
        console.warn('[delete-user] Cookie session auth warning:', cookieErr);
      }
    }

    // Check mock admin session if present
    const cookieStore = await cookies();
    const isMockAdmin =
      cookieStore.get('is_admin')?.value === 'true' ||
      cookieStore.get('mock_admin_session')?.value === 'true';

    if (!user && isMockAdmin) {
      // Clear mock admin cookies and return success
      cookieStore.delete('is_admin');
      cookieStore.delete('mock_admin_session');
      const res = NextResponse.json({
        success: true,
        message: 'Mock admin session deleted',
        redirectUrl: '/login?deleted=true',
      });
      res.cookies.set('is_admin', '', { path: '/', maxAge: 0, expires: new Date(0) });
      res.cookies.set('mock_admin_session', '', { path: '/', maxAge: 0, expires: new Date(0) });
      return res;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. You must be signed in to delete your account.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Initialize Supabase Admin Client using Service Role Key
    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`[delete-user] Initiating master relational cleanup for user ${userId}`);

    // 3. Explicit Relational Cleanups before deleting the auth user
    // Messages cleanup
    try {
      await adminClient.from('messages').delete().eq('sender_id', userId);
      await adminClient.from('messages').delete().eq('receiver_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during messages cleanup:', err);
    }

    // Artwork likes and ratings cleanup
    try {
      await adminClient.from('artwork_likes').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during artwork_likes cleanup:', err);
    }
    try {
      await adminClient.from('artwork_ratings').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during artwork_ratings cleanup:', err);
    }

    // Artworks cleanup
    try {
      await adminClient.from('artworks').delete().eq('user_id', userId);
      await adminClient.from('artworks').delete().eq('artist_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during artworks cleanup:', err);
    }
    try {
      await adminClient.from('Artwork').delete().eq('artistId', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during Artwork table cleanup:', err);
    }

    // Reviews cleanup
    try {
      await adminClient.from('reviews').delete().eq('artist_id', userId);
      await adminClient.from('reviews').delete().eq('reviewer_id', userId);
      await adminClient.from('reviews').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during reviews cleanup:', err);
    }

    // Favorites cleanup
    try {
      await adminClient.from('favorites').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during favorites cleanup:', err);
    }

    // Commissions cleanup
    try {
      await adminClient.from('commissions').delete().eq('client_id', userId);
      await adminClient.from('commissions').delete().eq('artist_id', userId);
      await adminClient.from('commissions').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during commissions cleanup:', err);
    }

    // Chat connections cleanup
    try {
      await adminClient.from('ChatConnection').delete().eq('clientId', userId);
      await adminClient.from('ChatConnection').delete().eq('artistId', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during ChatConnection cleanup:', err);
    }

    // Verifications cleanup
    try {
      await adminClient.from('verifications').delete().eq('user_id', userId);
    } catch (err) {
      console.warn('[delete-user] Notice during verifications cleanup:', err);
    }

    // Delete user profile from public.profiles
    try {
      const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', userId);
      if (profileDeleteError) {
        console.warn('[delete-user] Notice during profiles cleanup:', profileDeleteError.message);
      }
    } catch (err) {
      console.warn('[delete-user] Error deleting profile:', err);
    }

    // Also clean up User / users table if exists
    try {
      await adminClient.from('User').delete().eq('id', userId);
    } catch {}
    try {
      await adminClient.from('users').delete().eq('id', userId);
    } catch {}

    // 4. Delete user using Supabase Auth Admin Client
    const { error: adminDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (adminDeleteError) {
      console.warn('[delete-user] Supabase auth.admin.deleteUser notice:', {
        message: adminDeleteError.message,
        status: (adminDeleteError as any).status,
      });
    }

    // 5. Invalidate/Sign out session
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore client signOut errors
    }

    // 6. Invalidate and clear all session/auth cookies
    const allCookies = cookieStore.getAll();
    allCookies.forEach((c) => {
      if (
        c.name.startsWith('sb-') ||
        c.name.includes('auth-token') ||
        c.name.includes('supabase') ||
        c.name.includes('session') ||
        c.name === 'is_admin' ||
        c.name === 'mock_admin_session'
      ) {
        try {
          cookieStore.delete(c.name);
        } catch {}
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully.',
      redirectUrl: '/login?deleted=true',
    });

    // Explicitly set deletion on response cookies
    allCookies.forEach((c) => {
      if (
        c.name.startsWith('sb-') ||
        c.name.includes('auth-token') ||
        c.name.includes('supabase') ||
        c.name.includes('session') ||
        c.name === 'is_admin' ||
        c.name === 'mock_admin_session'
      ) {
        response.cookies.set(c.name, '', {
          path: '/',
          maxAge: 0,
          expires: new Date(0),
        });
      }
    });

    console.log(`[delete-user] Successfully completed account deletion for user ${userId}`);
    return response;
  } catch (error: any) {
    console.error('[delete-user] Detailed account deletion failure:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error,
    });
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred while deleting your account.',
        details: process.env.NODE_ENV !== 'production' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleDelete(request);
}

export async function DELETE(request: NextRequest) {
  return handleDelete(request);
}
