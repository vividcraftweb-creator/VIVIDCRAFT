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
import type {
  Certification,
  EducationItem,
  ExperienceItem,
  PortfolioItem,
  Profile as ProfileRow,
  SubscriptionPlan,
} from '@/types/database.types';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

type FreelancerProfile = ProfileRow & {
  experienceItems: ExperienceItem[];
  educationItems: EducationItem[];
  portfolioItems: PortfolioItem[];
  certifications: Certification[];
  subscriptionPlan: SubscriptionPlan | null;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const PLAN_BADGE_IMAGES: Partial<Record<SubscriptionPlan, { src: string; alt: string }>> = {
  FREELANCER_PRO: { src: '/pro-plan-user.png', alt: 'Pro plan badge' },
  FREELANCER_ELITE: { src: '/elite-plan-user.png', alt: 'Elite plan badge' },
};

export default function FreelancerProfileClient({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const profileQuery = trpc.publicProfile.getPublicProfile.useQuery<FreelancerProfile | null>(
    { identifier: resolvedParams.id },
    { retry: false }
  );
  const { data: session, status } = useAuth();

  const profile = profileQuery.data ?? null;

  const displayName = useMemo(() => {
    if (!profile) return 'Freelancer';
    const combined = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
    return combined || profile.title || 'Freelancer';
  }, [profile]);

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
    jobTitle: profile?.title || 'Freelancer',
    description: profile?.bio || 'Professional freelancer on JobHorizons',
    image: profile?.profilePicture || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers/${profile?.slug ?? resolvedParams.id}`,
    knowsAbout: formattedSkills,
    worksFor: {
      '@type': 'Organization',
      name: 'JobHorizons',
    },
    address: profile?.location
      ? {
          '@type': 'PostalAddress',
          addressLocality: profile.location,
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
        name: 'Freelancers',
        item: '${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/freelancers',
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
        label: 'Experience entries',
        value: profile?.experienceItems?.length ?? 0,
      },
      {
        label: 'Portfolio projects',
        value: profile?.portfolioItems?.length ?? 0,
      },
      {
        label: 'Certifications',
        value: profile?.certifications?.length ?? 0,
      },
    ],
    [profile]
  );

  const handleShare = async () => {
    const title = `Work with ${displayName} on JobHorizons`;

    // Try Web Share API first (primarily for mobile)
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (error) {
        // Check if user cancelled (AbortError) vs actual error
        if (error instanceof Error && error.name === 'AbortError') {
          return; // User cancelled, no action needed
        }
        // Real error, fall through to clipboard fallback
        console.error('Web Share API failed:', error);
      }
    }

    // Clipboard fallback
    try {
      if (!navigator.clipboard) {
        // Very old browser - create a temporary input for manual copy
        const input = document.createElement('input');
        input.value = shareUrl;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Even execCommand failed, show URL
          alert(`Share this profile:\n${shareUrl}`);
        }
        document.body.removeChild(input);
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard API failed:', error);
      // Last resort: show URL to user
      alert(`Could not copy automatically. Please copy this link:\n${shareUrl}`);
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

  if (profileQuery.isLoading) {
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

  if (profileQuery.isError || !profile) {
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
              This freelancer hasn&apos;t published their profile yet, or the link you used has expired.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.back()} variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>
              <Link href="/freelancers">
                <Button className="gap-2">
                  Browse Freelancers
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
                <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 md:h-30 md:w-30 overflow-hidden rounded-[28px] border-2 border-primary/20 ring-4 ring-primary/10 shadow-2xl shadow-primary/25 lg:mx-0 lg:h-32 lg:w-32 transition-transform hover:scale-105">
                  {profile.profilePicture && !imageError ? (
                    <Image
                      src={getProfilePictureUrl(profile.userId, profile.profilePicture) || ''}
                      alt={`${displayName} avatar`}
                      fill
                      className="object-cover"
                      unoptimized
                      priority
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary text-3xl font-semibold uppercase tracking-widest">
                      {displayName
                        .split(' ')
                        .slice(0, 2)
                        .map((part) => part.charAt(0))
                        .join('')}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center lg:text-left">
                  <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:gap-4">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{displayName}</h1>
                    {profile.verified && (
                      <Badge className="gap-1 border border-emerald-400/40 bg-emerald-500/10 text-emerald-200">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Verified freelancer
                      </Badge>
                    )}
                    {planBadge && planBadge.src && (
                      <Image src={planBadge.src} alt={planBadge.alt} width={140} height={40} className="h-9 w-auto" />
                    )}
                  </div>
                  {profile.title && (
                    <p className="text-sm text-white/75 sm:text-base">{profile.title}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/60 sm:text-sm lg:justify-start">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <MapPin className="h-4 w-4 text-primary/80" />
                        {profile.location}
                      </span>
                    )}
                    {profile.rate && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        <Clock className="h-4 w-4 text-yellow-300" />
                        ${profile.rate.toFixed(0)}/hr
                      </span>
                    )}
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
              {profile.bio && (
                <section className="glass-card glass-card-shine p-6 rounded-2xl hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 icon-glow transition-all duration-300">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
                      Professional Summary
                    </h2>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm lg:text-base leading-relaxed text-white/80">
                    {profile.bio}
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
                      Experience
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
                      Portfolio
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
                                View
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
                      Education
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
                      Certifications
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
                      Skills Snapshot
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
                    Snapshot Metrics
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
                    Message {profile.firstName ?? profile.lastName ?? 'Freelancer'}
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
