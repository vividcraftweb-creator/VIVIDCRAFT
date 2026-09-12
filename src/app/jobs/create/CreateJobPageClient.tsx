'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import CreateJobWizard from '@/components/jobs/CreateJobWizard';

export default function CreateJobPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery(undefined, {
    enabled: !!session?.session?.user,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin?callbackUrl=/jobs/create');
      return;
    }
    if (session.session?.user?.role !== 'CLIENT') {
      router.push('/jobs');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="container mx-auto p-4 text-center">Loading...</div>;
  }

  if (!session || session.session?.user?.role !== 'CLIENT') {
    return null;
  }

  return <CreateJobWizard />;
}
