'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Filter, MapPin, CheckCircle, Clock, Crown, Shield, X } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';
import { useAuth as useSession } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import SkillsSelector from '@/components/ui/skills-selector';
import LocationAutocompleteInput from '@/components/ui/LocationAutocompleteInput';
import { getProfilePictureUrl } from '@/lib/profile-helpers';

type SearchFreelancersOutput = inferRouterOutputs<AppRouter>['profiles']['searchFreelancers'];
type FreelancerListItem = SearchFreelancersOutput['freelancers'][number];

const DEFAULT_RATE_RANGE: [number, number] = [0, 200];

const PLAN_BADGE_ASSETS: Record<string, { src: string; alt: string }> = {
  FREELANCER_PRO: {
    src: '/pro-plan-user.png',
    alt: 'Pro plan subscriber badge',
  },
  FREELANCER_ELITE: {
    src: '/elite-plan-user.png',
    alt: 'Elite plan subscriber badge',
  },
};

const FreelancersPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [rateRange, setRateRange] = useState<[number, number]>(DEFAULT_RATE_RANGE);
  const [location, setLocation] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
    }
  }, [status, router]);

  const isAuthenticated = status === 'authenticated' && !!session?.session?.user;
  const isFreelancer = isAuthenticated && session?.session?.user?.role === 'FREELANCER';

  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const hasAdvancedSearch = planSummary?.permissions?.hasAdvancedFreelancerSearch ?? false;

  const minRateFilter = hasAdvancedSearch && rateRange[0] > DEFAULT_RATE_RANGE[0] ? rateRange[0] : undefined;
  const maxRateFilter = hasAdvancedSearch && rateRange[1] < DEFAULT_RATE_RANGE[1] ? rateRange[1] : undefined;

  const { data: searchResults, isLoading: searchLoading } = trpc.profiles.searchFreelancers.useQuery(
    {
      query: searchQuery || undefined,
      skills: hasAdvancedSearch && selectedSkills.length > 0 ? selectedSkills : undefined,
      minRate: minRateFilter,
      maxRate: maxRateFilter,
      location: hasAdvancedSearch && location.trim() ? location.trim() : undefined,
      limit: 24,
      offset: 0,
    },
    { enabled: isAuthenticated }
  );

  const freelancers: FreelancerListItem[] = searchResults?.freelancers ?? [];
  const totalCount = searchResults?.total ?? 0;

  const hasSkillFilter = hasAdvancedSearch && selectedSkills.length > 0;
  const hasRateFilter = hasAdvancedSearch && (minRateFilter !== undefined || maxRateFilter !== undefined);
  const hasLocationFilter = hasAdvancedSearch && Boolean(location.trim());

  const hasAnyFilters = useMemo(
    () => Boolean(searchQuery.trim() || hasSkillFilter || hasLocationFilter || hasRateFilter),
    [searchQuery, hasSkillFilter, hasLocationFilter, hasRateFilter]
  );

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isFreelancer) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="mx-4 max-w-md rounded-2xl border border-red-500/30 bg-background p-8 shadow-2xl">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-500/10 p-4">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <h2 className="mb-3 text-center text-2xl font-bold text-foreground">
            Access Restricted
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            This page is only accessible to clients. As a freelancer, you can manage your profile and view job opportunities from your dashboard.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resetFilters = () => {
    setSelectedSkills([]);
    setLocation('');
    setSearchQuery('');
    setRateRange(DEFAULT_RATE_RANGE);
  };

  return (
    <div className="min-h-screen">
      <div>
        <header className="px-4 pb-12 pt-6 sm:pb-16 sm:pt-8 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                Curated Marketplace
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Browse <span className="text-primary">Top Freelancers</span>
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
                Discover verified professionals ready to bring your projects to life. Filter by expertise, location, and budget to match with specialists in minutes.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {totalCount > 0 ? `${totalCount} vetted freelancers available` : 'New talent is added every week'}
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-5xl">
              <div className="glass-card rounded-3xl border border-white/5 bg-background/75 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.35)] backdrop-blur">
                <form
                  className="flex flex-col gap-4 lg:flex-row lg:items-center"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSearchQuery((prev) => prev.trim());
                  }}
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by skills, role, or name…"
                      className="w-full rounded-2xl border border-white/10 bg-background/60 py-3 pl-12 pr-4 text-sm text-foreground shadow-inner shadow-black/20 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters((prev) => !prev)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium transition hover:border-primary/40 hover:text-primary ${
                        showAdvancedFilters ? 'border-primary/50 text-primary' : ''
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {hasAdvancedSearch ? 'Advanced Filters' : 'Filters'}
                      {hasAdvancedSearch && <Crown className="h-4 w-4 text-yellow-400" />}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {showAdvancedFilters && (
          <div className="mb-12">
            {hasAdvancedSearch ? (
              <div className="glass-card rounded-3xl border border-primary/20 bg-background/75 p-8 shadow-[0_20px_90px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-foreground">Advanced Search Filters</h2>
                  <div className="rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 text-xs font-medium text-yellow-600">
                    Business Plan
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <label className="mb-3 block text-sm font-medium text-foreground">Skills & Expertise</label>
                    <SkillsSelector
                      selectedSkills={selectedSkills}
                      onSkillsChange={setSelectedSkills}
                      placeholder="Start typing a skill to add…"
                    />
                  </div>
                  <div className="flex flex-col gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Preferred location</label>
                      <LocationAutocompleteInput
                        value={location}
                        onChange={setLocation}
                        placeholder="e.g. Valencia, Spain"
                        className="w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-sm text-foreground shadow-inner focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        types={['(cities)']}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Hourly rate range (USD/hr)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          value={minRateFilter ?? ''}
                          onChange={(event) =>
                            setRateRange([
                              Number(event.target.value || DEFAULT_RATE_RANGE[0]),
                              rateRange[1],
                            ])
                          }
                          placeholder="Min"
                          className="w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                          type="number"
                          min={0}
                          value={maxRateFilter ?? ''}
                          onChange={(event) =>
                            setRateRange([
                              rateRange[0],
                              Number(event.target.value || DEFAULT_RATE_RANGE[1]),
                            ])
                          }
                          placeholder="Max"
                          className="w-full rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
                <div className="mb-4 flex items-center justify-center gap-3">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <h2 className="text-xl font-semibold text-foreground">Advanced search is a Business feature</h2>
                </div>
                <p className="mb-6 text-sm text-muted-foreground">
                  Upgrade to unlock skill filtering, rate controls, and location targeting for your hiring squad.
                </p>
                <Link
                  href="/dashboard?tab=subscription"
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-yellow-600"
                >
                  <Crown className="h-4 w-4" />
                  Upgrade to Business Plan
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {freelancers.length} of {totalCount} freelancers
          </p>
          {hasAnyFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {searchLoading && freelancers.length === 0 &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card rounded-3xl border border-white/10 p-6">
                <Skeleton className="mb-4 h-10 w-10 rounded-full" />
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="mb-4 h-3 w-48" />
                <Skeleton className="mb-2 h-3 w-full" />
                <Skeleton className="mb-2 h-3 w-3/4" />
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              </div>
            ))}

          {freelancers.map((freelancer) => {
            const profile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] ?? null : freelancer.Profile;
            const skills =
              typeof profile?.skills === 'string'
                ? profile.skills.split(',').map((skill) => skill.trim()).filter(Boolean)
                : [];
            const plan = freelancer.subscriptionPlan ?? undefined;
            const hourlyRate = typeof profile?.rate === 'number' ? profile.rate : null;
            const planBadgeImage = plan ? PLAN_BADGE_ASSETS[plan] : undefined;

            return (
              <Link
                key={freelancer.id}
                href={`/freelancers/${profile?.slug}`}
                className="block"
              >
                <article className="group flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-background/70 via-background/60 to-background/30 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:cursor-pointer">

                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/20 ring-4 ring-primary/10 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
                        {profile?.profilePicture && !failedImages.has(freelancer.id) ? (
                          <Image
                            src={getProfilePictureUrl(freelancer.id, profile.profilePicture) || ''}
                            alt={`${profile?.firstName && profile?.lastName
                              ? `${profile.firstName} ${profile.lastName}`
                              : freelancer.email?.[0]?.toUpperCase() || 'Freelancer'} profile picture`}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={() => {
                              setFailedImages(prev => new Set(prev).add(freelancer.id));
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-chart-1/70 text-lg font-bold text-white">
                            {profile?.firstName && profile?.lastName
                              ? `${profile.firstName[0]}${profile.lastName[0]}`
                              : freelancer.email?.[0]?.toUpperCase() || 'F'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                          {profile?.firstName && profile?.lastName
                            ? `${profile.firstName} ${profile.lastName}`
                            : profile?.title || 'Freelancer'}
                        </h3>
                        {profile?.title && (
                          <p className="text-sm text-muted-foreground">{profile.title}</p>
                        )}
                        {freelancer.isVerified && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </div>
                        )}
                      </div>
                    </div>

                    {planBadgeImage && (
                      <Image
                        src={planBadgeImage.src}
                        alt={planBadgeImage.alt}
                        width={40}
                        height={40}
                        className="h-9 w-auto"
                      />
                    )}
                  </div>

                  {profile?.bio && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                    {skills.length === 0 && (
                      <span className="text-xs text-muted-foreground">No skills listed</span>
                    )}
                  </div>
                </div>

                <footer className="mt-4 flex items-end justify-between border-t border-white/10 pt-4">
                  <div className="space-y-2">
                    {profile?.location && (
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-yellow-400" />
                      Available for new projects
                    </p>
                  </div>
                  <div className="text-right">
                    {hourlyRate !== null && (
                      <p className="text-lg font-semibold text-foreground">${hourlyRate.toFixed(0)}/hr</p>
                    )}
                    <p className="text-xs text-muted-foreground">Profile refreshed recently</p>
                  </div>
                </footer>
              </article>
            </Link>
          );
        })}
        </div>

        {!searchLoading && freelancers.length === 0 && (
          <div className="col-span-full mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center shadow-inner">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">No freelancers match your filters</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Adjust your filters or broaden your search to discover more talent.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Reset filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FreelancersPage;
