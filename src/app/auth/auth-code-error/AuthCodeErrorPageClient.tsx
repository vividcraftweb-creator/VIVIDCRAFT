'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient();

        // 1. Check if user already has an active session
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setStatus('success');
          setMessage('Account authenticated successfully! Redirecting...');
          router.replace('/dashboard');
          return;
        }

        // 2. Check if we have code in URL search params
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session) {
            setStatus('success');
            setMessage('Signed in successfully! Redirecting...');
            router.replace('/dashboard');
            return;
          }
        }

        // 3. Check if we have auth tokens in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Set the session with the tokens from URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setMessage('Failed to verify email. Please try again.');
            return;
          }

          if (data.session) {
            setStatus('success');
            setMessage('Email verified successfully!');

            // Redirect to dashboard after 1 second
            setTimeout(() => {
              router.push('/dashboard');
            }, 1000);
            return;
          }
        }

        // No valid tokens or session found, show error
        setStatus('error');
        setMessage('Invalid verification link or session expired. Please request a new verification email or sign in again.');
      } catch (error) {
        setMessage('Something went wrong. Please try again.');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-white mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-semibold text-white mb-2">
                Verifying your email...
              </h1>
              <p className="text-gray-400">Please wait a moment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-white mb-2">
                Email verified successfully!
              </h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-400">
                Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="h-16 w-16 text-red-500 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <div className="space-y-3">
                <Button asChild className="w-full bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-lg transition-colors">
                  <Link href="/auth/verify-email">
                    Request New Verification Email
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  <Link href="/auth/signin">
                    Back to Sign In
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
