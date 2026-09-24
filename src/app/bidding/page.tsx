export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import BiddingPageClient from './BiddingPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Live Art Bidding & Auctions',
  description:
    'Discover exceptional original artworks available for live bidding and auction from verified artists and creators on Cinnamon Gallery.',
});

export default function BiddingPage() {
  return <BiddingPageClient />;
}
