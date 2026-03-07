import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import CreateJobPageClient from './CreateJobPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Post a Job',
  description: 'Create a new job posting to find qualified freelancers.',
});

export default function CreateJobPage() {
  return <CreateJobPageClient />;
}
