import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import VerifyEmailPageClient from './VerifyEmailPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Verify Email',
  description: 'Verify your email address to complete registration.',
});

export default function VerifyEmailPage() {
  return <VerifyEmailPageClient />;
}
