import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardWrapper from './DashboardWrapper';
import DashboardSessionHydrator from './DashboardSessionHydrator';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import type { AppSession } from '@/types/session';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Dashboard',
  description: 'View your Vivid Art dashboard, manage your projects, and track your creative commissions.',
});

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedParams = (await searchParams) || {};
  const currentTab = resolvedParams.tab || 'overview';

  const cookieStore = await cookies();
  const hasAuthCookies = cookieStore.getAll().some(
    (c) =>
      (c.name.startsWith('sb-') || c.name.includes('auth-token') || c.name.includes('supabase')) &&
      c.value &&
      c.value.length > 20
  );

  let session: AppSession | null = null;
  try {
    session = (await auth()) as AppSession | null;
  } catch (error) {
    session = null;
  }

  let supabase = null;
  let authUser = null;

  // If auth() did not resolve session, attempt direct resolution via Supabase server client
  if (!session?.user) {
    try {
      supabase = await createClient();
      if (supabase) {
        const userRes = await supabase.auth.getUser();
        authUser = userRes?.data?.user || null;

        if (!authUser) {
          const sessionRes = await supabase.auth.getSession();
          authUser = sessionRes?.data?.session?.user || null;
        }

        if (authUser) {
          const rawFullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || '';
          const nameParts = rawFullName.trim().split(/\s+/);
          const firstName =
            authUser.user_metadata?.given_name ||
            authUser.user_metadata?.first_name ||
            authUser.user_metadata?.firstName ||
            nameParts[0] ||
            '';
          const lastName =
            authUser.user_metadata?.family_name ||
            authUser.user_metadata?.last_name ||
            authUser.user_metadata?.lastName ||
            (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') ||
            '';
          const fullName =
            firstName && lastName ? `${firstName} ${lastName}` : firstName || authUser.email?.split('@')[0] || 'User';

          session = {
            user: {
              id: authUser.id,
              email: authUser.email || '',
              name: fullName,
              role: 'ARTIST',
            },
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          };
        }
      }
    } catch {}
  }

  // If still no session resolved:
  if (!session?.user) {
    // If Supabase auth cookies are present, hydration might be slightly delayed - allow client hydrator
    if (hasAuthCookies) {
      return <DashboardSessionHydrator />;
    }
    // Otherwise, guest user with no session or auth cookies - redirect to login
    redirect('/auth/login?callbackUrl=/dashboard');
  }

  const activeSession: AppSession = session;

  try {
    if (!supabase) {
      supabase = await createClient();
    }
    if (supabase) {
      if (!authUser) {
        const userRes = await supabase.auth.getUser();
        authUser = userRes?.data?.user;
      }

      if (authUser) {
        let dbRole = '';
        let isVerified = true;
        let userEmail = authUser.email || '';

        // Check profiles table first
        try {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle();
          if (profileRow?.role) {
            dbRole = profileRow.role;
          }
        } catch {}

        // HARDCODE: profiles table is the ONLY source for role (set by provision-user on signup).
        // User/users tables are only read for isVerified and email — NOT for role.
        // This prevents a stale CLIENT in users/User from ever overriding artist signup.

        // Fetch isVerified and email from User table only (Google / confirmed users bypass)
        const isGoogleOrConfirmed =
          authUser.app_metadata?.provider === 'google' ||
          authUser.app_metadata?.providers?.includes('google') ||
          Boolean(authUser.email_confirmed_at) ||
          authUser.user_metadata?.isVerified === true;

        if (isGoogleOrConfirmed) {
          isVerified = true;
        } else if (!isVerified || !userEmail) {
          try {
            const { data: userData } = await supabase
              .from('User')
              .select('isVerified, email')
              .eq('id', authUser.id)
              .maybeSingle();
            if (userData?.isVerified !== undefined) {
              isVerified = userData.isVerified;
            }
            if (userData?.email) {
              userEmail = userData.email;
            }
          } catch {}
        }

        // Set ARTIST as the default fallback profile state regardless of client/collector role
        const rawRoleStr = (
          dbRole ||
          authUser.user_metadata?.role ||
          authUser.user_metadata?.userRole ||
          authUser.user_metadata?.user_type ||
          'ARTIST'
        ).toString().trim().toUpperCase();

        const role = rawRoleStr === 'ADMIN' ? 'ADMIN' : 'ARTIST';

        activeSession.user.role = role;

        if (role === 'ADMIN' && currentTab === 'overview') {
          redirect('/admin');
        }

        if (isVerified === false) {
          const { default: UnverifiedEmailPage } = await import('./UnverifiedEmailPage');
          return <UnverifiedEmailPage email={userEmail} />;
        }
      }
    }
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    // If Supabase connection fails, proceed with validated session
  }

  if (!activeSession.user.role || activeSession.user.role === 'undefined') {
    activeSession.user.role = 'ARTIST';
  }

  return <DashboardWrapper session={activeSession} />;
}
