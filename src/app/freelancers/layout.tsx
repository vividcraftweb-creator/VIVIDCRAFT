import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Browse Freelancers',
  description: 'Browse and hire verified freelancers from around the world. Find skilled professionals for your projects on JobHorizons. View portfolios, skills, and ratings of top remote talent.',
  keywords: [
    'hire freelancers',
    'find freelancers',
    'freelance talent',
    'remote freelancers',
    'verified freelancers',
    'freelance professionals',
    'hire remote workers',
    'freelancer profiles',
    'top freelancers',
    'skilled freelancers',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers',
  noIndex: true,
});

export default function FreelancersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
