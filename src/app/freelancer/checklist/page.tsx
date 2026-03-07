import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import ChecklistPageClient from './ChecklistPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Getting Started Checklist',
  description: 'Complete your freelancer profile setup checklist.',
});

export default function ChecklistPage() {
  return <ChecklistPageClient />;
}
