export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import GalleryPageClient from './GalleryPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Art Gallery & Portfolios',
  description:
    'Explore curated artworks ranked by popularity, likes, and ratings from verified artists and creators on Vivid Art.',
});

export default function GalleryPage() {
  return <GalleryPageClient />;
}
