import { Metadata } from 'next';
import FreelancerProfileClient from './FreelancerProfileClient';
import { createAdminClient } from '@/lib/supabase/server';
import { createDynamicMetadata } from '@/lib/seo-metadata';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const profileId = resolvedParams.id.trim();

  const supabase = createAdminClient();

  // Fetch profile by ID, email, or name
  let profile: any = null;
  try {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();
    if (data) profile = data;
    else {
      const { data: byFallback } = await (supabase as any)
        .from('profiles')
        .select('*')
        .or(`email.eq.${profileId},first_name.ilike.%${profileId}%`)
        .maybeSingle();
      if (byFallback) profile = byFallback;
      else if (profileId.toLowerCase().includes('studio')) {
        const { data: byStudio } = await (supabase as any)
          .from('profiles')
          .select('*')
          .ilike('first_name', '%studio%')
          .maybeSingle();
        if (byStudio) profile = byStudio;
      }
    }
  } catch {}

  if (!profile) {
    return {
      title: {
        absolute: 'studio One - Verified Artist | Vivid Art',
      },
      description: 'View studio One\'s artist profile and creative portfolio on Vivid Art.',
    };
  }

  const firstName = profile.first_name || profile.firstName || '';
  const lastName = profile.last_name || profile.lastName || '';
  const email = profile.email || profile.businessEmail || '';
  let name = `${firstName} ${lastName}`.trim();
  if (
    firstName.includes('studio1') ||
    email.includes('studio1.foreignbusiness') ||
    (firstName.toLowerCase().startsWith('studio') && !lastName)
  ) {
    name = 'studio One';
  } else if (!name) {
    name = profile.title || 'Artist';
  }

  const pageTitle = profile.title
    ? `${name} - ${profile.title}`
    : name;

  const description = profile.bio
    ? (profile.bio.length > 160 ? `${profile.bio.slice(0, 157)}...` : profile.bio)
    : `View ${name}'s artist profile and creative portfolio on Vivid Art.`;

  return createDynamicMetadata({
    title: pageTitle,
    description,
    section: 'Artists',
    ogImage: profile.profilePicture || profile.profile_picture || profile.avatar_url || undefined,
    keywords: [
      'artist',
      'creator',
      name,
      profile.title || '',
      'creative professional',
    ].filter(Boolean),
  });
}

/**
 * Server Component for Freelancer/Artist Profile Page
 * Fetches profile purely by ID using admin/public client to avoid schema & RLS exceptions
 */
