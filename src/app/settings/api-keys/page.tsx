import { Metadata } from 'next';
import { createSettingsPageMetadata } from '@/lib/seo-metadata';
import ApiKeysPageClient from './ApiKeysPageClient';

export const metadata: Metadata = createSettingsPageMetadata({
  title: 'API Keys',
  description: 'Manage your API keys and integrations.',
});

export default function ApiKeysPage() {
  return <ApiKeysPageClient />;
}
