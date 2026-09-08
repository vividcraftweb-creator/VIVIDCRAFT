import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import FraudReviewPageClient from '../fraud-review/FraudReviewPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Fraud Detection',
  description: 'Review and manage fraud detection alerts and artist verifications.',
});

export default function FraudDetectionPage() {
  return <FraudReviewPageClient />;
}
