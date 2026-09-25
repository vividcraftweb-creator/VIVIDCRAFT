export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import { createClient } from '@/lib/supabase/server';
import FreelancersPageClient, { normalizeArtistProfile } from '@/app/freelancers/FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creators for your projects on Cinnamon Gallery.',
});

export default async function DiscoverPage() {
  let profiles: any[] = [];

  try {
    const supabase = await createClient();

    const { data: artists, error } = await supabase
      .from('profiles')
      .select('*, art_styles, art_specialties, services_offered')
      .or('role.eq.ARTIST,role.eq.artist')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching artists from profiles:', error);
    }

    if (artists && Array.isArray(artists)) {
      profiles = artists.map(normalizeArtistProfile).filter(Boolean);
    }
  } catch (err) {
    console.error('Error fetching profiles in discover page:', err);
    profiles = [];
  }

  return <FreelancersPageClient initialProfiles={profiles ?? []} />;
}
