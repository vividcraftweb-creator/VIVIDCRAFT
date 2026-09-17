import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AdminBannersTab from '@/components/admin/AdminBannersTab';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Offers & Banners Management',
  description: 'Manage homepage advertising banners and unique offer codes connected to WhatsApp.',
});

export default function AdminBannersPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Offers &amp; Banners</h1>
        <p className="text-sm text-slate-400 mt-1">
          Create, edit, and control promotional hero banners with automatic Offer Code generation and direct WhatsApp claims.
        </p>
      </div>

      <AdminBannersTab />
    </div>
  );
}
