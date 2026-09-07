'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardSessionHydrator() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function checkClientSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          router.refresh();
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          router.refresh();
          return;
        }
      } catch (err) {
        console.warn('[DashboardSessionHydrator] Client auth check warning:', err);
      }
    }

    checkClientSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
        session?.user &&
        isMounted
      ) {
        router.refresh();
      }
    });

    const timer = setTimeout(() => {
      if (isMounted) {
        setTimedOut(true);
        router.replace('/auth/login?callbackUrl=/dashboard');
      }
    }, 4000);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-300 text-sm font-medium tracking-wide">
        {timedOut ? 'Redirecting to sign in...' : 'Loading your dashboard...'}
      </p>
      <p className="text-slate-500 text-xs mt-1">Synchronizing session</p>
    </div>
  );
}
