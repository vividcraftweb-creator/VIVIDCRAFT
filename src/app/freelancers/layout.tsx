import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Browse Artists',
  description: 'Browse and hire verified artists from around the world. Find skilled creative professionals for your projects on Vivid Art. View portfolios, styles, and ratings of top talent.',
  keywords: [
    'hire artists',
    'find artists',
    'artist talent',
    'remote artists',
    'verified artists',
    'creative professionals',
    'hire artists',
    'artist profiles',
    'top artists',
    'skilled artists',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers`,
  noIndex: true,
});

export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
