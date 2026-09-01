import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import ProposalsPageClient from './ProposalsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Proposals',
  description: 'Manage proposals and applications.',
});

export default function ProposalsPage() {
  try {
    return <ProposalsPageClient />;
  } catch (error) {
    console.error('Error rendering ProposalsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Proposals</h1>
        <p className="text-slate-400">Loading proposals...</p>
      </div>
    );
  }
}
