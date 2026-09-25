export const revalidate = 60;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import { createClient } from '@/lib/supabase/server';
import FreelancersPageClient, { normalizeArtistProfile } from '../freelancers/FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creative professionals for your projects on Cinnamon Gallery.',
});

export default async function ArtistsPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let profiles: any[] = [];

  try {
    const supabase = await createClient();

    // Explicitly include array columns and handle role variations
    const { data: artists, error } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, full_name, display_name, username, email, role, user_type, account_type, avatar_url, profile_picture, banner_url, title, professional_title, bio, description, skills, mediums, specialties, services, art_styles, art_specialties, services_offered, display_order, is_verified, is_featured, location, available_for_commissions, whatsapp_number, rating, reviews_count')
      .or('role.eq.ARTIST,role.eq.artist')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching artists from profiles:', error);
    }

    if (artists && Array.isArray(artists)) {
      profiles = artists.map(normalizeArtistProfile).filter(Boolean);
    }
  } catch (err) {
    console.error('Error fetching profiles:', err);
    profiles = [];
  }

  return <FreelancersPageClient initialProfiles={profiles ?? []} />;
}

