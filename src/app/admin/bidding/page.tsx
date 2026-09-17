import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminAuctionsTab from '@/components/admin/AdminAuctionsTab';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Bidding & Auctions Management',
  description: 'Manage live artworks auctions, starting bids, current bids, deadlines, and status.',
});

export default function AdminBiddingPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <AdminAuctionsTab />
    </div>
  );
}
