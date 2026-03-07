'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  let errorMessage = 'An error occurred during authentication.';
  let suggestion = 'Please try again.';

  switch (error) {
    case 'Configuration':
      errorMessage = 'There is a problem with the server configuration.';
      suggestion = 'Please contact support or try again later.';
      break;
    case 'AccessDenied':
      errorMessage = 'Access was denied.';
      suggestion = 'You do not have permission to sign in.';
      break;
    case 'Verification':
      errorMessage = 'The verification link was invalid or has expired.';
      suggestion = 'Please request a new verification email.';
      break;
    case 'CredentialsSignin':
      errorMessage = 'Invalid credentials provided.';
      suggestion = 'Please check your email and password and try again.';
      break;
    default:
      errorMessage = 'An unexpected error occurred.';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-white/10 border border-white/20">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-300 mb-2">{errorMessage}</p>
            <p className="text-sm text-gray-400">{suggestion}</p>
          </div>
          
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                Try Again
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}