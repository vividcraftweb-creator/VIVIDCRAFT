import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'About Us',
  description: 'Learn about Cinnamon Gallery mission to connect talented artists and creators with quality opportunities. Discover our story, values, and commitment to the art community.',
  keywords: [
    'about Cinnamon Gallery',
    'freelance marketplace',
    'remote work platform',
    'company mission',
    'freelance community',
    'about us',
    'remote work future',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/about`,
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
