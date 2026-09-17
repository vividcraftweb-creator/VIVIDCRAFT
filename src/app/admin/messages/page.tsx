import { Metadata } from 'next';
import { Suspense } from 'react';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import MessagesPageClient from './MessagesPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Messages & Chat Monitoring',
  description: 'Monitor and moderate platform messages with Chat Code lookup.',
});

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-white space-y-4">
          <h1 className="text-2xl font-bold">Messages Moderation</h1>
          <p className="text-slate-400">Loading messages &amp; chat records...</p>
        </div>
      }
    >
      <MessagesPageClient />
    </Suspense>
  );
}
