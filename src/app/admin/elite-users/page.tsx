import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import EliteUsersPageClient from './EliteUsersPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Elite Users',
  description: 'Manage elite and premium users.',
});

export default function EliteUsersPage() {
  return <EliteUsersPageClient />;
}
