import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardWrapper from './DashboardWrapper';
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

  let session = null;
  try {
    session = await auth();
  } catch (error) {
    session = null;
  }

  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/dashboard');
  }

  const activeSession: AppSession = session;

  try {
    const supabase = await createClient();
    if (supabase) {
      const userRes = await supabase.auth.getUser();
      const authUser = userRes?.data?.user;

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

        // Fetch isVerified and email from User table only
        if (!isVerified || !userEmail) {
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

        // Role comes from profiles.role → user_metadata → FREELANCER (never from users/User table)
        const rawRoleStr = (
          dbRole ||
          authUser.user_metadata?.role ||
          authUser.user_metadata?.userRole ||
          authUser.user_metadata?.user_type ||
          'FREELANCER'
        ).toString().trim().toUpperCase();

        // HARDCODE: only CLIENT if explicitly CLIENT/BUYER in profiles or user_metadata
        const role = rawRoleStr === 'ADMIN'
          ? 'ADMIN'
          : (rawRoleStr === 'CLIENT' || rawRoleStr === 'BUYER' || rawRoleStr === 'CUSTOMER')
            ? 'CLIENT'
            : 'FREELANCER'; // Missing, ARTIST, FREELANCER, CREATOR → always FREELANCER

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
    activeSession.user.role = 'FREELANCER';
  }

  return <DashboardWrapper session={activeSession} />;
}
