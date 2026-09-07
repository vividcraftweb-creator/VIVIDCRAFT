import { Suspense } from 'react';
import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import ErrorPageClient from './ErrorPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Authentication Error',
  description: 'An error occurred during authentication.',
});

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ErrorPageClient />
    </Suspense>
  );
}
