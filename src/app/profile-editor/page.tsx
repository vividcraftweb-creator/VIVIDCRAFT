export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import ProfileEditorClient from './ProfileEditorClient';
import { createAuthPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Edit Profile',
  description: 'Edit your freelancer profile, update your skills, and showcase your work.',
});

export default function ProfileEditorPage() {
  return <ProfileEditorClient />;
}
