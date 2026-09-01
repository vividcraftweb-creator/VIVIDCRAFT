export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import FreelancersPageClient from '@/app/freelancers/FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creators for your projects on Vivid Art.',
});

export default function DiscoverPage() {
  return <FreelancersPageClient />;
}
