import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'Read Cinnamon Gallery privacy policy to understand how we collect, use, and protect your personal information. Your privacy is our priority.',
  keywords: [
    'privacy policy',
    'data protection',
    'user privacy',
    'Cinnamon Gallery privacy',
    'personal data',
    'GDPR compliance',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/privacy`,
  noIndex: true,
});

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
