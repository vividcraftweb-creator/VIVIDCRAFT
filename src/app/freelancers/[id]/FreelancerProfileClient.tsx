'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle,
  Clock,
  GraduationCap,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Share2,
  User,
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type {
  Certification,
  EducationItem,
  ExperienceItem,
  PortfolioItem,
  Profile as ProfileRow,
  SubscriptionPlan,
} from '@/types/database.types';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import { createClient } from '@/lib/supabase/client';

type FreelancerProfile = ProfileRow & {
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  businessEmail?: string | null;
  avatar_url?: string | null;
  profile_picture?: string | null;
  profilePicture?: string | null;
  title?: string | null;
  professional_title?: string | null;
  bio?: string | null;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  experienceItems: ExperienceItem[];
  educationItems: EducationItem[];
  portfolioItems: PortfolioItem[];
  certifications: Certification[];
  subscriptionPlan: SubscriptionPlan | null;
};

interface PageProps {
  params: Promise<{ id: string }>;
  initialProfile?: FreelancerProfile | null;
}

const PLAN_BADGE_IMAGES: Partial<Record<SubscriptionPlan, { src: string; alt: string }>> = {
  FREELANCER_PRO: { src: '/pro-plan-user.png', alt: 'Pro plan badge' },
  FREELANCER_ELITE: { src: '/elite-plan-user.png', alt: 'Elite plan badge' },
};

