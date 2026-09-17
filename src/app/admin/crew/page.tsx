import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminCrewTab from '@/components/admin/AdminCrewTab';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Crew Management',
  description: 'Manage curation crew members, bio details, stories, and featured status.',
});

export default function AdminCrewPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Crew Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage curation crew members displayed in the homepage horizontal marquee and the featured story showcase.
        </p>
      </div>

      <AdminCrewTab />
    </div>
  );
}
