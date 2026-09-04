'use client';

import { ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

interface SessionProviderProps {
  children: ReactNode;
  session?: unknown;
}

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/messages',
  '/profile',
  '/profile-editor',
  '/settings',
  '/jobs/create',
  '/proposals',
  '/verification',
  '/billing',
  '/notifications',
  '/admin',
  '/support',
  '/contracts',
  '/invoices',
  '/orders',
];

export default function SessionProvider({ children }: SessionProviderProps) {
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    const clearAllClientAuth = async (shouldRedirect = false) => {
      try {
        await supabase.auth.signOut();
      } catch {}

      // Clear localStorage auth items
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
      } catch {}

      // Clear sessionStorage
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.clear();
        }
      } catch {}

      // Clear cookies
      try {
        if (typeof document !== 'undefined') {
          document.cookie.split(';').forEach((c) => {
            const name = c.split('=')[0].trim();
            if (
              name.startsWith('sb-') ||
              name.includes('auth-token') ||
              name.includes('supabase') ||
              name.includes('session')
            ) {
              document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
            }
          });
        }
      } catch {}

      if (shouldRedirect && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const isProtected = PROTECTED_PREFIXES.some((prefix) => currentPath.startsWith(prefix));
        if (isProtected) {
          window.location.href = `/auth/login?logged_out=1&callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
    };

    // Check current authenticated user session in Supabase
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isMissingOrInvalid =
          msg.includes('user not found') ||
          msg.includes('user_not_found') ||
          msg.includes('invalid claim') ||
          msg.includes('jwt') ||
          msg.includes('token is expired') ||
          msg.includes('sub claim') ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404;

        if (isMissingOrInvalid) {
          console.warn('[SessionProvider] User not found or session invalid in Supabase Auth. Forcing logout...');
          clearAllClientAuth(true);
        }
      }
    }).catch(() => {});

    // Listen for client-side auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED'))) {
        clearAllClientAuth(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  return <>{children}</>;
}