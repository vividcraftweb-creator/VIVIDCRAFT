import { Metadata } from 'next';
import { createSettingsPageMetadata } from '@/lib/seo-metadata';
import WebhooksPageClient from './WebhooksPageClient';

export const metadata: Metadata = createSettingsPageMetadata({
  title: 'Webhooks',
  description: 'Configure webhooks and event notifications.',
});

export default function WebhooksPage() {
  return <WebhooksPageClient />;
}
