import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import OrganizationsPageClient from './OrganizationsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Organizations',
  description: 'Manage organizations and business accounts.',
});

export default function OrganizationsPage() {
  return <OrganizationsPageClient />;
}