export default function FreelancerProfileClient({ params, initialProfile }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [directProfile, setDirectProfile] = useState<FreelancerProfile | null>(initialProfile ?? null);

  const profileQuery = trpc.publicProfile.getPublicProfile.useQuery<FreelancerProfile | null>(
    { identifier: resolvedParams.id },
    {
      initialData: initialProfile ?? undefined,
      retry: 2,
      staleTime: 60000,
    }
  );
  const { data: session, status } = useAuth();

  useEffect(() => {
    async function fetchDirect() {
      try {
        const supabase = createClient();
        const id = resolvedParams.id;
        let data: any = null;

        const { data: byId } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (byId) {
          data = byId;
        } else {
          const { data: byFallback } = await (supabase as any)
            .from('profiles')
            .select('*')
            .or(`email.eq.${id},first_name.ilike.%${id}%`)
            .maybeSingle();
          if (byFallback) {
            data = byFallback;
          } else if (id.toLowerCase().includes('studio')) {
            const { data: byStudio } = await (supabase as any)
              .from('profiles')
              .select('*')
              .ilike('first_name', '%studio%')
              .maybeSingle();
            if (byStudio) data = byStudio;
          }
        }

        if (data) {
          const fName = data.first_name || data.firstName || (data.full_name ? data.full_name.split(' ')[0] : '') || '';
          const lName = data.last_name || data.lastName || (data.full_name ? data.full_name.split(' ').slice(1).join(' ') : '') || '';
          const rawSkills = data.skills || '';
          const skillsVal = Array.isArray(rawSkills) ? rawSkills.join(', ') : (typeof rawSkills === 'string' ? rawSkills : '');
          const titleVal = data.title || data.professional_title || '';
          const bioVal = data.bio || data.description || '';
          const locVal = data.address || data.location || '';
          const rateVal = typeof data.rate === 'number' ? data.rate : (typeof data.hourly_rate === 'number' ? data.hourly_rate : null);
          const avatarVal = data.avatar_url || data.profile_picture || data.profilePicture || null;
          const emailVal = data.email || data.businessEmail || data.business_email || null;
          const slugVal = data.slug || data.id;

          setDirectProfile({
            id: data.id,
            userId: data.id,
            firstName: fName,
            lastName: lName,
            first_name: fName,
            last_name: lName,
            email: emailVal,
            title: titleVal,
            professional_title: titleVal,
            bio: bioVal,
            description: bioVal,
            location: locVal,
            address: locVal,
            skills: skillsVal,
            profilePicture: avatarVal,
            avatar_url: avatarVal,
            rate: rateVal,
            slug: slugVal,
            isPublished: true,
            is_published: true,
            createdAt: data.created_at || new Date().toISOString(),
            updatedAt: data.updated_at || new Date().toISOString(),
            brandLogo: null,
            brandPrimaryColor: null,
            brandSecondaryColor: null,
            businessAddressLine1: null,
            businessAddressLine2: null,
            businessCity: null,
            businessCountry: null,
            businessEmail: emailVal,
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
            experienceItems: [],
            educationItems: [],
            portfolioItems: [],
            certifications: [],
            subscriptionPlan: data.subscription_plan || data.subscriptionPlan || 'FREELANCER_PRO',
          } as FreelancerProfile);
        }
      } catch (err) {
        console.warn("Direct profile load notice:", err);
      }
    }

    fetchDirect();
  }, [resolvedParams.id]);

  const profile = profileQuery.data ?? directProfile ?? null;
  const data = profile;
  const artistData = profile;

  const displayName = useMemo(() => {
    if (!profile) return 'studio One';
    const fName = profile.first_name || profile.firstName || '';
    const lName = profile.last_name || profile.lastName || '';
    const email = (profile as any).email || (profile as any).businessEmail || (profile as any).user?.email || '';

    if (
      fName.toLowerCase().includes('studio') ||
      email.toLowerCase().includes('studio1') ||
      (fName.toLowerCase().startsWith('studio') && !lName)
    ) {
      return 'studio One';
    }

    const fullName = (profile as any).full_name || (profile as any).fullName || `${fName} ${lName}`.trim();
    if (fullName) return fullName;

    return profile.title || (profile as any).professional_title || 'studio One';
  }, [profile]);

  const avatarUrl = useMemo(() => {
    const rawPic =
      (profile as any)?.avatar_url ||
      profile?.profilePicture ||
      (profile as any)?.profile_picture ||
      (profile as any)?.avatar ||
      (profile as any)?.image;
    if (!rawPic) return undefined;
    return getProfilePictureUrl(profile?.userId || profile?.id || resolvedParams.id, String(rawPic).trim());
  }, [profile, resolvedParams.id]);

  const initials = useMemo(() => {
    if (displayName && displayName.toLowerCase().includes('studio')) {
      return 'SO';
    }
    const fName = profile?.first_name || profile?.firstName || '';
    const lName = profile?.last_name || profile?.lastName || '';
    if (fName && lName) {
      return `${fName[0]}${lName[0]}`.toUpperCase();
    }
    if (displayName && displayName !== 'Artist') {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return displayName.slice(0, 2).toUpperCase();
    }
    return 'SO';
  }, [profile, displayName]);

  const formattedSkills = useMemo(
    () =>
      profile?.skills ? profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean) : [],
    [profile]
  );

  const shareUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers/${profile?.slug ?? resolvedParams.id}`;
  }, [profile?.slug, resolvedParams.id]);

  const planBadge = profile?.subscriptionPlan
    ? PLAN_BADGE_IMAGES[profile.subscriptionPlan]
    : null;

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    jobTitle: profile?.title || (profile as any)?.professional_title || 'Artist',
    description: profile?.bio || (profile as any)?.description || 'Professional artist on Vivid Art',
    image: avatarUrl || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers/${profile?.slug ?? resolvedParams.id}`,
    knowsAbout: formattedSkills,
    worksFor: {
      '@type': 'Organization',
      name: 'Vivid Art',
    },
    address: (profile?.location || (profile as any)?.address)
      ? {
          '@type': 'PostalAddress',
          addressLocality: profile?.location || (profile as any)?.address,
        }
      : undefined,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Artists',
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: displayName,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers/${profile?.slug ?? resolvedParams.id}`,
      },
    ],
  };

  const highlightStats = useMemo(
    () => [
      {
        label: 'Featured Artworks',
        value: profile?.portfolioItems?.length ?? 0,
      },
      {
        label: 'Exhibitions & Showcases',
        value: profile?.experienceItems?.length ?? 0,
      },
      {
        label: 'Credentials & Honors',
        value: profile?.certifications?.length ?? 0,
      },
    ],
    [profile]
  );

  const handleShare = async () => {
    if (isSharing) return; // Prevent concurrent share invocations
    setIsSharing(true);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = displayName ? `${displayName}'s Profile` : 'Artist Profile';

    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
      } catch (error: any) {
        // Gracefully catch user cancellation (AbortError) or concurrent share attempts (InvalidStateError)
        if (error?.name !== 'AbortError' && error?.name !== 'InvalidStateError') {
          console.warn("Share notice:", error);
        }
      } finally {
        setIsSharing(false);
      }
    } else {
      // Fallback to Clipboard copy if navigator.share is unsupported
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          toast.success("Profile link copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        } else {
          const input = document.createElement('input');
          input.value = shareUrl;
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
          setCopied(true);
          toast.success("Profile link copied to clipboard!");
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (err) {
        console.warn("Clipboard copy notice:", err);
      } finally {
        setIsSharing(false);
      }
    }
  };

  const handleMessage = () => {
    if (!profile) return;

    // Wait for auth status to be determined
    if (status === 'loading') return;

    // Destination URL with recipient pre-selected
    const messageUrl = `/dashboard?tab=messages&userId=${profile.userId}`;

    if (status === 'authenticated' && session?.session?.user) {
      // User is authenticated - go directly to messages
      router.push(messageUrl);
    } else {
      // User not authenticated - redirect to signin with callback
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(messageUrl)}`);
    }
  };

  if (profileQuery.isLoading && !profile) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background text-white">
        <div className="absolute inset-0 bg-background" />
        <div className="relative flex flex-col items-center gap-4 glass-card px-12 py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-white/70">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen bg-background text-white">
        <div className="absolute inset-0 bg-background" />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4">
          <div className="w-full max-w-lg glass-card p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <User className="h-10 w-10 text-primary/70" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">Profile unavailable</h2>
            <p className="mb-8 text-muted-foreground leading-relaxed">
              This artist hasn&apos;t published their profile yet, or the link you used has expired.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.back()} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>
              <Link href="/freelancers">
                <Button className="gap-2">
                  Browse Artists
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="relative z-10">
        <header className="px-4 pb-12 pt-6 sm:pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="relative flex flex-col justify-between gap-6 rounded-4xl border border-border glass-card-elevated glass-card-shine p-8 md:flex-row md:items-start lg:items-center lg:p-10 group hover-lift">
              {/* Subtle hover overlay */}
              <div className="absolute inset-0 bg-white/[0.02] rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />

              <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:items-center">
                <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 md:h-30 md:w-30 lg:mx-0 lg:h-32 lg:w-32 transition-transform hover:scale-105 rounded-[28px] border-2 border-primary/20 ring-4 ring-primary/10 shadow-2xl shadow-primary/25 overflow-hidden bg-primary">
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarUrl}
                      alt={`${displayName} avatar`}
                      className="object-cover h-full w-full rounded-[28px]"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.avatar-fallback') as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="avatar-fallback flex h-full w-full items-center justify-center bg-primary text-3xl font-semibold uppercase tracking-widest text-white rounded-none"
                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                  >
                    {initials}
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center lg:text-left">
                  <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:gap-4">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
                    {profile.verified && (
                      <Badge className="gap-1 border border-emerald-400/40 bg-emerald-500/10 text-emerald-200">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Verified Artist
                      </Badge>
                    )}
                    {planBadge && planBadge.src && (
                      <Image src={planBadge.src} alt={planBadge.alt} width={140} height={40} className="h-9 w-auto" />
                    )}
                  </div>
                  {(profile.title || (profile as any).professional_title) && (
                    <p className="text-sm text-white/75 sm:text-base">{profile.title || (profile as any).professional_title}</p>
                  )}
                  {(profile.bio || (profile as any).description) && (
                    <p className="text-sm text-white/60 line-clamp-2 max-w-2xl">{profile.bio || (profile as any).description}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/60 sm:text-sm lg:justify-start">
                    {(profile.location || (profile as any).address) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <MapPin className="h-4 w-4 text-primary/80" />
                        {profile.location || (profile as any).address}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      <Clock className="h-4 w-4 text-yellow-300" />
                      Available for commissions
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end lg:w-auto">
                <Button variant="outline" className="h-11 sm:h-10 gap-2 glass-button interactive-scale" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  {copied ? 'Link copied' : 'Share profile'}
                </Button>
                <Button
                  className="h-11 sm:h-10 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 button-ripple interactive-scale"
                  onClick={handleMessage}
                  disabled={status === 'loading'}
                >
                  <Mail className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="pb-24">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[2fr_1fr] lg:gap-12 lg:px-8">
            <section className="space-y-10">
              {(profile.bio || (profile as any).description) && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Artist Biography
                    </h2>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm lg:text-base leading-relaxed text-white/80">
                    {profile.bio || (profile as any).description}
                  </p>
                </section>
              )}

              {profile.experienceItems?.length > 0 && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <Briefcase className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Exhibitions &amp; Artistic Career
                    </h2>
                  </div>
                  <div className="mt-6 space-y-6">
                    {profile.experienceItems.map((exp) => (
                      <article key={exp.id} className="relative pl-8">
                        <span className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_6px_rgba(99,102,241,0.25)]" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-lg font-semibold text-white">{exp.position}</h3>
                          {(exp.startDate || exp.endDate) && (
                            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-white/50">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {[exp.startDate ?? 'Present', exp.endDate ?? 'Present']
                                .filter(Boolean)
                                .join(' – ')}
                            </span>
                          )}
                        </div>
                        {exp.company && <p className="text-sm text-white/70">{exp.company}</p>}
                        {exp.location && <p className="text-xs text-white/50">{exp.location}</p>}
                        {exp.description && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/75">
                            {exp.description}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {profile.portfolioItems?.length > 0 && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <FolderOpen className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Featured Artworks &amp; Gallery
                    </h2>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {profile.portfolioItems.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-2xl border border-white/10 bg-black/20 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:bg-black/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                      >
                        {item.imageUrl && (
                          <div className="relative w-full aspect-video overflow-hidden bg-black/40">
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-white transition-colors group-hover:text-primary/90">{item.title}</h3>
                            {item.url && (
                              <Link
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                View Artwork
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                          {item.description && (
                            <div className="mt-2">
                              <p className={`text-sm text-white/70 ${expandedItems.has(item.id) ? '' : 'line-clamp-3'}`}>
                                {item.description}
                              </p>
                              {item.description.length > 150 && (
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedItems);
                                    if (expandedItems.has(item.id)) {
                                       newExpanded.delete(item.id);
                                    } else {
                                       newExpanded.add(item.id);
                                    }
                                    setExpandedItems(newExpanded);
                                  }}
                                  className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                  {expandedItems.has(item.id) ? 'Read Less' : 'Read More...'}
                                </button>
                              )}
                            </div>
                          )}
                          {item.technologies && (
                            <p className="mt-2 text-xs uppercase tracking-wide text-white/40">
                              {item.technologies}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {profile.educationItems?.length > 0 && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Art Studies &amp; Background
                    </h2>
                  </div>
                  <div className="mt-6 space-y-5">
                    {profile.educationItems.map((edu) => (
                      <article key={edu.id} className="space-y-1">
                        <h3 className="text-base font-semibold text-white">{edu.degree}</h3>
                        {edu.institution && (
                          <p className="text-sm text-white/70">{edu.institution}</p>
                        )}
                        {(edu.startDate || edu.endDate) && (
                          <p className="text-xs text-white/40">
                            {[edu.startDate ?? '', edu.endDate ?? 'Present']
                              .filter(Boolean)
                              .join(' – ')}
                          </p>
                        )}
                        {edu.description && (
                          <p className="text-sm text-white/60">{edu.description}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {profile.certifications?.length > 0 && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Honors &amp; Art Credentials
                    </h2>
                  </div>
                  <div className="mt-6 space-y-5">
                    {profile.certifications.map((cert) => {
                      const credentialHref = cert.credentialUrl
                        ? cert.credentialUrl.startsWith('http')
                          ? cert.credentialUrl
                          : cert.credentialUrl.startsWith('/')
                          ? cert.credentialUrl
                          : `/${cert.credentialUrl}`
                        : null;

                      return (
                        <article key={cert.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-white">{cert.name}</h3>
                            {cert.issueDate && (
                              <span className="text-xs text-white/50">
                                Issued {new Date(cert.issueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {cert.issuer && (
                            <p className="text-sm text-white/70">Issuer: {cert.issuer}</p>
                          )}
                          {cert.credentialId && (
                            <div className="mt-2 text-xs text-white/50">Credential ID: {cert.credentialId}</div>
                          )}
                          {credentialHref && (
                            <a
                              href={credentialHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              View credential
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </section>

            <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
              {formattedSkills.length > 0 && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Art Styles &amp; Mediums
                    </h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {formattedSkills.map((skill) => (
                      <Badge
                        key={skill}
                        className="border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                    Artist Highlights
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  {highlightStats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <span className="text-sm text-white/70">{label}</span>
                      <span className="text-lg font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                    Get in Touch
                  </h2>
                </div>
                <p className="mt-3 text-sm text-white/70">
                  Ready to collaborate with {displayName}? Share their profile with your team or send them a message to kick off the conversation.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" className="gap-2 glass-button interactive-scale" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    {copied ? 'Link copied' : 'Share profile'}
                  </Button>
                  <Button
                    className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 button-ripple interactive-scale"
                    onClick={handleMessage}
                    disabled={status === 'loading'}
                  >
                    <Mail className="h-4 w-4" />
                    Message {profile.first_name || profile.firstName || (displayName !== 'Artist' ? displayName.split(' ')[0] : 'Artist')}
                  </Button>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
