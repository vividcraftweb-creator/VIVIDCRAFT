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
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.artist,role.eq.Artist,role.ilike.artist')
      .order('created_at', { ascending: false });

    if (error || !data) {
      const res = await supabase
        .from('profiles')
        .select('*')
        .ilike('role', 'artist')
        .order('created_at', { ascending: false });
      if (!res.error && res.data) {
        data = res.data;
      }
    }

    if (!error && Array.isArray(data)) {
      profiles = data.filter(isArtistProfile);
    } else {
      profiles = [];
    }
  } catch (err) {
    console.error("Error fetching profiles:", err);
    profiles = [];
  }

  return <FreelancersPageClient initialProfiles={profiles ?? []} />;
}
