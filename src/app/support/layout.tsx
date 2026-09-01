import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Support Center',
  description: 'Get help with Vivid Art. Find answers to common questions, contact support, and access resources for freelancers and clients.',
  keywords: [
    'support',
    'help center',
    'customer support',
    'Vivid Art help',
    'contact support',
    'FAQs',
    'user guides',
    'troubleshooting',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/support`,
});

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
