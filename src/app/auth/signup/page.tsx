'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const SignUpContent = dynamic(() => import('./SignUpContent'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SignUpContent />
    </Suspense>
  );
}