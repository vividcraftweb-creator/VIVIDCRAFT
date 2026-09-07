'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { createClient, cleanBloatedAuthCookies } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';

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
  const router = useRouter();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const cleanClientStorage = (shouldRedirect = false) => {
      // Clear localStorage explicitly
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.clear();
        }
      } catch {}

      // Clear sessionStorage explicitly
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
          window.location.href = '/login';
        }
      }
    };

    // Check current authenticated user session in Supabase
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isUserDeleted =
          msg.includes('user not found') ||
          msg.includes('user_not_found');

        if (isUserDeleted && !isSigningOutRef.current) {
          isSigningOutRef.current = true;
          console.warn('[SessionProvider] User not found in Supabase Auth. Forcing logout...');
          supabase.auth.signOut({ scope: 'global' }).catch(() => {}).finally(() => {
            cleanClientStorage(true);
          });
        }
      } else if (user) {
        // Sanitize user_metadata to purge any previously stored base64 images or bloated strings
        const meta = user.user_metadata || {};
        let needsSanitization = false;
        const sanitizedUpdates: Record<string, any> = {};

        for (const [key, value] of Object.entries(meta)) {
          if (typeof value === 'string' && (value.startsWith('data:') || value.length > 800)) {
            sanitizedUpdates[key] = null;
            needsSanitization = true;
          }
        }

        if (needsSanitization) {
          console.warn('[SessionProvider] Sanitizing bloated user_metadata payload to reduce cookie headers');
          supabase.auth.updateUser({ data: sanitizedUpdates }).catch(() => {});
        }
      }
    }).catch(() => {});

    // Listen for client-side auth state changes (strictly avoiding recursive signOut calls)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        isSigningOutRef.current = false;
        if (session?.user) {
          router.refresh();
        }
      } else if (event === 'SIGNED_OUT') {
        if (isSigningOutRef.current) return;
        isSigningOutRef.current = true;
        cleanClientStorage(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  return <>{children}</>;
}