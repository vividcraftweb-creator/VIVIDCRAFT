import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Settings',
  description: 'Manage your account settings, security preferences, and notifications.',
});

export default function SettingsPage() {
  return <SettingsClient />;
}
