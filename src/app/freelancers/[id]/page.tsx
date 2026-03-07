import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import FreelancerProfileClient from './FreelancerProfileClient';
import { createClient } from '@/lib/supabase/server';
import { createDynamicMetadata } from '@/lib/seo-metadata';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const identifier = resolvedParams.id.trim();

  // Check if identifier is a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  const supabase = await createClient();
  const column = isUuid ? 'userId' : 'slug';
  const value = isUuid ? identifier : identifier.toLowerCase();

  // Fetch profile - use maybeSingle to avoid errors
  const { data: profile } = await supabase
    .from('Profile')
    .select('firstName, lastName, title, profilePicture, bio')
    .eq(column, value)
    .eq('isPublished', true)
    .maybeSingle();

  if (!profile) {
    return {
      title: {
        absolute: 'Freelancer Not Found | JobHorizons',
      },
      description: 'This freelancer profile could not be found.',
    };
  }

  const name = `${profile.firstName} ${profile.lastName}`;
  const pageTitle = profile.title
    ? `${name} - ${profile.title}`
    : name;

  const description = profile.bio
    ? (profile.bio.length > 160 ? `${profile.bio.slice(0, 157)}...` : profile.bio)
    : `View ${name}'s freelancer profile on JobHorizons. Browse skills, portfolio, and hire for your next project.`;

  return createDynamicMetadata({
    title: pageTitle,
    description,
    section: 'Freelancers',
    ogImage: profile.profilePicture || undefined,
    keywords: [
      'freelancer',
      name,
      profile.title || '',
      'remote worker',
      'hire freelancer',
    ].filter(Boolean),
  });
}

/**
 * Server Component Wrapper for Freelancer Profile Page
 *
 * Handles 301 permanent redirects from UUID-based URLs to slug-based URLs.
 * This is critical for SEO and ensures all freelancer profiles use user-friendly URLs.
 */
export default async function FreelancerPublicProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const identifier = resolvedParams.id;

  // Check if identifier is a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  if (isUuid) {
    // Fetch profile slug from database using server-side Supabase client
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('Profile')
      .select('slug')
      .eq('userId', identifier)
      .eq('isPublished', true)
      .maybeSingle();

    if (profile?.slug) {
      // 301 Permanent Redirect to slug-based URL (SEO-friendly)
      permanentRedirect(`/freelancers/${profile.slug}`);
    }

    // If no slug found or profile not published, continue to render
    // (will show 404 via client component)
  }

  // Render client component for slug-based URLs or when no redirect is needed
  return <FreelancerProfileClient params={params} />;
}
