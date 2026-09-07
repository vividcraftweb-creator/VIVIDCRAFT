import { Suspense } from 'react';
import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import MessagesClient from './MessagesClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Messages',
  description: 'View and manage your messages on JobHorizons.',
});

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <MessagesClient />
    </Suspense>
  );
}
