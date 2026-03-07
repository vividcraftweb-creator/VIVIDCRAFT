import { Metadata } from 'next';
import { createAuthPageMetadata } from '@/lib/seo-metadata';
import ErrorPageClient from './ErrorPageClient';

export const metadata: Metadata = createAuthPageMetadata({
  title: 'Authentication Error',
  description: 'An error occurred during authentication.',
});

export default function ErrorPage() {
  return <ErrorPageClient />;
}
