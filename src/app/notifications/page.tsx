import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import NotificationsClient from './NotificationsClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Notifications',
  description: 'View and manage your notifications and account activity.',
});

export default function NotificationsPage() {
  return <NotificationsClient />;
}
