'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.href = '/login';
    }
  };

  return <Button onClick={handleSignOut}>Sign Out</Button>;
}
