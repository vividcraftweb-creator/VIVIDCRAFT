import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import ResetPasswordPageClient from './ResetPasswordPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Set New Password',
  description: 'Create a new password for your account.',
});

export default function ResetPasswordPage() {
  return <ResetPasswordPageClient />;
}
