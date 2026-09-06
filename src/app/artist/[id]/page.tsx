import PublicArtistProfileClient from '@/components/profile/PublicArtistProfileClient';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const isStudio = id.toLowerCase().includes('studio');
  const name = isStudio ? 'studio One' : 'Artist';

  return {
    title: `${name} - Verified Artist & Creator | Vivid Art`,
    description: `View ${name}'s creative artworks, portfolio, and commissions on Vivid Art.`,
  };
}

export default function ArtistPage() {
  return <PublicArtistProfileClient />;
}
