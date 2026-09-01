import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import JobsPageClient from './JobsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Job Management',
  description: 'Manage job postings, approvals, and moderation.',
});

export default function JobsPage() {
  try {
    return <JobsPageClient />;
  } catch (error) {
    console.error('Error rendering JobsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Job Moderation</h1>
        <p className="text-slate-400">Loading jobs and moderation queue...</p>
      </div>
    );
  }
}
