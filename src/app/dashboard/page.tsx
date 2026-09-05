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
        const { data: userData } = await supabase
          .from('User')
          .select('role, isVerified, email')
          .eq('id', authUser.id)
          .maybeSingle();

        const rawDbRole = (userData?.role || authUser.user_metadata?.role || activeSession.user.role || '').toString().trim().toUpperCase();
        const role = ['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(rawDbRole)
          ? 'FREELANCER'
          : (rawDbRole === 'ADMIN' ? 'ADMIN' : (rawDbRole === 'CLIENT' ? 'CLIENT' : 'FREELANCER'));

        if (role === 'ADMIN' && currentTab === 'overview') {
          redirect('/admin');
        }

        if (userData && userData.isVerified === false) {
          const { default: UnverifiedEmailPage } = await import('./UnverifiedEmailPage');
          return <UnverifiedEmailPage email={userData.email || authUser.email || ''} />;
        }
      }
    }
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    // If Supabase connection fails, proceed with validated session
  }

  return <DashboardWrapper session={activeSession} />;
}
