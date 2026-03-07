'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import CreateJobWizard from '@/components/jobs/CreateJobWizard';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CreateJobPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery(undefined, {
    enabled: !!session?.session?.user,
  });
  const { data: verificationStatus } = trpc.verifications.checkVerificationStatus.useQuery(undefined, {
    enabled: !!session?.session?.user && session.session?.user?.role === 'CLIENT',
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

  // Show verification required message based on status
  if (verificationStatus && !verificationStatus.isVerified) {
    let title = 'Verification Required';
    let description = verificationStatus.message;
    let buttonText = 'Complete Verification';

    if (verificationStatus.status === 'pending') {
      title = 'Verification Under Review';
      description = 'Your verification documents are currently being reviewed. You\'ll be able to post jobs once approved (usually within 24-48 hours).';
      buttonText = 'View Verification Status';
    } else if (verificationStatus.status === 'rejected') {
      title = 'Verification Documents Rejected';
      description = 'Some of your verification documents were rejected. Please review the feedback and re-submit corrected documents.';
      buttonText = 'Fix Verification Issues';
    } else if (verificationStatus.status === 'incomplete') {
      title = 'Complete Your Verification';
      description = `Please upload the following required documents: ${verificationStatus.missingDocs.join(', ').replace(/_/g, ' ')}`;
      buttonText = 'Upload Documents';
    }

    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float"
               style={{ animationDelay: '0s' }} />
          <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-chart-1/10 blur-3xl animate-float"
               style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 glass-card p-8 rounded-2xl border-destructive/30 max-w-md">
          <div className="text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground mb-6">
              {description}
            </p>
            <Link href="/dashboard?tab=verification">
              <Button className="glass-button w-full">
                {buttonText}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CreateJobWizard />;
}
