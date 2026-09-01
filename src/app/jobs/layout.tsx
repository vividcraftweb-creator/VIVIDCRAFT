import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Browse Remote Jobs',
  description: 'Find high-quality freelance jobs and remote work opportunities on Vivid Art. Browse verified job postings, apply with confidence, and start working from anywhere. New freelance gigs added daily.',
  keywords: [
    'freelance jobs',
    'remote work',
    'work from home jobs',
    'online jobs',
    'freelance gigs',
    'remote freelance work',
    'freelance opportunities',
    'remote job board',
    'freelance projects',
    'online work',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/jobs`,
});

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
