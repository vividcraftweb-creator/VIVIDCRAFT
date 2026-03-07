import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardWrapper from './DashboardWrapper';
import { createAuthPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Dashboard',
  description: 'View your JobHorizons dashboard, manage your projects, and track your freelance work.',
});

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    // This should be handled by middleware, but as a fallback
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You must be signed in to view this page.</p>
          <a href="/auth/signin" className="inline-flex items-center px-6 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium">
            Sign In
          </a>
        </div>
      </div>
    );
  }


  // Get full user data from Supabase
  const supabase = await createClient();
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

  // Check if user is ADMIN and redirect to admin panel
  const { data: userData } = await supabase
    .from('User')
    .select('role, isVerified, email')
    .eq('id', authUser?.id)
    .single();

  if (userData?.role === 'ADMIN') {
    redirect('/admin');
  }

  // If user doesn't exist in Supabase Auth, something is wrong
  if (userError || !authUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
          <h1 className="text-3xl font-bold text-white mb-4">Account Not Found</h1>
          <p className="text-gray-400 mb-6">Your account data is missing. Please contact support.</p>
          <a href="/auth/signin" className="inline-flex items-center px-6 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium">
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  // Check if user's email is verified from User table
  if (userData && !userData.isVerified) {
    // Import the client component for unverified users
    const { default: UnverifiedEmailPage } = await import('./UnverifiedEmailPage');
    return <UnverifiedEmailPage email={userData.email || authUser.email || ''} />;
  }

  return <DashboardWrapper session={session} />;
}
