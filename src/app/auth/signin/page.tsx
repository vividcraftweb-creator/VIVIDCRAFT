import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import SignInPageClient from './SignInPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Sign In',
  description: 'Sign in to your JobHorizons account.',
  noIndex: false,
});

export default function SignInPage() {
  return <SignInPageClient />;
}
