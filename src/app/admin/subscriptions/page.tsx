import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SubscriptionsPageClient from './SubscriptionsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Subscriptions',
  description: 'Manage user subscriptions and billing.',
});

export default function SubscriptionsPage() {
  return <SubscriptionsPageClient />;
}
