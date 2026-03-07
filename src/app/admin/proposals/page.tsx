import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import ProposalsPageClient from './ProposalsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Proposals',
  description: 'Manage proposals and applications.',
});

export default function ProposalsPage() {
  return <ProposalsPageClient />;
}
