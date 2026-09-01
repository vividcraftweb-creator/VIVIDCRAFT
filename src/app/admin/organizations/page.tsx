import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import OrganizationsPageClient from './OrganizationsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Organizations',
  description: 'Manage organizations and business accounts.',
});

export default function OrganizationsPage() {
  try {
    return <OrganizationsPageClient />;
  } catch (error) {
    console.error('Error rendering OrganizationsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-slate-400">Loading organizations...</p>
      </div>
    );
  }
}
