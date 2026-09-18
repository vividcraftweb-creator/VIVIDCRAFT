'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Shield,
  Palette,
  Sparkles,
  Briefcase,
  ChevronDown,
  X,
  RotateCcw,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import ArtistCard from '@/components/artists/ArtistCard';
import { isArtistProfile, isArtistRole } from '@/lib/artist-filter';
import {
  ARTIST_MEDIUMS,
  ARTIST_SPECIALTIES,
  ARTIST_SERVICES,
  normalizeTags,
  parseTags,
} from '@/lib/artist-categories';
export { normalizeTags, parseTags };

export const dynamic = 'force-dynamic';

function getAvatarUrl(userId?: string, raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return getProfilePictureUrl(userId, trimmed);
}

/**
 * Validates that a profile is a legitimate artist (not a client or admin)
 */
function isValidArtist(p: any): boolean {
  if (!p) return false;
  const role = String(p.role || p.user_type || p.account_type || '').toLowerCase().trim();
  if (
    role === 'client' ||
    role.includes('client') ||
    role === 'buyer' ||
    role === 'admin' ||
    role === 'employer'
  ) {
    return false;
  }
  return isArtistProfile(p) || isArtistRole(p.role) || role === 'artist' || role === 'freelancer';
}

/**
 * Populates default array columns and normalizes an artist profile object
 */
export function normalizeArtistProfile(p: any) {
  if (!p) return null;
  const key = p.id || p.userId || p.user_id;
  const avatar = p.avatar_url || p.profile_picture || p.profilePicture || p.avatar || p.image;

  const stylesArr = normalizeTags(p.art_styles);
  const specialtiesArr = normalizeTags(p.art_specialties);
  const servicesArr = normalizeTags(p.services_offered);

  return {
    ...p,
    id: key,
    userId: p.user_id || p.userId || key,
    avatar_url: avatar,
    profile_picture: avatar,
    art_styles: stylesArr,
    art_specialties: specialtiesArr,
    services_offered: servicesArr,
    display_order: p.display_order ?? 999,
  };
}

interface FilterContentProps {
  availableStyles: string[];
  selectedStyles: string[];
  toggleStyle: (val: string) => void;
  availableSpecialties: string[];
  selectedSpecialties: string[];
  toggleSpecialty: (val: string) => void;
  availableServices: string[];
  selectedServices: string[];
  toggleService: (val: string) => void;
  openSections: { styles: boolean; specialties: boolean; services: boolean };
  toggleSection: (section: 'styles' | 'specialties' | 'services') => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  totalActiveFilters: number;
}