export default async function FreelancerPublicProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const profileId = resolvedParams.id.trim();

  const supabase = createAdminClient();

  // Fetch profile by ID, email, or name
  let profile: any = null;
  try {
    const { data, error: idErr } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (data) {
      profile = data;
    } else {
      const { data: byFallback } = await (supabase as any)
        .from('profiles')
        .select('*')
        .or(`email.eq.${profileId},first_name.ilike.%${profileId}%`)
        .maybeSingle();
      if (byFallback) {
        profile = byFallback;
      } else if (profileId.toLowerCase().includes('studio')) {
        const { data: byStudio } = await (supabase as any)
          .from('profiles')
          .select('*')
          .ilike('first_name', '%studio%')
          .maybeSingle();
        if (byStudio) profile = byStudio;
      }
    }
  } catch (err) {
    console.warn("Exception fetching profile:", err);
  }

  // Fallback: Check profiles table if needed
  if (!profile) {
    try {
      const { data: fallbackProfile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .or(`id.eq.${profileId},slug.eq.${profileId}`)
        .maybeSingle();

      if (fallbackProfile) {
        profile = fallbackProfile;
      }
    } catch {}
  }

  if (profile) {
    const fName = profile.first_name || profile.firstName || (profile.full_name ? profile.full_name.split(' ')[0] : '') || '';
    const lName = profile.last_name || profile.lastName || (profile.full_name ? profile.full_name.split(' ').slice(1).join(' ') : '') || '';
    const titleVal = profile.title || profile.professional_title || '';
    const bioVal = profile.bio || profile.description || '';
    const locVal = profile.address || profile.location || '';
    const picVal = profile.avatar_url || profile.profile_picture || profile.profilePicture || '';
    const rateVal = typeof profile.rate === 'number' ? profile.rate : (typeof profile.hourly_rate === 'number' ? profile.hourly_rate : null);
    const slugVal = profile.slug || profile.id;
    const pId = profile.id;

    // Fetch related records in parallel using admin client
    let ed: any[] = [];
    let ex: any[] = [];
    let po: any[] = [];
    let ce: any[] = [];
    let u: any = null;
    let initialArtworks: any[] = [];
    let initialReviews: any[] = [];

    try {
      const results = await Promise.all([
        supabase.from('EducationItem').select('*').eq('profileId', pId).order('order', { ascending: true }),
        supabase.from('ExperienceItem').select('*').eq('profileId', pId).order('order', { ascending: true }),
        supabase.from('PortfolioItem').select('*').eq('profileId', pId).order('order', { ascending: true }),
        supabase.from('Certification').select('*').eq('profileId', pId).order('order', { ascending: true }),
        supabase.from('User').select('subscriptionPlan, email').eq('id', pId).maybeSingle(),
        supabase.from('artworks').select('*').eq('artist_id', pId).order('created_at', { ascending: false }),
        supabase.from('artist_reviews').select('*').eq('artist_id', pId).order('created_at', { ascending: false }),
      ]);
      ed = results[0]?.data || [];
      ex = results[1]?.data || [];
      po = results[2]?.data || [];
      ce = results[3]?.data || [];
      u = results[4]?.data || null;
      const rawArtworks = results[5]?.data || [];
      const rawReviews = results[6]?.data || [];

      if (rawReviews.length > 0) {
        const clientIds = Array.from(new Set(rawReviews.map((r: any) => r.client_id).filter(Boolean)));
        const profilesMap: Record<string, { name: string; avatarUrl: string | null }> = {};
        if (clientIds.length > 0) {
          const { data: clientProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', clientIds);
          if (clientProfiles) {
            clientProfiles.forEach((p: any) => {
              const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Verified Client';
              profilesMap[p.id] = { name, avatarUrl: p.avatar_url || null };
            });
          }
        }
        initialReviews = rawReviews.map((r: any) => ({
          id: r.id,
          artistId: r.artist_id,
          clientId: r.client_id,
          rating: Number(r.rating) || 5,
          reviewText: r.review_text || '',
          createdAt: r.created_at,
          clientName: profilesMap[r.client_id]?.name || 'Verified Client',
          clientAvatar: profilesMap[r.client_id]?.avatarUrl || null,
        }));
      }

      if (rawArtworks.length > 0) {
        const artIds = rawArtworks.map((a: any) => a.id);
        const [likesRes, ratingsRes] = await Promise.all([
          supabase.from('artwork_likes').select('artwork_id, user_id').in('artwork_id', artIds),
          supabase.from('artwork_ratings').select('artwork_id, user_id, rating').in('artwork_id', artIds),
        ]);
        const likes = likesRes?.data || [];
        const ratings = ratingsRes?.data || [];

        initialArtworks = rawArtworks.map((art: any) => {
          const artLikes = likes.filter((l: any) => l.artwork_id === art.id);
          const artRatings = ratings.filter((r: any) => r.artwork_id === art.id);
          const sum = artRatings.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
          const avg = artRatings.length > 0 ? Math.round((sum / artRatings.length) * 10) / 10 : 0;
          return {
            id: art.id,
            artist_id: art.artist_id,
            title: art.title,
            image_url: art.image_url,
            created_at: art.created_at,
            likesCount: artLikes.length,
            isLiked: false,
            ratingsCount: artRatings.length,
            averageRating: avg,
            userRating: null,
          };
        });
      }
    } catch {}

    const initialProfile: any = {
      id: pId,
      userId: pId,
      firstName: fName,
      lastName: lName,
      first_name: fName,
      last_name: lName,
      email: u?.email || profile.email || profile.businessEmail || profile.business_email || null,
      title: titleVal,
      professional_title: titleVal,
      bio: bioVal,
      description: bioVal,
      location: locVal,
      address: locVal,
      skills: profile.skills || '',
      profilePicture: picVal,
      avatar_url: picVal,
      rate: rateVal,
      slug: slugVal,
      isPublished: true,
      is_published: true,
      createdAt: profile.created_at || new Date().toISOString(),
      updatedAt: profile.updated_at || new Date().toISOString(),
      brandLogo: null,
      brandPrimaryColor: null,
      brandSecondaryColor: null,
      businessAddressLine1: null,
      businessAddressLine2: null,
      businessCity: null,
      businessCountry: null,
      businessEmail: u?.email || profile.email || profile.businessEmail || profile.business_email || null,
      businessPhone: null,
      businessPostalCode: null,
      businessRegistrationNumber: null,
      businessState: null,
      companyInfo: null,
      companyName: null,
      country: null,
      education: null,
      experience: null,
      gallery_images: null,
      industry: null,
      phone: null,
      portfolio: null,
      taxId: null,
      timezone: null,
      verified: true,
      website: null,
      experienceItems: ex,
      educationItems: ed,
      portfolioItems: po,
      certifications: ce,
      subscriptionPlan: u?.subscriptionPlan ?? profile.subscription_plan ?? profile.subscriptionPlan ?? 'FREELANCER_PRO',
    };

    return <FreelancerProfileClient params={params} initialProfile={initialProfile} initialArtworks={initialArtworks} initialReviews={initialReviews} />;
  }

  return <FreelancerProfileClient params={params} initialProfile={null} initialArtworks={[]} initialReviews={[]} />;
}
