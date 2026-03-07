import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import MessagesPageClient from './MessagesPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Messages',
  description: 'Monitor and moderate platform messages.',
});

export default function MessagesPage() {
  return <MessagesPageClient />;
}
