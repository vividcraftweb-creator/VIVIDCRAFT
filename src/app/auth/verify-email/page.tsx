'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isGoogle = user.app_metadata?.provider === 'google' ||
            user.app_metadata?.providers?.includes('google') ||
            Boolean(user.email_confirmed_at);

          if (isGoogle || user.email_confirmed_at) {
            router.replace('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.warn('verify-email auth check notice:', err);
      } finally {
        setChecking(false);
      }
    }

    checkAuth();
  }, [router]);

  return (
    <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">
          Email Verified
        </h1>
        <p className="text-sm text-slate-400">
          {emailParam ? `Your account (${emailParam}) is active.` : 'Your account is active and verified.'}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          asChild
          className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          <Link href="/dashboard" className="flex items-center justify-center gap-2">
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full h-11 border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
        >
          <Link href="/">
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-pulse">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 mx-auto" />
          <div className="h-6 w-36 bg-slate-800 rounded mx-auto" />
          <div className="h-4 w-48 bg-slate-800 rounded mx-auto" />
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
