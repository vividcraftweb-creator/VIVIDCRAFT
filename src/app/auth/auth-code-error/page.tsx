import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import AuthCodeErrorPageClient from './AuthCodeErrorPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Verification Error',
  description: 'An error occurred during email verification.',
});

export default function AuthCodeErrorPage() {
  return <AuthCodeErrorPageClient />;
}
