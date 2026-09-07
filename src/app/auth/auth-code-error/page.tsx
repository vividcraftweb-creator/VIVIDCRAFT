import { Suspense } from 'react';
import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import AuthCodeErrorPageClient from './AuthCodeErrorPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Verification Error',
  description: 'An error occurred during email verification.',
});

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <AuthCodeErrorPageClient />
    </Suspense>
  );
}
