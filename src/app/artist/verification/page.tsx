import { redirect } from 'next/navigation';

export default function ArtistVerificationRedirectPage() {
  redirect('/dashboard?tab=verification');
}
