import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Terms of Service',
  description: 'Review JobHorizons terms of service. Understand the rules, guidelines, and legal agreements for using our freelance marketplace platform.',
  keywords: [
    'terms of service',
    'user agreement',
    'terms and conditions',
    'JobHorizons terms',
    'platform guidelines',
    'legal terms',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/terms',
  noIndex: true,
});

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
