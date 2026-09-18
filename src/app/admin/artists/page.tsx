import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminArtistShowcaseTab from '@/components/admin/AdminArtistShowcaseTab';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Artist Showcase & Display Order',
  description: 'Manage artist showcase visibility and display order for the landing page.',
});

export default function AdminArtistsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Artist Showcase Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Control which artists appear in the Top Artists &amp; Creators section on the homepage, and assign their display order.
        </p>
      </div>

      <AdminArtistShowcaseTab />
    </div>
  );
}
