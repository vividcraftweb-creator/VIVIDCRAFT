export const revalidate = 60;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import { createClient } from '@/lib/supabase/server';
import FreelancersPageClient, { normalizeArtistProfile } from './FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creative professionals for your projects on Cinnamon Gallery.',
});

export default async function FreelancersPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let profiles: any[] = [];

  try {
    const supabase = await createClient();

    let artistsData: any[] | null = null;

    // 1. Primary query: select valid columns with proper .order() syntax
    const { data: artists, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, artist_name, email, role, avatar_url, banner_url, title, professional_title, address, whatsapp_number, art_styles, art_specialties, services_offered, display_order, is_verified, created_at, updated_at')
      .or('role.ilike.artist,role.eq.ARTIST,role.eq.artist')
      .order('display_order', { ascending: true });

    if (!error && Array.isArray(artists)) {
      artistsData = artists;
    } else {
      console.warn('Primary artists query in freelancers page failed, falling back:', error?.message);

      // 2. Fallback query: select valid columns where role = 'artist'
      const fallback = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name, artist_name, email, role, avatar_url, banner_url, title, professional_title, address, whatsapp_number, is_verified, created_at')
        .eq('role', 'artist')
        .order('created_at', { ascending: false });

      if (!fallback.error && Array.isArray(fallback.data)) {
        artistsData = fallback.data;
      } else {
        // 3. Resilient minimal fallback
        const minimal = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role, avatar_url, title, address, created_at')
          .eq('role', 'artist');

        if (!minimal.error && Array.isArray(minimal.data)) {
          artistsData = minimal.data;
        } else {
          console.error('All artist query fallbacks failed in freelancers page:', minimal.error || fallback.error);
        }
      }
    }

    if (artistsData && Array.isArray(artistsData)) {
      profiles = artistsData.map(normalizeArtistProfile).filter(Boolean);
    }
  } catch (err) {
    console.error("Error fetching profiles:", err);
    profiles = [];
  }

  return <FreelancersPageClient initialProfiles={profiles ?? []} />;
}
