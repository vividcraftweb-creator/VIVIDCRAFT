import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import MessagesPageClient from './MessagesPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Messages',
  description: 'Monitor and moderate platform messages.',
});

export default function MessagesPage() {
  try {
    return <MessagesPageClient />;
  } catch (error) {
    console.error('Error rendering MessagesPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Messages Moderation</h1>
        <p className="text-slate-400">Loading messages...</p>
      </div>
    );
  }
}
