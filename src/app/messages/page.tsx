import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import MessagesClient from './MessagesClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Messages',
  description: 'View and manage your messages on JobHorizons.',
});

export default function MessagesPage() {
  return <MessagesClient />;
}
