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
      .ilike('role', 'artist')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      const res = await supabase
        .from('profiles')
        .select('*')
        .or('role.ilike.artist,role.eq.artist,role.eq.Artist')
        .order('created_at', { ascending: false });
      if (!res.error && res.data) {
        data = res.data;
        error = null;
      }
    }

    if (!error && Array.isArray(data)) {
      profiles = data.filter(isArtistProfile);
    }
  } catch (err) {
    console.error("Error fetching profiles:", err);
  }

  return <FreelancersPageClient initialProfiles={profiles} />;
}
