'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        // If no token but email is provided, show pending verification message
        if (email) {
          setStatus('pending');
          setMessage(`Please check your email (${email}) and click the verification link.`);
          return;
        }
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        // Step 1: Verify email and get auto-login token
        const verifyRes = await fetch(`/api/auth/verify-email?token=${token}`);
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
          setStatus('error');
          setMessage(verifyData.message || 'Verification failed');
          return;
        }

        // Step 2: Auto-login with the token
        if (verifyData.autoLoginToken) {
          const loginRes = await fetch('/api/auth/auto-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ autoLoginToken: verifyData.autoLoginToken })
          });

          const loginData = await loginRes.json();

          if (loginRes.ok) {
            setStatus('success');
            setMessage('Email verified! Signing you in...');
            // Redirect to dashboard after 1 second
            setTimeout(() => {
              router.push('/dashboard');
              router.refresh();
            }, 1000);
          } else {
            // Auto-login failed, but email is verified
            setStatus('success');
            setMessage('Email verified! Please sign in to continue.');
            setTimeout(() => {
              router.push('/auth/signin?verified=true');
            }, 2000);
          }
        } else {
          // No auto-login token (user already verified)
          setStatus('success');
          setMessage(verifyData.message);
          setTimeout(() => {
            router.push('/auth/signin?verified=true');
          }, 2000);
        }
      } catch (error) {
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router, email]);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!email || resendLoading || resendCooldown > 0) return;

    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Email sent!', {
          description: data.message
        });
        setResendCooldown(60); // 60 second cooldown
      } else if (res.status === 429) {
        toast.error('Too many requests', {
          description: data.message
        });
        // Extract remaining seconds from message if available
        const match = data.message.match(/(\d+) seconds/);
        if (match) {
          setResendCooldown(parseInt(match[1]));
        }
      } else {
        toast.error('Failed to send email', {
          description: data.message
        });
      }
    } catch (error) {
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 shadow-xl text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-semibold text-foreground mb-2">Verifying your email...</h1>
              <p className="text-muted-foreground">Please wait a moment</p>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="h-16 w-16 text-yellow-500 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Email Verification Required</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-200">Check your spam folder if you don&apos;t see the email.</p>
              </div>

              {email && (
                <div className="mb-4">
                  <Button
                    onClick={handleResendEmail}
                    disabled={resendLoading || resendCooldown > 0}
                    className="w-full glass-button bg-blue-600 hover:from-blue-700 hover:to-blue-600 mb-3"
                  >
                    {resendLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend in {resendCooldown}s
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                </div>
              )}

              <Link href="/auth/signin">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-foreground mb-2">Email verified!</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirecting...</span>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-semibold text-foreground mb-2">Verification failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link href="/auth/signin">
                <Button className="w-full glass-button bg-primary">
                  Back to Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
