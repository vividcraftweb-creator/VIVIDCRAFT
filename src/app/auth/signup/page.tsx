import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import SignUpPageClient from './SignUpPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Create Account',
  description: 'Create your JobHorizons account and start freelancing or hire top talent.',
  noIndex: false,
});

export default function SignUpPage() {
  return <SignUpPageClient />;
}
