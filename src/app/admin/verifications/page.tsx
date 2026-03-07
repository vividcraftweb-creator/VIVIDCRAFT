import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import VerificationsPageClient from './VerificationsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Verifications',
  description: 'Review and manage user verification requests.',
});

export default function VerificationsPage() {
  return <VerificationsPageClient />;
}
