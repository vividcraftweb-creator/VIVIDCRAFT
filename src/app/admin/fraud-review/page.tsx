import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import FraudReviewPageClient from './FraudReviewPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Fraud Review',
  description: 'Review and manage fraud detection alerts.',
});

export default function FraudReviewPage() {
  try {
    return <FraudReviewPageClient />;
  } catch (error) {
    console.error('Error rendering FraudReviewPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Fraud Review</h1>
        <p className="text-slate-400">Loading fraud alerts and security queue...</p>
      </div>
    );
  }
}