function FilterContent({
  availableStyles,
  selectedStyles,
  toggleStyle,
  availableSpecialties,
  selectedSpecialties,
  toggleSpecialty,
  availableServices,
  selectedServices,
  toggleService,
  openSections,
  toggleSection,
  clearAllFilters,
  hasActiveFilters,
  totalActiveFilters,
}: FilterContentProps) {
  return (
    <div className="flex flex-col">
      {/* Filter Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Filters</h2>
          {hasActiveFilters && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-medium text-muted-foreground hover:text-primary transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Clear all filters
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
        {/* Category 1: Medium / Art Style */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleSection('styles')}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-foreground transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-amber-500" />
              <span>Medium / Art Style</span>
              {selectedStyles.length > 0 && (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {selectedStyles.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openSections.styles ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.styles && (
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableStyles.map((item) => {
                const isChecked = selectedStyles.includes(item);
                return (
                  <div
                    key={item}
                    onClick={() => toggleStyle(item)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category 2: Specialty / Art Type */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleSection('specialties')}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-foreground transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Specialty / Art Type</span>
              {selectedSpecialties.length > 0 && (
                <span className="rounded-full bg-indigo-500/10 px-1.5 py-0.2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedSpecialties.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openSections.specialties ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.specialties && (
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableSpecialties.map((item) => {
                const isChecked = selectedSpecialties.includes(item);
                return (
                  <div
                    key={item}
                    onClick={() => toggleSpecialty(item)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category 3: Services Offered */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => toggleSection('services')}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 hover:text-foreground transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              <span>Services Offered</span>
              {selectedServices.length > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedServices.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                openSections.services ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.services && (
            <div className="mt-3 max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableServices.map((item) => {
                const isChecked = selectedServices.includes(item);
                return (
                  <div
                    key={item}
                    onClick={() => toggleService(item)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      checked={isChecked}
                      className="pointer-events-none data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FreelancersPageClient({
  initialProfiles = [],
}: {
  initialProfiles?: any[];
}) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initial profiles passed from the server with normalized array columns
  const [profiles, setProfiles] = useState<any[]>(() => {
    return Array.isArray(initialProfiles)
      ? initialProfiles.map(normalizeArtistProfile).filter(Boolean)
      : [];
  });

  const [loading, setLoading] = useState(initialProfiles.length === 0);

  // Multi-select category filter states (immediately triggers re-filtering)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Category accordion expand/collapse state in left sidebar
  const [openSections, setOpenSections] = useState<{
    styles: boolean;
    specialties: boolean;
    services: boolean;
  }>({
    styles: true,
    specialties: true,
    services: true,
  });

  // Mobile drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure hydration synchronization if initialProfiles is provided or updated
  useEffect(() => {
    if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
      setProfiles(initialProfiles.map(normalizeArtistProfile).filter(Boolean));
      setLoading(false);
    }
  }, [initialProfiles]);

  // Fetch profiles on client only if initialProfiles was empty, never overriding populated initialProfiles
  useEffect(() => {
    if (profiles.length > 0) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    async function fetchInitialProfiles() {
      setLoading(true);
      try {
        const { data: artists, error } = await supabase
          .from('profiles')
          .select('*, art_styles, art_specialties, services_offered')
          .or('role.eq.ARTIST,role.eq.artist')
          .order('display_order', { ascending: true });

        if (!error && artists && Array.isArray(artists) && artists.length > 0) {
          const mapped = artists
            .filter(isValidArtist)
            .map(normalizeArtistProfile)
            .filter(Boolean);
          setProfiles(mapped);
        }
      } catch (err) {
        console.error('Error fetching profiles from client:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialProfiles();
  }, [profiles.length]);

  // Compute available category options dynamically from constants + loaded profiles
  const availableStyles = useMemo(() => {
    const set = new Set<string>(ARTIST_MEDIUMS);
    profiles.forEach((p) => {
      const arr = p.art_styles;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [profiles]);

  const availableSpecialties = useMemo(() => {
    const set = new Set<string>(ARTIST_SPECIALTIES);
    profiles.forEach((p) => {
      const arr = p.art_specialties;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [profiles]);

  const availableServices = useMemo(() => {
    const set = new Set<string>(ARTIST_SERVICES);
    profiles.forEach((p) => {
      const arr = p.services_offered;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [profiles]);

  // Category selection toggle handlers: immediately updates state arrays to trigger instant re-filtering
  const toggleStyle = (val: string) => {
    setSelectedStyles((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const toggleSpecialty = (val: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const toggleService = (val: string) => {
    setSelectedServices((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const toggleSection = (section: 'styles' | 'specialties' | 'services') => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearAllFilters = () => {
    setSelectedStyles([]);
    setSelectedSpecialties([]);
    setSelectedServices([]);
    setSearchQuery('');
  };

  const totalActiveFilters =
    selectedStyles.length + selectedSpecialties.length + selectedServices.length;
  const hasActiveFilters = totalActiveFilters > 0;

  // 1. FORGIVING CLIENT-SIDE FILTERING LOGIC
  // Checks array existence, case-insensitivity, exact-trimming, and forgiving overlap
  const displayedArtists = useMemo(() => {
    let result = profiles;

    // Search query filter (only when user enters search text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((artist: any) => {
        const fName = artist.first_name || artist.firstName || '';
        const lName = artist.last_name || artist.lastName || '';
        const fullName = artist.full_name || artist.name || '';
        const email = artist.email || artist.businessEmail || artist.business_email || '';
        const title = artist.title || artist.professional_title || '';
        const bio = artist.bio || artist.description || '';
        const skills = Array.isArray(artist.skills)
          ? artist.skills.join(', ')
          : artist.skills || '';
        const loc = artist.location || artist.address || '';
        const text = `${fName} ${lName} ${fullName} ${email} ${title} ${bio} ${skills} ${loc}`.toLowerCase();
        return text.includes(q);
      });
    }

    // 1. SAFE ARRAY FILTERING & CATEGORY MATCHING: MATCH IF ARTIST HAS AT LEAST ONE OF THE SELECTED TAGS (OR FILTER)
    result = result.filter((artist: any) => {
      const styles = normalizeTags(artist.art_styles);
      const specialties = normalizeTags(artist.art_specialties);
      const services = normalizeTags(artist.services_offered);

      // MATCH IF ARTIST HAS AT LEAST ONE OF THE SELECTED STYLES
      const matchStyle =
        selectedStyles.length === 0 ||
        selectedStyles.some((s) => {
          const target = s.toLowerCase().trim();
          return (
            styles.includes(target) ||
            styles.some((item) => item.includes(target) || target.includes(item))
          );
        });

      // MATCH IF ARTIST HAS AT LEAST ONE OF THE SELECTED SPECIALTIES
      const matchSpec =
        selectedSpecialties.length === 0 ||
        selectedSpecialties.some((s) => {
          const target = s.toLowerCase().trim();
          return (
            specialties.includes(target) ||
            specialties.some((item) => item.includes(target) || target.includes(item))
          );
        });

      // MATCH IF ARTIST HAS AT LEAST ONE OF THE SELECTED SERVICES
      const matchServ =
        selectedServices.length === 0 ||
        selectedServices.some((s) => {
          const target = s.toLowerCase().trim();
          return (
            services.includes(target) ||
            services.some((item) => item.includes(target) || target.includes(item))
          );
        });

      return matchStyle && matchSpec && matchServ;
    });

    // 3. ABSOLUTE GUARDRAILS: Strictly leave display_order manual sorting untouched
    return result.sort(
      (a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999)
    );
  }, [profiles, searchQuery, selectedStyles, selectedSpecialties, selectedServices]);

  return (
    <div className="min-h-screen pb-20">
      {/* Top Hero / Header */}
      <header className="px-4 pt-6 pb-4 sm:pt-8 sm:pb-6 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Vivid Art Marketplace
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Discover <span className="text-primary">Top Artists &amp; Creators</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Browse verified creative talent, explore original mediums, and commission custom artwork.
            </p>
          </div>

          {/* Compact Search Input */}
          <div className="mx-auto mt-5 max-w-xl">
            <div className="glass-card rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-1.5 sm:p-2 shadow-sm backdrop-blur">
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchQuery((prev) => prev.trim());
                }}
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by artist name, style, or skills…"
                    className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 py-2 pl-10 pr-3 text-sm text-foreground shadow-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Left Sidebar Panel (col-span-3) + Artist Grid (col-span-9) */}
      <main className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 1. Dedicated Left Sidebar Panel (col-span-3 on desktop) */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-5 shadow-sm backdrop-blur">
              <FilterContent
                availableStyles={availableStyles}
                selectedStyles={selectedStyles}
                toggleStyle={toggleStyle}
                availableSpecialties={availableSpecialties}
                selectedSpecialties={selectedSpecialties}
                toggleSpecialty={toggleSpecialty}
                availableServices={availableServices}
                selectedServices={selectedServices}
                toggleService={toggleService}
                openSections={openSections}
                toggleSection={toggleSection}
                clearAllFilters={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
                totalActiveFilters={totalActiveFilters}
              />
            </div>
          </aside>

          {/* 2. Artist Grid Section (col-span-9 on desktop) */}
          <div className="col-span-1 lg:col-span-9 space-y-4">
            {/* Top Results Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 px-4 py-3 backdrop-blur shadow-xs">
              <div className="flex items-center gap-3">
                {/* Mobile Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="inline-flex lg:hidden items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {totalActiveFilters}
                    </span>
                  )}
                </button>

                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {mounted && !loading
                    ? `Showing ${displayedArtists.length} ${
                        displayedArtists.length === 1 ? 'artist' : 'artists'
                      }`
                    : 'Showing artists...'}
                </p>
              </div>

              {(searchQuery || hasActiveFilters) && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-primary transition hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Clear all filters
                </button>
              )}
            </div>

            {/* Active Filter Chips Row */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedStyles.map((style) => (
                  <button
                    key={`chip-style-${style}`}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition group cursor-pointer"
                  >
                    <span>{style}</span>
                    <X className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
                {selectedSpecialties.map((spec) => (
                  <button
                    key={`chip-spec-${spec}`}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition group cursor-pointer"
                  >
                    <span>{spec}</span>
                    <X className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
                {selectedServices.map((srv) => (
                  <button
                    key={`chip-srv-${srv}`}
                    type="button"
                    onClick={() => toggleService(srv)}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition group cursor-pointer"
                  >
                    <span>{srv}</span>
                    <X className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-foreground transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            )}

            {/* Artist Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="glass-card rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6"
                  >
                    <Skeleton className="mb-4 h-10 w-10 rounded-full" />
                    <Skeleton className="mb-2 h-4 w-32" />
                    <Skeleton className="mb-4 h-3 w-48" />
                    <Skeleton className="mb-2 h-3 w-full" />
                    <Skeleton className="mb-2 h-3 w-3/4" />
                    <Skeleton className="mt-4 h-10 w-full rounded-lg" />
                  </div>
                ))}

              {!loading &&
                Array.isArray(displayedArtists) &&
                displayedArtists.length > 0 &&
                displayedArtists.map((artist: any) => (
                  <ArtistCard
                    key={artist.id || artist.userId || Math.random().toString()}
                    artist={artist}
                  />
                ))}
            </div>

            {/* Empty State */}
            {!loading && displayedArtists.length === 0 && (
              <div className="col-span-full mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center shadow-inner">
                <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">No artists found</h3>
                <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
                  We couldn&apos;t find any artists matching your active filters. Try adjusting your selections or clearing filters.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 cursor-pointer"
                >
                  Show all artists
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Drawer / Expandable Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col z-10 border-r border-zinc-200 dark:border-zinc-800">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-foreground uppercase tracking-wider">
                  Filter Artists
                </span>
                {hasActiveFilters && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {totalActiveFilters}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <FilterContent
                availableStyles={availableStyles}
                selectedStyles={selectedStyles}
                toggleStyle={toggleStyle}
                availableSpecialties={availableSpecialties}
                selectedSpecialties={selectedSpecialties}
                toggleSpecialty={toggleSpecialty}
                availableServices={availableServices}
                selectedServices={selectedServices}
                toggleService={toggleService}
                openSections={openSections}
                toggleSection={toggleSection}
                clearAllFilters={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
                totalActiveFilters={totalActiveFilters}
              />
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-xs font-semibold text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named exports for explicit imports
export { FreelancersPageClient as ArtistsPage, FreelancersPageClient as ArtistsPageClient };
