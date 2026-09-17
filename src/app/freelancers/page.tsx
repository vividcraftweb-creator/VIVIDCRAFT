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

export default async function FreelancersPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let profiles: any[] = [];

  try {
    const resolvedParams = props.searchParams ? await props.searchParams : {};
    const supabase = await createClient();

    // Base query for active artists
    let query = supabase
      .from('profiles')
      .select('*')
      .or('role.eq.artist,role.eq.ARTIST,role.ilike.artist');

    const rawMedium = resolvedParams?.medium || resolvedParams?.mediums || resolvedParams?.style || resolvedParams?.styles;
    const rawSpecialty = resolvedParams?.specialty || resolvedParams?.specialties;
    const rawService = resolvedParams?.service || resolvedParams?.services;

    const selectedMediums = (Array.isArray(rawMedium) ? rawMedium : [rawMedium]).filter(Boolean).map(s => String(s).trim());
    const selectedSpecialties = (Array.isArray(rawSpecialty) ? rawSpecialty : [rawSpecialty]).filter(Boolean).map(s => String(s).trim());
    const selectedServices = (Array.isArray(rawService) ? rawService : [rawService]).filter(Boolean).map(s => String(s).trim());

    // Use Supabase .contains() method for text[] array columns instead of .eq()
    for (const m of selectedMediums) {
      if (m) query = query.contains('mediums', [m]);
    }
    for (const sp of selectedSpecialties) {
      if (sp) query = query.contains('specialties', [sp]);
    }
    for (const sv of selectedServices) {
      if (sv) query = query.contains('services', [sv]);
    }

    query = query.order('display_order', { ascending: true });

    const { data: artists, error } = await query;

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
