import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import UsersPageClient from './UsersPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'User Management',
  description: 'Manage users, roles, and permissions.',
});

export default function UsersPage() {
  return <UsersPageClient />;
}
