import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import FreelancersPage from '@/app/freelancers/page';
import { createAuthPageMetadata } from '@/lib/seo-metadata';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Browse Artists',
  description: 'Browse and hire verified artists for your projects.',
});

export default async function BrowseFreelancersPage() {
  const session = await auth();

  // Server-side role check - only CLIENT role can access
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/browse-freelancers');
  }

  if (session.user.role !== 'CLIENT') {
    // Redirect non-clients to the public freelancers page or show error
    redirect('/freelancers');
  }

  // If user is a CLIENT, show the freelancers page
  return <FreelancersPage />;
}
