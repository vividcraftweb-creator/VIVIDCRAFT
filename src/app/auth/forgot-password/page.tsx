import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import ForgotPasswordPageClient from './ForgotPasswordPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Reset Password',
  description: 'Reset your JobHorizons password.',
  noIndex: false,
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
