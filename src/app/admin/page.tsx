import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Admin Dashboard',
  description: 'JobHorizons admin dashboard - manage users, jobs, and platform settings.',
});

export default function AdminPage() {
  return <AdminDashboard />;
}
