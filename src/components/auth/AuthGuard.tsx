'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardSkeleton } from '@/components/dashboard/DashboardLayout';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  allowedRoles,
  redirectTo = '/auth/login?callbackUrl=/dashboard',
}: AuthGuardProps) {
  const router = useRouter();
  const [isResolved, setIsResolved] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function checkAuthAndRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user;

        if (!currentUser) {
          if (isMounted) {
            router.replace(redirectTo);
          }
          return;
        }

        if (isMounted) {
          setUser(currentUser);
        }

        // Fetch profile role from Supabase profiles
        let resolvedRole = currentUser.user_metadata?.role || '';
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profile?.role) {
            resolvedRole = profile.role;
          }
        } catch (profileErr) {
          console.warn('[AuthGuard] Profile role fetch warning:', profileErr);
        }

        const normalizedRole = resolvedRole.toString().trim().toUpperCase();

        if (isMounted) {
          setUserRole(normalizedRole);

          // Check role restrictions if provided
          if (allowedRoles && allowedRoles.length > 0) {
            const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(normalizedRole);
            if (!hasRole) {
              if (normalizedRole === 'ADMIN') {
                router.replace('/admin');
                return;
              }
              router.replace('/dashboard');
              return;
            }
          }

          setIsResolved(true);
        }
      } catch (err) {
        console.warn('[AuthGuard] Auth check error:', err);
        if (isMounted) {
          router.replace(redirectTo);
        }
      }
    }

    checkAuthAndRole();

    return () => {
      isMounted = false;
    };
  }, [router, redirectTo, allowedRoles]);

  // Do NOT render child layout elements until user and profile state are fully resolved
  if (!isResolved || !user) {
    return <DashboardSkeleton />;
  }

  return <>{children}</>;
}
