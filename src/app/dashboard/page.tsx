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

const withTimeout = <T,>(promise: Promise<T>, ms = 2000): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedParams = (await searchParams) || {};
  const currentTab = resolvedParams.tab || 'overview';

  let session = null;
  try {
    session = await withTimeout(auth(), 2000);
  } catch (error) {
    session = null;
  }

  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/dashboard');
  }

  const activeSession: AppSession = session;

  try {
    const supabase = await withTimeout(createClient(), 2000);
    if (supabase) {
      const userRes = await withTimeout(supabase.auth.getUser(), 2000);
      const authUser = userRes?.data?.user;
      const userError = userRes?.error;

      if (!authUser || userError) {
        redirect('/auth/login?callbackUrl=/dashboard&logged_out=1');
      }

      if (authUser && !userError) {
        const { data: userData } = await supabase
          .from('User')
          .select('role, isVerified, email')
          .eq('id', authUser.id)
          .single();

        const rawDbRole = (userData?.role || authUser.user_metadata?.role || '').toString().trim().toUpperCase();
        const role = ['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(rawDbRole)
          ? 'FREELANCER'
          : (rawDbRole === 'ADMIN' ? 'ADMIN' : rawDbRole === 'CLIENT' ? 'CLIENT' : null);

        // Redirect Buyers / Clients away from Dashboard to Home Page
        if (role === 'CLIENT') {
          redirect('/');
        }

        if (role === 'ADMIN' && currentTab === 'overview') {
          redirect('/admin');
        }

        if (userData && !userData.isVerified) {
          const { default: UnverifiedEmailPage } = await import('./UnverifiedEmailPage');
          return <UnverifiedEmailPage email={userData.email || authUser.email || ''} />;
        }
      }
    }
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    // If Supabase connection fails or user is offline, proceed with validated session
  }

  if (activeSession.user.role === 'CLIENT') {
    redirect('/');
  }

  return <DashboardWrapper session={activeSession} />;
}
