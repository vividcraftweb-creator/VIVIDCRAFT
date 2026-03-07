import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import JobsPageClient from './JobsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Job Management',
  description: 'Manage job postings, approvals, and moderation.',
});

export default function JobsPage() {
  return <JobsPageClient />;
}
