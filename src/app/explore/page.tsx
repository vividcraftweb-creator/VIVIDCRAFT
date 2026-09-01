export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import FreelancersPageClient from '@/app/freelancers/FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Explore Artists',
  description: 'Explore top creative talent, artists, and creators on Vivid Art.',
});

export default function ExplorePage() {
  return <FreelancersPageClient />;
}
