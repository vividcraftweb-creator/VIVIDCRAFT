import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Edit Profile',
  description: 'Update your Cinnamon Gallery profile, skills, rates, and portfolio information.',
  noIndex: true,
});

export default function EditProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
