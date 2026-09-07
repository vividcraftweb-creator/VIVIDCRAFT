export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import { createClient } from '@/lib/supabase/server';
import FreelancersPageClient from './FreelancersPageClient';

export const metadata: Metadata = createPageMetadata({
  title: 'Discover Artists',
  description: 'Discover and hire verified artists and creative professionals for your projects on Vivid Art.',
});

export default async function FreelancersPage() {
  let profiles: any[] = [];

  try {
    const supabase = await createClient();
    const { data: artists, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'artist');

    if (error) {
      console.error("Error fetching artists from profiles:", error);
    }

    if (artists && Array.isArray(artists)) {
      profiles = artists;
    }
  } catch (err) {
    console.error("Error fetching profiles:", err);
    profiles = [];
  }

  return <FreelancersPageClient initialProfiles={profiles ?? []} />;
}
