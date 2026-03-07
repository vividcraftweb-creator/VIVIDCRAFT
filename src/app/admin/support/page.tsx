import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SupportPageClient from './SupportPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Support Tickets',
  description: 'Manage support tickets and user inquiries.',
});

export default function SupportPage() {
  return <SupportPageClient />;
}
