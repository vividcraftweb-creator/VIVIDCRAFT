'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isResending, setIsResending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success('Verification email sent!', {
          description: 'Please check your inbox.'
        });
      } else {
        const errorData = await res.json();
        toast.error('Failed to resend email', {
          description: errorData.message || 'Please try again.'
        });
      }
    } catch (error) {
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className={`w-full max-w-md transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/jobhorizons-logo.webp"
              alt="JobHorizons"
              width={180}
              height={36}
              priority
            />
          </Link>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-2xl p-8 shadow-xl text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground mb-3">Verify your email</h1>

          {/* Description */}
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a verification email to{' '}
            <span className="text-foreground font-medium">{email || 'your email'}</span>. Please check your inbox and click the verification link to access your dashboard.
          </p>

          {/* Help text */}
          <p className="text-sm text-muted-foreground mb-6">
            Didn&apos;t receive the email? Check your spam folder.
          </p>

          {/* Resend Button */}
          <Button
            onClick={handleResendEmail}
            disabled={isResending}
            variant="outline"
            className="w-full glass-button"
          >
            {isResending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resend verification email
              </>
            )}
          </Button>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <Link
            href="/auth/signin"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
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
