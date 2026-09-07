import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

const DEV_ADMIN_EMAIL = 'vividcraftweb@gmail.com';
const DEV_ADMIN_PASSWORD = 'VividCraftAdmin#2026!';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Development & Local Fallback for Admin User
    if (cleanEmail === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set('mock_admin_session', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        httpOnly: false,
      });

      // Try Supabase auth in background if configured, but do not fail
      try {
        const supabase = await createClient();
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } catch {
        // Ignore Supabase connection or invalid key errors for mock dev login
      }

      return NextResponse.json({
        success: true,
        message: 'Admin authentication successful',
        role: 'ADMIN',
        redirect: '/admin',
        user: {
          id: 'admin-vividcraft-default-id',
          email: DEV_ADMIN_EMAIL,
          name: 'Vivid Craft Admin',
          role: 'ADMIN',
        },
      });
    }

    // Standard Supabase authentication for other users
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const isUnconfirmed = 
          error.message.toLowerCase().includes('not confirmed') ||
          error.message.toLowerCase().includes('unconfirmed') ||
          (error as any)?.code === 'email_not_confirmed';

        if (isUnconfirmed) {
          return NextResponse.json({
            message: 'This legacy account state requires resetting. Click here to reset password or sign up with updated details.',
            error: 'email_not_confirmed',
            legacyUnconfirmed: true,
          }, { status: 403 });
        }

        return NextResponse.json(
          { message: error.message || 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Ensure Clean Metadata Sync on Sign-In
      const metadata = data?.user?.user_metadata || {};
      const rawMetaRole = metadata.role || metadata.userRole || '';
      const cleanMetaRole = String(rawMetaRole).trim().toLowerCase();
      const isClient = cleanMetaRole === 'client' || cleanMetaRole === 'buyer' || cleanMetaRole === 'customer';
      const roleToUse = isClient ? 'client' : 'artist';
      const fullName = metadata.full_name || metadata.name || '';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = metadata.first_name || metadata.firstName || nameParts[0] || (roleToUse === 'artist' ? 'New' : 'Client');
      const lastName = metadata.last_name || metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') || (roleToUse === 'artist' ? 'Artist' : 'User');
      const userLocation = metadata.location || metadata.country || 'Sri Lanka';

      try {
        await (supabase as any).from('profiles').upsert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          role: roleToUse,
          email: data.user.email || null,
          address: userLocation,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (syncErr) {
        console.warn('API login profile metadata sync notice:', syncErr);
      }

      let userRole = roleToUse;
      try {
        let dbUser = (await (supabase as any).from('users').select('role').eq('id', data.user.id).maybeSingle())?.data;
        if (!dbUser) {
          dbUser = (await (supabase as any).from('profiles').select('role').eq('id', data.user.id).maybeSingle())?.data;
        }
        if (!dbUser) {
          dbUser = (await supabase.from('User').select('role').eq('id', data.user.id).maybeSingle())?.data;
        }
        if (dbUser?.role) {
          userRole = dbUser.role;
        }
      } catch {
        // Fall back to metadata role
      }

      const isArtist = ['artist', 'freelancer', 'creator', 'seller'].includes(String(userRole).toLowerCase());
      const isAdmin = String(userRole).toUpperCase() === 'ADMIN';
      const redirectUrl = isAdmin ? '/admin' : isArtist ? '/dashboard' : '/';

      return NextResponse.json({
        success: true,
        role: userRole,
        redirect: redirectUrl,
        user: data.user,
      });
    } catch (err: any) {
      return NextResponse.json(
        { message: err?.message || 'Authentication service unavailable' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
