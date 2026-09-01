import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SubscriptionsPageClient from './SubscriptionsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Subscriptions',
  description: 'Manage user subscriptions and billing.',
});

export default function SubscriptionsPage() {
  try {
    return <SubscriptionsPageClient />;
  } catch (error) {
    console.error('Error rendering SubscriptionsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-slate-400">Loading subscriptions and billing...</p>
      </div>
    );
  }
}
