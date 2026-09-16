'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { DashboardSkeleton } from '@/components/dashboard/DashboardLayout';

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

  return <DashboardSkeleton />;
}
