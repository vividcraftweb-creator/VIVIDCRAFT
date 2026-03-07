'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { AppSession } from '@/types/session';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create a session-like object for backwards compatibility with next-auth
  const session: AppSession | null = user ? {
    user: {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'FREELANCER',
      name: user.user_metadata?.name,
      image: user.user_metadata?.avatar_url,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } : null;

  return {
    data: { session },
    status: loading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
    update: async () => {}, // Stub for compatibility
  };
}
