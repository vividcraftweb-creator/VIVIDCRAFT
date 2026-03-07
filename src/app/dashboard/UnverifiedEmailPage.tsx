'use client';

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface UnverifiedEmailPageProps {
  email: string;
}

export default function UnverifiedEmailPage({ email }: UnverifiedEmailPageProps) {
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const maxResends = 3;

  const handleResendEmail = async () => {
    if (resendCount >= maxResends) {
      toast.error('Maximum resend attempts reached', {
        description: 'Please contact support if you need further assistance.'
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendCount(prev => prev + 1);
        toast.success('Verification email sent!', {
          description: 'Please check your inbox and spam folder.'
        });
      } else {
        const data = await response.json();
        toast.error('Failed to resend email', {
          description: data.message || 'Please try again later.'
        });
      }
    } catch (error) {
    } finally {
      setIsResending(false);
    }
  };

  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-white mb-4">Verify your email</h1>

            <p className="text-gray-400 mb-2">
              We&apos;ve sent a verification email to
            </p>
            <p className="text-white font-medium mb-6">{email}</p>

            <p className="text-gray-400 mb-8">
              Please check your inbox and click the verification link to access your dashboard.
            </p>

            <p className="text-sm text-gray-500 mb-6">
              Didn&apos;t receive the email? Check your spam folder.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleResendEmail}
                disabled={isResending || resendCount >= maxResends}
                className="w-full h-11 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors"
              >
                {isResending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-900 rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  'Resend verification email'
                )}
              </Button>

              {resendCount >= maxResends && (
                <p className="text-sm text-red-400">
                  Maximum resend attempts reached. Please contact support.
                </p>
              )}

              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleSignOut}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
