import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import FraudReviewPageClient from './FraudReviewPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Fraud Review',
  description: 'Review and manage fraud detection alerts.',
});

export default function FraudReviewPage() {
  return <FraudReviewPageClient />;
}
