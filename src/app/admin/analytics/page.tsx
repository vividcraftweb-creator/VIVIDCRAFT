import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import AnalyticsPageClient from './AnalyticsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Analytics',
  description: 'View platform analytics and insights.',
});

export default function AnalyticsPage() {
  return <AnalyticsPageClient />;
}
