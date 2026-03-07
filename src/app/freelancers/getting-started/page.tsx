import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import GettingStartedPageClient from './GettingStartedPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Get Started as a Freelancer',
  description: 'Learn how to get started on JobHorizons as a freelancer. Complete your profile, get verified, and start winning projects.',
  keywords: ['freelancer guide', 'getting started', 'freelance tips', 'become a freelancer'],
});

export default function GettingStartedPage() {
  return <GettingStartedPageClient />;
}
