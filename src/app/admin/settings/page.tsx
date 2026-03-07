import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SettingsPageClient from './SettingsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Settings',
  description: 'Configure platform settings and preferences.',
});

export default function SettingsPage() {
  return <SettingsPageClient />;
}
