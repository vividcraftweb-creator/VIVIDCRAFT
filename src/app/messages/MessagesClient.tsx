'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MessagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to dashboard messages tab, preserving any query parameters
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    let redirectUrl = '/dashboard?tab=messages';
    if (userId) {
      redirectUrl += `&userId=${userId}`;
    }
    if (action) {
      redirectUrl += `&action=${action}`;
    }

    router.replace(redirectUrl);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Redirecting to dashboard...</p>
    </div>
  );
}

export default function MessagesClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <MessagesRedirect />
    </Suspense>
  );
}
