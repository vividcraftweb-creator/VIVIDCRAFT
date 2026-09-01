'use client';

import dynamic from 'next/dynamic';

const SignUpContent = dynamic(() => import('./SignUpContent'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950" />,
});

export default function SignUpPage() {
  return <SignUpContent />;
}