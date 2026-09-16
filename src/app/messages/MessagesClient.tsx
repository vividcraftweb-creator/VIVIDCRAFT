'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function MessagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userId = searchParams.get('userId');
    const recipientId = searchParams.get('recipientId');
    const action = searchParams.get('action');

    let redirectUrl = '/dashboard?tab=messages';
    const targetRecipient = recipientId || userId;
    if (targetRecipient) {
      redirectUrl += `&recipientId=${targetRecipient}&userId=${targetRecipient}`;
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
