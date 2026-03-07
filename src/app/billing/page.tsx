import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import BillingPageClient from './BillingPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Billing & Invoices',
  description: 'Manage your billing, invoices, and payment history.',
});

export default function BillingPage() {
  return <BillingPageClient />;
}
