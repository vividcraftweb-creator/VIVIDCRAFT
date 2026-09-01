import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SupportPageClient from './SupportPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Support Tickets',
  description: 'Manage support tickets and user inquiries.',
});

export default function SupportPage() {
  try {
    return <SupportPageClient />;
  } catch (error) {
    console.error('Error rendering SupportPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-slate-400">Loading support queue...</p>
      </div>
    );
  }
}
