import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import VerificationsPageClient from './VerificationsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Verifications',
  description: 'Review and manage user verification requests.',
});

export default function VerificationsPage() {
  try {
    return <VerificationsPageClient />;
  } catch (error) {
    console.error('Error rendering VerificationsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Verifications</h1>
        <p className="text-slate-400">Loading verification requests...</p>
      </div>
    );
  }
}
