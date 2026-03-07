import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Cookie Policy',
  description: 'Learn about how JobHorizons uses cookies to improve your experience, analyze traffic, and personalize content on our platform.',
  keywords: [
    'cookie policy',
    'cookies',
    'tracking',
    'JobHorizons cookies',
    'web cookies',
    'privacy preferences',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/cookies',
  noIndex: true,
});

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
