'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { trackEvent } from '@/utils/analytics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Filter, Loader2, X, Crown, Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { inferRouterInputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/router';
import { JOB_CATEGORIES, JOB_SKILL_GROUPS } from '@/constants/job-taxonomy';

type FiltersState = {
  search: string;
  categories: string[];
  skills: string[];
  minBudget: string;
  maxBudget: string;
};

const DEFAULT_LIMIT = 18;
const SEARCH_DEBOUNCE_MS = 400;
type JobsGetJobsInput = inferRouterInputs<AppRouter>['jobs']['getJobs'];

export default function JobsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    categories: [],
    skills: [],
    minBudget: '',
    maxBudget: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  const minBudgetValue =
    filters.minBudget && !Number.isNaN(Number(filters.minBudget))
      ? Number(filters.minBudget)
      : undefined;
  const maxBudgetValue =
    filters.maxBudget && !Number.isNaN(Number(filters.maxBudget))
      ? Number(filters.maxBudget)
      : undefined;
  const budgetError =
    minBudgetValue !== undefined &&
    maxBudgetValue !== undefined &&
    minBudgetValue > maxBudgetValue;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.categories, filters.skills, minBudgetValue, maxBudgetValue]);

  // Mobile detection and filter visibility
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setShowFilters(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.categories.length > 0) count++;
    if (filters.skills.length > 0) count++;
    if (filters.minBudget || filters.maxBudget) count++;
    return count;
  }, [filters]);

  const jobsQueryInput = useMemo(() => {
    const input: JobsGetJobsInput = {
      page,
      limit: DEFAULT_LIMIT,
    };

    if (debouncedSearch) {
      input.search = debouncedSearch;
    }

    if (!budgetError && typeof minBudgetValue === 'number') {
      input.minBudget = minBudgetValue;
    }

    if (!budgetError && typeof maxBudgetValue === 'number') {
      input.maxBudget = maxBudgetValue;
    }

    if (filters.skills.length > 0) {
      input.tags = filters.skills;
    }

    if (filters.categories.length > 0) {
      input.categories = filters.categories;
    }

    return input;
  },
    [
      debouncedSearch,
      filters.skills,
      filters.categories,
      budgetError,
      minBudgetValue,
      maxBudgetValue,
      page,
    ]
  );

  const {
    data,
    isLoading,
    isFetching,
  } = trpc.jobs.getJobs.useQuery(jobsQueryInput);

  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    if (value === '' || /^[0-9]*$/.test(value)) {
      setFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categories: [],
      skills: [],
      minBudget: '',
      maxBudget: '',
    });
    setPage(1);
    trackEvent('filter_interaction', { filter_type: 'reset' });
  };

  const pagination = data?.pagination;
  const jobs = data?.jobs ?? [];
  const isEmpty = !isLoading && jobs.length === 0;

  const formatMeta = (value?: string | null) => {
    if (!value) return null;
    // Handle duration formats like "1_3_months" -> "1-3 Months"
    if (value.match(/^\d+_\d+_/)) {
      return value
        .replace(/^(\d+)_(\d+)_/, '$1-$2 ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
    // Handle other formats normally
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatCurrency = (amount?: number | null, options: Intl.NumberFormatOptions = {}) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return null;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  };

  const getBudgetDisplay = (job: {
    paymentType?: string | null;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
    budget?: number | null;
  }) => {
    if (job.paymentType === 'hourly') {
      const min = formatCurrency(job.hourlyRateMin, { maximumFractionDigits: 2 });
      const max = formatCurrency(job.hourlyRateMax, { maximumFractionDigits: 2 });

      if (min && max) {
        return `${min} - ${max}/hr`;
      }

      if (min || max) {
        return `${min || max}/hr`;
      }

      return null;
    }

    return formatCurrency(job.budget);
  };

  return (
    <section className="pt-6 pb-12 sm:pt-8 sm:pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            <Badge className="w-fit bg-primary/15 text-primary">
              <Filter className="mr-2 h-3.5 w-3.5" />
              Open Roles
            </Badge>
            <span className="text-sm text-muted-foreground">
              {isFetching ? 'Updating…' : `${pagination?.totalCount ?? 0} jobs`}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore live opportunities
          </h1>
        </div>

        {/* Mobile Filter Toggle Button */}
        {isMobile && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-between h-12 border-white/20 bg-background/80 hover:bg-background"
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="font-semibold">
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 bg-primary text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </span>
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Main Layout: Sidebar + Content */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left Sidebar - Filters */}
          {(showFilters || !isMobile) && (
            <aside className="w-full lg:sticky lg:top-6 lg:w-72 lg:shrink-0 animate-in slide-in-from-top-4 duration-300 lg:animate-none">
              <Card className="border-white/10 bg-background/80 shadow-lg backdrop-blur">
                <CardContent className="space-y-5 p-5">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Search
                  </label>
                  <Input
                    placeholder="Keywords, title..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </label>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-background/70 px-3 py-2 text-sm"
                    value={filters.categories[0] ?? ''}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        categories: e.target.value ? [e.target.value] : [],
                      }))
                    }
                  >
                    <option value="">All categories</option>
                    {JOB_CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Skill */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skill
                  </label>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-background/70 px-3 py-2 text-sm"
                    value={filters.skills[0] ?? ''}
                    onChange={(e) =>
                      setFilters(prev => ({
                        ...prev,
                        skills: e.target.value ? [e.target.value] : [],
                      }))
                    }
                  >
                    <option value="">All skills</option>
                    {JOB_SKILL_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.skills.map(skill => (
                          <option key={skill} value={skill}>
                            {skill}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Budget Range */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Budget Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Min"
                      value={filters.minBudget}
                      onChange={(e) => handleBudgetChange('minBudget', e.target.value)}
                      className="h-9"
                    />
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Max"
                      value={filters.maxBudget}
                      onChange={(e) => handleBudgetChange('maxBudget', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {budgetError && (
                    <p className="text-xs text-destructive">
                      Min cannot exceed max
                    </p>
                  )}
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Sort By
                  </label>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-background/70 px-3 py-2 text-sm"
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                    defaultValue="latest"
                  >
                    <option value="latest">Latest</option>
                    <option value="budget_desc">Highest budget</option>
                    <option value="budget_asc">Lowest budget</option>
                  </select>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={isFetching}
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>

                {/* Close Filters Button (Mobile Only) */}
                {isMobile && (
                  <Button
                    onClick={() => setShowFilters(false)}
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Close Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
          )}

          {/* Right Content - Job Listings */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isEmpty ? (
              <Card className="border-dashed border-white/20 bg-background/70">
                <CardContent className="py-12 text-center">
                  <h3 className="text-xl font-semibold text-foreground">No roles match yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Adjust your filters or try a different keyword to discover more opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-5">
                  {jobs.map(job => {
                    const budgetDisplay = getBudgetDisplay(job);
                    const priorityPlacement = (job as any).priorityPlacement || 'none';
                    const isFeatured = priorityPlacement === 'featured';
                    const isPriority = priorityPlacement === 'priority';

                    return (
                      <Card
                        key={job.id}
                        className={`border-white/5 bg-background/80 shadow-lg backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 ${
                          isFeatured ? 'ring-2 ring-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent' :
                          isPriority ? 'ring-1 ring-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent' : ''
                        }`}
                      >
                        <CardContent className="flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-start sm:gap-8">
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1">
                                <Link
                                  href={`/jobs/${job.slug}`}
                                  className="group inline-flex items-center gap-2 text-left"
                                >
                                  <CardTitle className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                                    {job.title}
                                  </CardTitle>
                                </Link>
                                <CardDescription className="mt-1 text-xs uppercase tracking-wide text-primary/70">
                                  Posted {new Date(job.createdAt).toLocaleDateString()}
                                </CardDescription>
                                {job.companyName && (
                                  <p className="text-sm font-medium text-foreground/80">
                                    {job.companyName}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {isFeatured && (
                                  <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                                    <Crown className="mr-1 h-3 w-3" />
                                    Featured
                                  </Badge>
                                )}
                                {isPriority && !isFeatured && (
                                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                                    <Star className="mr-1 h-3 w-3" />
                                    Promoted
                                  </Badge>
                                )}
                                {job.category && (
                                  <Badge className="bg-primary/15 text-primary">{formatMeta(job.category)}</Badge>
                                )}
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs">
                                  {job.status === 'OPEN' ? 'Open' : job.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {formatMeta(job.experienceLevel) && (
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-muted-foreground">
                                  {formatMeta(job.experienceLevel)}
                                </Badge>
                              )}
                              {formatMeta(job.projectDuration) && (
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-muted-foreground">
                                  {formatMeta(job.projectDuration)}
                                </Badge>
                              )}
                              {formatMeta(job.jobType) && (
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-muted-foreground">
                                  {formatMeta(job.jobType)}
                                </Badge>
                              )}
                              {formatMeta(job.paymentType) && (
                                <Badge variant="outline" className="border-white/10 bg-white/5 text-xs text-muted-foreground">
                                  {formatMeta(job.paymentType)}
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {job.description.length > 220
                                ? `${job.description.slice(0, 220)}…`
                                : job.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              {(() => {
                                // Handle tags whether they're an array, JSON string, or comma-separated string
                                let tagsArray: string[] = [];

                                if (Array.isArray(job.tags)) {
                                  tagsArray = job.tags;
                                } else if (typeof job.tags === 'string' && job.tags.trim()) {
                                  // Try to parse as JSON first
                                  try {
                                    const parsed = JSON.parse(job.tags);
                                    if (Array.isArray(parsed)) {
                                      tagsArray = parsed;
                                    }
                                  } catch {
                                    // If not JSON, treat as comma-separated
                                    tagsArray = job.tags.split(',').map((tag: string) => tag.trim());
                                  }
                                }

                                return tagsArray
                                  .filter(Boolean)
                                  .slice(0, 10)
                                  .map((tag: string) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="border-white/10 bg-white/5 text-xs text-muted-foreground"
                                    >
                                      {tag}
                                    </Badge>
                                  ));
                              })()}
                            </div>
                          </div>

                          <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:w-56">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Budget
                              </p>
                              <p className="text-lg sm:text-xl font-semibold text-foreground">
                                {budgetDisplay ?? 'TBD'}
                              </p>
                            </div>
                            {job.deadline && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Applies until
                                </p>
                                <p className="text-sm text-foreground">
                                  {new Date(job.deadline).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {formatMeta(job.paymentType) && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Payment
                                </p>
                                <p className="text-sm text-foreground">{formatMeta(job.paymentType)}</p>
                              </div>
                            )}
                            <Button
                              asChild
                              size="sm"
                              className="w-full h-10 sm:h-9"
                            >
                              <Link href={`/jobs/${job.slug}`}>View details</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1 || isFetching}
                      className="h-10 px-6"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(prev => (pagination.hasNext ? prev + 1 : prev))}
                      disabled={!pagination.hasNext || isFetching}
                      className="h-10 px-6"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
