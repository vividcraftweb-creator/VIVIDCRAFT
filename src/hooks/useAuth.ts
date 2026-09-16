'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { AppSession } from '@/types/session';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // 1. Check local session immediately to avoid unauthenticated flicker
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        setLoading(false);
      }
    }).catch(() => {});

    // 2. Validate current user with Supabase
    supabase.auth.getUser().then(({ data: { user: currentUser }, error }) => {
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('user not found') ||
          msg.includes('invalid claim') ||
          msg.includes('jwt') ||
          error.status === 401 ||
          error.status === 403
        ) {
          setUser(null);
          setLoading(false);
          return;
        }
      }
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setProfileRole(null);
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Hydrate user profile role directly from database to avoid stale or default role locks
  useEffect(() => {
    if (!user?.id) {
      setProfileRole(null);
      return;
    }

    let isMounted = true;
    const fetchRole = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted && data?.role) {
          setProfileRole(data.role);
        }
      } catch {
        // ignore error
      }
    };

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Create a memoized session-like object for backwards compatibility with next-auth
  const session: AppSession | null = useMemo(() => {
    if (!user) return null;
    const rawRole = (profileRole || user.user_metadata?.role || user.app_metadata?.role || '').toString().trim().toUpperCase();
    const resolvedRole = rawRole === 'ADMIN'
      ? 'ADMIN'
      : (rawRole === 'CLIENT' || rawRole === 'BUYER' || rawRole === 'CUSTOMER')
        ? 'CLIENT'
        : (rawRole === 'ARTIST' || rawRole === 'FREELANCER' || rawRole === 'CREATOR')
          ? 'FREELANCER'
          : 'CLIENT';

    return {
      user: {
        id: user.id,
        email: user.email,
        role: resolvedRole,
        name: user.user_metadata?.name,
        image: user.user_metadata?.avatar_url,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }, [user, profileRole]);

  const authData = useMemo(() => ({ session }), [session]);

  return {
    data: authData,
    status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
    update: async () => {}, // Stub for compatibility
  };
}

export const useUser = useAuth;
