import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Business Features',
  description: 'Discover JobHorizons enterprise features for businesses. Team collaboration, advanced hiring tools, project management, and dedicated support for your organization.',
  keywords: [
    'business features',
    'enterprise hiring',
    'team collaboration',
    'business plans',
    'JobHorizons for business',
    'corporate hiring platform',
    'freelance management',
    'enterprise solutions',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/business-features',
});

export default function BusinessFeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
