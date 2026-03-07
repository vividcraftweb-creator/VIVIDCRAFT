import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import VerifyEmailSentPageClient from './VerifyEmailSentPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Check Your Email',
  description: 'Verification email sent - check your inbox to continue.',
});

export default function VerifyEmailSentPage() {
  return <VerifyEmailSentPageClient />;
}
