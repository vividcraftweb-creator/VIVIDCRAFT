'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { trpc } from '@/utils/trpc';
import { useParams } from 'next/navigation';
import { useAuth as useSession } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProposalModal from '@/components/proposals/ProposalModal';
import {
  MapPin,
  Clock,
  Briefcase,
  DollarSign,
  Monitor,
  Share2,
  ChevronRight,
  ArrowRight,
  Calendar,
  AlertCircle,
  Shield,
  ThumbsUp,
  Award,
  Zap,
  Globe,
  Star,
  Users,
  CheckCircle2,
  MessageSquare,
  Building,
  CalendarDays,
  ExternalLink,
  FileText,
  Globe2,
  Layers,
  Radar,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';

type Maybe<T> = T | null | undefined;

type ParsedMilestone = {
  name: string;
  amount: number;
};

function ensureArray<T>(value: Maybe<string | T[]>): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function ensureStringArray(value: Maybe<string | string[]>): string[] {
  const arr = ensureArray<string>(value);
  if (arr.length > 0) {
    return arr.map((entry) => `${entry}`.trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const SUPABASE_PUBLIC_PREFIX = '/storage/v1/object/public/';
const SUPABASE_BUCKET = 'public-uploads';
const JOB_MEDIA_PREFIX = 'job-media';
const FRIENDLY_MEDIA_BASE = '/job-media/';
const SUPABASE_BUCKET_PATH_PREFIX = `${SUPABASE_PUBLIC_PREFIX}${SUPABASE_BUCKET}/`;

function formatCurrency(amount: Maybe<number>, options?: Intl.NumberFormatOptions) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDeadlineStatus(deadline: Maybe<string>) {
  if (!deadline) return null;
  const dueDate = new Date(deadline);
  const now = new Date();
  const msRemaining = dueDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      label: 'Closed',
      tone: 'text-red-300',
      detail: `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} past deadline`,
    };
  }

  return {
    label: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`,
    tone:
      daysRemaining <= 3
        ? 'text-red-300'
        : daysRemaining <= 7
          ? 'text-amber-300'
          : 'text-emerald-300',
    detail: `Apply by ${formatDate(dueDate)}`,
  };
}

function buildBadge(label: string) {
  return (
    <Badge
      key={label}
      className="border border-white/20 bg-white/10 text-sm tracking-wide uppercase text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    >
      {label}
    </Badge>
  );
}

function shareTo(url: string) {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function copyToClipboard(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {
    // Swallow silently; fallback UX handled elsewhere if needed.
  });
}

function formatDescriptor(value: Maybe<string>) {
  if (!value) return null;
  const withSpaces = value.replace(/_/g, ' ');
  const withRanges = withSpaces.replace(/(\d+)\s+(\d+)\s+((?:day|week|month|year|hour)s?)/gi, '$1-$2 $3');
  return withRanges.replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function resolveJobMediaUrl(value: Maybe<string>) {
  if (!value) return null;

  const normalizeRelative = (path: string) => {
    if (path.startsWith(`${JOB_MEDIA_PREFIX}/`)) {
      return `${FRIENDLY_MEDIA_BASE}${path.slice(JOB_MEDIA_PREFIX.length + 1)}`;
    }
    if (path.startsWith(`/`)) {
      return normalizeRelative(path.slice(1));
    }
    return path.startsWith('http') ? path : `${FRIENDLY_MEDIA_BASE}${path}`;
  };

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith(SUPABASE_BUCKET_PATH_PREFIX)) {
      const objectPath = parsed.pathname.slice(SUPABASE_BUCKET_PATH_PREFIX.length);
      if (objectPath.startsWith(`${JOB_MEDIA_PREFIX}/`)) {
        return normalizeRelative(objectPath);
      }
    }
    return value;
  } catch {
    if (value.startsWith(SUPABASE_BUCKET_PATH_PREFIX)) {
      const objectPath = value.slice(SUPABASE_BUCKET_PATH_PREFIX.length);
      return normalizeRelative(objectPath);
    }
    if (value.startsWith(`${JOB_MEDIA_PREFIX}/`) || value.startsWith(`/${JOB_MEDIA_PREFIX}/`)) {
      return normalizeRelative(value);
    }
    if (value.startsWith(`${FRIENDLY_MEDIA_BASE}`)) {
      return value;
    }
    return value;
  }
}

function JobDetailClient() {
  const params = useParams();
  const slug = params.id as string;
  const { data: session } = useSession();


  const { data: job, isLoading: jobLoading, error } = trpc.jobs.getJobBySlug.useQuery(
    {
      slug,
    },
    {
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const {
    data: verification,
    isLoading: verificationLoading,
    isFetching: verificationFetching,
  } = trpc.verifications.getVerificationStatus.useQuery(undefined, {
    enabled: !!session?.session?.user && session.session.user.role === 'FREELANCER',
    retry: false,
    staleTime: 60_000,
  });

  const jobMilestones = job?.milestones;
  const jobSupportingImages = job?.supportingImages;
  const jobProjectFiles = job?.projectFiles;
  const jobPreferredLocations = job?.preferredLocations;
  const jobTags = job?.tags;

  const parsedMilestones = useMemo(
    () => ensureArray<ParsedMilestone>(jobMilestones),
    [jobMilestones],
  );
  const supportingImages = useMemo(
    () => ensureStringArray(jobSupportingImages),
    [jobSupportingImages],
  );
  const projectFiles = useMemo(
    () => ensureStringArray(jobProjectFiles),
    [jobProjectFiles],
  );
  const preferredLocations = useMemo(
    () => ensureStringArray(jobPreferredLocations),
    [jobPreferredLocations],
  );
  const tags = useMemo(() => ensureStringArray(jobTags), [jobTags]);

  if (jobLoading) {
    return (
      <div className="gradient-mesh min-h-screen">
        <div className="absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-20 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="animate-float absolute bottom-8 right-1/4 h-80 w-80 rounded-full bg-chart-1/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl space-y-8 px-6 pt-6 pb-12 sm:pt-8 sm:pb-16">
          <div className="h-72 w-full animate-pulse rounded-3xl border border-white/10 bg-white/10 backdrop-blur" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/10 backdrop-blur" />
              <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/10 backdrop-blur" />
            </div>
            <div className="space-y-6">
              <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/10 backdrop-blur" />
              <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/10 backdrop-blur" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!job && !jobLoading)) {
    return (
      <div className="gradient-mesh flex min-h-screen items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="animate-float absolute top-20 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="animate-float absolute bottom-8 right-1/4 h-80 w-80 rounded-full bg-chart-1/10 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-lg rounded-3xl border border-white/10 bg-black/40 p-10 text-center text-white backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10">
            <AlertCircle className="h-10 w-10 text-red-300" />
          </div>
          <h1 className="text-3xl font-semibold">
            {error ? 'Service unavailable' : 'Job not found'}
          </h1>
          <p className="mt-4 text-white/60">
            {error
              ? 'Database connection is currently unavailable. Please verify your Supabase configuration and try again.'
              : 'This job could not be found or may have been removed.'}
          </p>
          <Button
            onClick={() => window.history.back()}
            className="mt-6 border border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const isOwner = session?.session?.user?.id === job.clientId;
  const hasApplied = job.hasApplied ?? false;
  const isVerificationLoading = verificationLoading || verificationFetching;
  const isVerified = verification?.status === 'APPROVED';
  const canApply =
    session?.session?.user?.role === 'FREELANCER' && !isOwner && !isVerificationLoading && isVerified && !hasApplied;

  const primaryLocation =
    job.locationVisibility === 'hidden'
      ? 'Confidential location'
      : job.companyLocation || null;

  const companyName = job.companyName || job.client?.profile?.companyName || null;

  const employmentLabel = formatDescriptor(job.jobType) || undefined;
  const experienceLabel = formatDescriptor(job.experienceLevel) || undefined;
  const formattedDuration = formatDescriptor(job.projectDuration);
  const paymentLabel =
    job.paymentType === 'hourly'
      ? 'Hourly'
      : job.paymentType === 'fixed_price'
        ? 'Fixed Price'
        : undefined;
  const formattedAvailability = formatDescriptor(job.availabilityRequirement);
  const formattedProjectStage = formatDescriptor(job.projectStage);
  const formattedEnglishLevel = formatDescriptor(job.englishLevel);

  const deadlineStatus = getDeadlineStatus(job.deadline);
  const budgetDisplay =
    job.paymentType === 'hourly'
      ? [
          formatCurrency(job.hourlyRateMin, { maximumFractionDigits: 2 }),
          formatCurrency(job.hourlyRateMax, { maximumFractionDigits: 2 }),
        ]
          .filter(Boolean)
          .join(' - ') || null
      : formatCurrency(job.budget);

  const heroBadges = [
    employmentLabel && buildBadge(employmentLabel),
    experienceLabel && buildBadge(experienceLabel),
    job.projectSize && buildBadge(job.projectSize),
    formattedDuration && buildBadge(formattedDuration),
    paymentLabel && buildBadge(paymentLabel),
  ].filter(Boolean);

  const jobSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'JobHorizons',
      value: job.id,
    },
    datePosted: new Date(job.createdAt).toISOString(),
    validThrough: job.deadline ? new Date(job.deadline).toISOString() : undefined,
    employmentType: employmentLabel || 'CONTRACT',
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName || 'JobHorizons Client',
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.companyLocation || 'Remote',
        addressCountry: preferredLocations[0] || 'Worldwide',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        value:
          job.paymentType === 'hourly'
            ? job.hourlyRateMax || job.hourlyRateMin || job.budget
            : job.budget,
        unitText: job.paymentType === 'hourly' ? 'HOUR' : 'PROJECT',
      },
    },
    applicantLocationRequirements: {
      '@type': 'Country',
      name: preferredLocations.join(', ') || 'Worldwide',
    },
    jobLocationType: job.locationVisibility === 'hidden' ? 'MIXED' : 'TELECOMMUTE',
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
        name: 'Jobs',
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/jobs`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: job.title,
        item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/jobs/${job.id}`,
      },
    ],
  };

  return (
    <div className="gradient-mesh min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-float absolute top-24 left-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="animate-float absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="animate-float absolute top-1/2 left-10 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative z-10 min-h-screen pb-28">
        {/* Hero */}
        <section className="px-4 pt-12 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-2xl">
              <div className="absolute inset-0 opacity-80">
                <div className="absolute -top-24 right-12 h-56 w-56 animate-[spin_18s_linear_infinite] rounded-full border border-white/10 bg-white/5 shadow-[0_0_120px_rgba(59,130,246,0.25)]" />
                <div className="absolute bottom-0 left-0 h-40 w-40 translate-x-1/2 translate-y-1/3 rounded-full bg-purple-500/20 blur-3xl" />
              </div>

              <div className="relative flex flex-col gap-10 p-8 md:p-12 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/70 shadow-lg backdrop-blur">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Live opportunity
                    <span className="text-white/40">posted {formatDate(job.createdAt)}</span>
                  </div>
                  <div className="space-y-4 text-white">
                    <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-white/70">
                      {companyName && (
                        <span className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          {companyName}
                        </span>
                      )}
                      {primaryLocation && (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-5 w-5" />
                          {primaryLocation}
                        </span>
                      )}
                      {preferredLocations.length > 0 && (
                        <span className="flex items-center gap-2">
                          <Globe2 className="h-5 w-5" />
                          {preferredLocations
                            .map((location) => formatDescriptor(location) || location)
                            .join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {heroBadges.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3">
                      {heroBadges.map((badge) => badge)}
                    </div>
                  )}
                </div>

                <div className="flex w-full flex-col gap-5 rounded-2xl border border-white/15 bg-black/30 p-6 shadow-[0_20px_45px_-25px_rgba(59,130,246,0.5)] sm:w-auto">
                  <div className="flex flex-col gap-1 text-white">
                    <span className="text-xs uppercase tracking-[0.35em] text-white/40">
                      Compensation
                    </span>
                    <span className="text-2xl font-semibold">
                      {budgetDisplay || 'Budget TBD'}
                    </span>
                    {job.paymentType === 'hourly' && (
                      <span className="text-xs text-white/50">Per hour</span>
                    )}
                  </div>
                  {deadlineStatus && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-white/70" />
                        <div>
                          <p className="text-sm text-white/60">Application deadline</p>
                          <p className={`text-sm font-semibold ${deadlineStatus.tone}`}>
                            {deadlineStatus.label}
                          </p>
                          <p className="text-xs text-white/40">{deadlineStatus.detail}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                      size="lg"
                      className="group relative flex-1 overflow-hidden border-0 bg-green-500 text-white shadow-[0_20px_35px_-20px_rgba(34,197,94,0.9)] transition hover:scale-[1.02] hover:bg-green-600"
                      onClick={() => {
                        const buyerName = session?.session?.user?.user_metadata?.firstName ? `${session.session.user.user_metadata.firstName} ${session.session.user.user_metadata.lastName}` : 'a buyer';
                        const artistName = job.companyName || 'the artist';
                        const message = `Hi Vivid Art Admin, I am ${buyerName}. I want to know about ${job.title} by ${artistName}.`;
                        const url = `https://wa.me/940783813833?text=${encodeURIComponent(message)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <span className="absolute inset-0 translate-y-full bg-white/10 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100" />
                      <span className="relative flex items-center justify-center gap-2 font-medium">
                        <MessageSquare className="h-4 w-4" />
                        Ask About Pricing
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <article className="rounded-3xl border border-white/10 bg-black/30 p-8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl">
                <header className="mb-6 flex items-center gap-3 text-white">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-semibold">About this role</h2>
                </header>
                <p className="text-lg leading-relaxed text-white/80">{job.description}</p>
              </article>

              {job.projectGoal && (
                <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[12%] to-white/[5%] p-8 shadow-[0_30px_70px_rgba(17,24,39,0.35)] backdrop-blur-2xl">
                  <div className="mb-4 flex items-center gap-3 text-white">
                    <Target className="h-5 w-5 text-chart-1" />
                    <h3 className="text-xl font-semibold">Project goal</h3>
                  </div>
                  <p className="text-white/75">{job.projectGoal}</p>
                </section>
              )}

              {tags.length > 0 && (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                  <div className="mb-4 flex items-center gap-3 text-white">
                    <Layers className="h-5 w-5 text-chart-2" />
                    <h3 className="text-xl font-semibold">Key skills & tools</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {tags.map((skill) => (
                      <Badge
                        key={skill}
                        className="border border-cyan-300/40 bg-cyan-400/15 text-cyan-100 shadow-[0_0_35px_rgba(34,211,238,0.35)]"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {parsedMilestones.length > 0 && (
                <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/15 to-blue-500/10 p-8 backdrop-blur-xl">
                  <header className="mb-4 flex items-center gap-3 text-white">
                    <Layers className="h-5 w-5 text-blue-300" />
                    <h3 className="text-lg font-semibold">Milestone structure</h3>
                  </header>
                  <ul className="space-y-4">
                    {parsedMilestones.map((milestone) => (
                      <li
                        key={milestone.name}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white"
                      >
                        <span className="font-medium">{milestone.name}</span>
                        <span className="text-sm text-white/70">
                          {formatCurrency(milestone.amount, { maximumFractionDigits: 2 }) || 'TBD'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(supportingImages.length > 0 || projectFiles.length > 0) && (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
                  <div className="mb-6 flex items-center gap-3 text-white">
                    <Globe className="h-5 w-5 text-sky-300" />
                    <h3 className="text-xl font-semibold">Supporting material</h3>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {supportingImages.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                          Visual references
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {supportingImages.map((image, index) => {
                            const resolvedSrc = resolveJobMediaUrl(image) || image;
                            return (
                              <div
                                key={image}
                                className="group relative h-32 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-lg"
                              >
                                <Image
                                  src={resolvedSrc}
                                  alt={`${job.title} - Project image ${index + 1}`}
                                  fill
                                  className="object-cover transition duration-500 group-hover:scale-105"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {projectFiles.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Documents</p>
                        <ul className="space-y-3 text-sm text-white/80">
                          {projectFiles.map((file) => {
                            const href = resolveJobMediaUrl(file) || file;
                            const fileName = decodeURIComponent((file.split('/').pop() || '').trim()) || 'File';
                            return (
                              <li
                                key={file}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                              >
                                <span className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-white/50" />
                                  {fileName}
                                </span>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="border-white/20 bg-white/10 text-xs text-white/70 hover:border-white/40 hover:text-white"
                                >
                                  <a href={href} target="_blank" rel="noopener noreferrer">
                                    View
                                  </a>
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
                <h3 className="mb-6 text-lg font-semibold text-white">Role snapshot</h3>
                <ul className="space-y-4 text-sm text-white/70">
                  {employmentLabel && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Users className="h-4 w-4 text-white/40" />
                        Engagement
                      </span>
                      <span className="font-medium text-white">{employmentLabel}</span>
                    </li>
                  )}
                  {experienceLabel && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Radar className="h-4 w-4 text-white/40" />
                        Experience level
                      </span>
                      <span className="font-medium text-white">{experienceLabel}</span>
                    </li>
                  )}
                  {formattedDuration && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Clock className="h-4 w-4 text-white/40" />
                        Duration
                      </span>
                      <span className="font-medium text-white">{formattedDuration}</span>
                    </li>
                  )}
                  {job.projectSize && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Layers className="h-4 w-4 text-white/40" />
                        Project scope
                      </span>
                      <span className="font-medium text-white">{job.projectSize}</span>
                    </li>
                  )}
                  {formattedAvailability && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Clock className="h-4 w-4 text-white/40" />
                        Availability
                      </span>
                      <span className="font-medium text-white">{formattedAvailability}</span>
                    </li>
                  )}
                  {formattedProjectStage && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <Layers className="h-4 w-4 text-white/40" />
                        Project stage
                      </span>
                      <span className="font-medium text-white">{formattedProjectStage}</span>
                    </li>
                  )}
                  {formattedEnglishLevel && (
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-3 text-white/60">
                        <CheckCircle2 className="h-4 w-4 text-white/40" />
                        English level
                      </span>
                      <span className="font-medium text-white">{formattedEnglishLevel}</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/12 to-white/[4%] p-6 backdrop-blur-xl">
                <h3 className="mb-6 text-lg font-semibold text-white">Company</h3>
                <div className="space-y-4 text-sm text-white/70">
                  {companyName && (
                    <div>
                      <p className="text-white/60">Name</p>
                      <p className="text-white">{companyName}</p>
                    </div>
                  )}
                  {primaryLocation && (
                    <div>
                      <p className="text-white/60">Primary location</p>
                      <p className="text-white">{primaryLocation}</p>
                    </div>
                  )}
                  {job.companyWebsite && (
                    <div>
                      <p className="text-white/60">Website</p>
                      <a
                        href={
                          job.companyWebsite.startsWith('http')
                            ? job.companyWebsite
                            : `https://${job.companyWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Globe className="h-4 w-4" />
                        {job.companyWebsite.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h3 className="mb-4 text-lg font-semibold text-white">Share</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    className="flex-1 border border-[#0077B5]/40 bg-[#0077B5]/20 text-[#9bd4ff] hover:border-[#0077B5]/60 hover:bg-[#0077B5]/30"
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const shareUrl = encodeURIComponent(window.location.href);
                      shareTo(`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}`);
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 border border-[#1DA1F2]/40 bg-[#1DA1F2]/20 text-[#9ad5ff] hover:border-[#1DA1F2]/60 hover:bg-[#1DA1F2]/30"
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const shareText = encodeURIComponent(`Check out this role: ${job.title}`);
                      const shareUrl = encodeURIComponent(window.location.href);
                      shareTo(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`);
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    X / Twitter
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20"
                    onClick={() => {
                      if (typeof window === 'undefined') return;
                      const shareText = `I thought you might be interested in this opportunity: ${job.title}\n${window.location.href}`;
                      copyToClipboard(shareText);
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:hidden">
          <Button
            size="lg"
            className="w-full border-0 bg-green-500 text-white shadow-[0_15px_35px_-15px_rgba(34,197,94,0.9)] hover:bg-green-600"
            onClick={() => {
              const buyerName = session?.session?.user?.user_metadata?.firstName ? `${session.session.user.user_metadata.firstName} ${session.session.user.user_metadata.lastName}` : 'a buyer';
              const artistName = job.companyName || 'the artist';
              const message = `Hi Vivid Art Admin, I am ${buyerName}. I want to know about ${job.title} by ${artistName}.`;
              const url = `https://wa.me/940783813833?text=${encodeURIComponent(message)}`;
              window.open(url, '_blank');
            }}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Ask About Pricing
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JobDetailClient;
