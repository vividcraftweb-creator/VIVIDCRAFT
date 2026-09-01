import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AnalyticsPageClient from './AnalyticsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Analytics',
  description: 'View platform analytics and insights.',
});

export default function AnalyticsPage() {
  try {
    return <AnalyticsPageClient />;
  } catch (error) {
    console.error('Error rendering AnalyticsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-slate-400">Loading analytics and insights...</p>
      </div>
    );
  }
}
