import { Metadata } from 'next';
import { createSettingsPageMetadata } from '@/lib/seo-metadata';
import TeamPageClient from './TeamPageClient';

export const metadata: Metadata = createSettingsPageMetadata({
  title: 'Team Management',
  description: 'Manage your team members and permissions.',
});

export default function TeamPage() {
  return <TeamPageClient />;
}
