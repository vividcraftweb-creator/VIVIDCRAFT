import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'API Documentation',
  description: 'Complete API reference for Vivid Art. Programmatically manage jobs, analytics, and more. Available for Business and Enterprise plans.',
  keywords: [
    'API documentation',
    'Vivid Art API',
    'developer docs',
    'API integration',
    'REST API',
    'webhooks',
    'API reference',
    'developer guide',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/docs/api`,
});

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
