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

        // Fallback to User table
        if (!dbRole) {
          try {
            const { data: userData } = await supabase
              .from('User')
              .select('role, isVerified, email')
              .eq('id', authUser.id)
              .maybeSingle();
            if (userData?.role) {
              dbRole = userData.role;
            }
            if (userData?.isVerified !== undefined) {
              isVerified = userData.isVerified;
            }
            if (userData?.email) {
              userEmail = userData.email;
            }
          } catch {}
        }

        // Fallback to users table
        if (!dbRole) {
          try {
            const { data: usersRow } = await (supabase as any)
              .from('users')
              .select('role')
              .eq('id', authUser.id)
              .maybeSingle();
            if (usersRow?.role) {
              dbRole = usersRow.role;
            }
          } catch {}
        }

        const rawRole = (
          dbRole ||
          authUser.user_metadata?.role ||
          authUser.user_metadata?.userRole ||
          authUser.user_metadata?.user_type ||
          activeSession.user.role ||
          'FREELANCER'
        ).toString().trim().toUpperCase();

        const role = ['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(rawRole)
          ? 'FREELANCER'
          : (rawRole === 'ADMIN' ? 'ADMIN' : (rawRole === 'CLIENT' || rawRole === 'BUYER' ? 'CLIENT' : 'FREELANCER'));

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
