import { Metadata } from 'next';
import { createAdminPageMetadata } from '@/lib/seo-metadata';
import SettingsPageClient from './SettingsPageClient';

export const metadata: Metadata = createAdminPageMetadata({
  title: 'Settings',
  description: 'Configure platform settings and preferences.',
});

export default function SettingsPage() {
  try {
    return <SettingsPageClient />;
  } catch (error) {
    console.error('Error rendering SettingsPageClient:', error);
    return (
      <div className="p-6 text-white space-y-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400">Loading system settings...</p>
      </div>
    );
  }
}
