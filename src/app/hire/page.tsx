import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import HirePageClient from './HirePageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Hire Top Artists',
  description: 'Hire verified artist talent for your projects. Browse top-rated professionals, review portfolios, and find the perfect match for your needs.',
  keywords: ['hire artists', 'find talent', 'hire artists', 'artist professionals'],
});

export default function HirePage() {
  return <HirePageClient />;
}
