import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import EliteUsersPageClient from './EliteUsersPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Elite Users',
  description: 'Manage elite and premium users.',
});

export default function EliteUsersPage() {
  try {
    return <EliteUsersPageClient />;
  } catch (error) {
    console.error('Error rendering EliteUsersPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Elite Users</h1>
        <p className="text-slate-400">Loading elite users...</p>
      </div>
    );
  }
}
