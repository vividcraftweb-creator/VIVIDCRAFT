import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import BillingPageClient from '@/app/billing/BillingPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'My Orders & Purchases',
  description: 'View and manage your orders, invoices, and purchase history.',
});

export default function OrdersPage() {
  return <BillingPageClient />;
}

