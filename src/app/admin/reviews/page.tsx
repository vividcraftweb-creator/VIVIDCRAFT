import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminReviewsTab from '@/components/admin/AdminReviewsTab';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Reviews Management',
  description: 'Manage client reviews, ratings, testimonials, and active status.',
});

export default function AdminReviewsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reviews Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage curated client reviews and ratings displayed in the Yellow Section on the homepage.
        </p>
      </div>

      <AdminReviewsTab />
    </div>
  );
}
