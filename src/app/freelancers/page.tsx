export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import { createClient } from '@/lib/supabase/server';
import { isArtistProfile } from '@/lib/artist-filter';
import FreelancersPageClient from './FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creative professionals for your projects on Vivid Art.',
});

export default async function FreelancersPage() {
  let profiles: any[] = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (!error && Array.isArray(data)) {
      profiles = data.filter(isArtistProfile);
    }
  } catch (err) {
    console.error("Error fetching profiles:", err);
  }

  return <FreelancersPageClient initialProfiles={profiles} />;
}
