import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'About Us',
  description: 'Learn about JobHorizons mission to connect talented freelancers with quality remote opportunities. Discover our story, values, and commitment to the future of work.',
  keywords: [
    'about JobHorizons',
    'freelance marketplace',
    'remote work platform',
    'company mission',
    'freelance community',
    'about us',
    'remote work future',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/about',
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
