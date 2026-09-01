import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Admin Dashboard',
  description: 'Vivid Art admin dashboard - manage users, jobs, and platform settings.',
});

export default function AdminPage() {
  try {
    return <AdminDashboard />;
  } catch (error) {
    console.error('Error rendering AdminDashboard:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-400">Loading system overview...</p>
      </div>
    );
  }
}
