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
import { isArtistProfile } from '@/lib/artist-filter';
import {
  ARTIST_MEDIUMS,
  ARTIST_SPECIALTIES,
  ARTIST_SERVICES,
} from '@/lib/artist-categories';

export const dynamic = 'force-dynamic';

function getAvatarUrl(userId?: string, raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return getProfilePictureUrl(userId, trimmed);
}

/**
 * Normalizes a tag string for forgiving comparison.
 */
function normalizeTag(tag: unknown): string {
  if (typeof tag !== 'string') return '';
  return tag.toLowerCase().trim();
}

/**
 * Safely extracts tags from string[], string (comma-separated), or null/undefined.
 */
function extractArtistTags(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
      .map(normalizeTag)
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(',')
      .map(normalizeTag)
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks if two tags match forgivingly:
 * 1. Exact case-insensitive match (e.g. "oil painting" === "oil painting")
 * 2. Bi-directional substring match (e.g. "digital art" matches "digital art & illustration")
 */
function tagMatches(artistTag: string, filterTag: string): boolean {
  if (!artistTag || !filterTag) return false;
  const a = normalizeTag(artistTag);
  const b = normalizeTag(filterTag);
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
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
            Reset all
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
                const inputId = `filter-style-${item.replace(/[^a-zA-Z0-9]/g, '-')}`;
                return (
                  <label
                    key={item}
                    htmlFor={inputId}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={() => toggleStyle(item)}
                      className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </label>
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
                const inputId = `filter-spec-${item.replace(/[^a-zA-Z0-9]/g, '-')}`;
                return (
                  <label
                    key={item}
                    htmlFor={inputId}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={() => toggleSpecialty(item)}
                      className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </label>
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
                const inputId = `filter-srv-${item.replace(/[^a-zA-Z0-9]/g, '-')}`;
                return (
                  <label
                    key={item}
                    htmlFor={inputId}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 cursor-pointer transition select-none"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={() => toggleService(item)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                    <span
                      className={`text-xs flex-1 ${
                        isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                  </label>
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
  const [profiles, setProfiles] = useState<any[]>(() => {
    return Array.isArray(initialProfiles) ? initialProfiles : [];
  });
  const [allKnownProfiles, setAllKnownProfiles] = useState<any[]>(() => {
    return Array.isArray(initialProfiles) ? initialProfiles : [];
  });
  const [loading, setLoading] = useState(initialProfiles.length === 0);

  // Multi-select category filter states
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

  // 1. Direct Supabase Query: Fetch artists from 'profiles' table using .contains() on array columns
  useEffect(() => {
    const supabase = createClient();

    async function loadFilteredProfiles() {
      setLoading(true);
      try {
        const hasCategoryFilters =
          selectedStyles.length > 0 ||
          selectedSpecialties.length > 0 ||
          selectedServices.length > 0;

        // Base query strictly targeting active artists
        let query = supabase
          .from('profiles')
          .select('*')
          .or('role.eq.artist,role.eq.ARTIST,role.ilike.artist');

        // Apply array column filters (.contains) instead of .eq()
        // Ensure string matching is exact-trimmed to match category strings stored during signup
        if (hasCategoryFilters) {
          if (selectedStyles.length > 0) {
            for (const style of selectedStyles) {
              const trimmed = style.trim();
              if (trimmed) {
                query = query.contains('mediums', [trimmed]);
              }
            }
          }

          if (selectedSpecialties.length > 0) {
            for (const specialty of selectedSpecialties) {
              const trimmed = specialty.trim();
              if (trimmed) {
                query = query.contains('specialties', [trimmed]);
              }
            }
          }

          if (selectedServices.length > 0) {
            for (const service of selectedServices) {
              const trimmed = service.trim();
              if (trimmed) {
                query = query.contains('services', [trimmed]);
              }
            }
          }
        }

        query = query.order('display_order', { ascending: true });

        let { data: artists, error } = await query;

        // Fallback: If strict DB array .contains() returned 0 results because of case-sensitivity
        // or column naming (mediums vs art_styles), query all active artists and apply
        // forgiving case-insensitive / trimmed matching to prevent false empty results!
        if (hasCategoryFilters && (!artists || artists.length === 0)) {
          const { data: allArtists, error: allErr } = await supabase
            .from('profiles')
            .select('*')
            .or('role.eq.artist,role.eq.ARTIST,role.ilike.artist')
            .order('display_order', { ascending: true });

          if (!allErr && allArtists && allArtists.length > 0) {
            const allSelected = [
              ...selectedStyles,
              ...selectedSpecialties,
              ...selectedServices,
            ].map(normalizeTag).filter(Boolean);

            artists = allArtists.filter((p: any) => {
              const tags = [
                ...extractArtistTags(p.mediums),
                ...extractArtistTags(p.art_styles),
                ...extractArtistTags(p.specialties),
                ...extractArtistTags(p.art_specialties),
                ...extractArtistTags(p.services),
                ...extractArtistTags(p.services_offered),
                ...extractArtistTags(p.other_categories),
                ...extractArtistTags(p.skills),
              ];
              return allSelected.some((sel) => tags.some((t) => tagMatches(t, sel)));
            });
          }
        }

        if (error && !artists) {
          console.error('Error fetching artists from profiles:', error);
          if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
            setProfiles(initialProfiles);
          }
          return;
        }

        if (artists && Array.isArray(artists)) {
          const profilesMap = new Map<string, any>();
          for (const p of artists) {
            if (!isArtistProfile(p)) continue;
            const key = p.id || p.userId || p.user_id;
            if (key) {
              const avatar =
                p.avatar_url || p.profile_picture || p.profilePicture || p.avatar || p.image;
              profilesMap.set(key, {
                ...p,
                id: key,
                userId: p.user_id || p.userId || key,
                avatar_url: avatar,
                profile_picture: avatar,
                mediums: p.mediums || p.art_styles || [],
                specialties: p.specialties || p.art_specialties || [],
                services: p.services || p.services_offered || [],
                art_styles: p.art_styles || p.mediums || [],
                art_specialties: p.art_specialties || p.specialties || [],
                services_offered: p.services_offered || p.services || [],
                display_order: p.display_order ?? 999,
              });
            }
          }
          const sorted = Array.from(profilesMap.values()).sort(
            (a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999)
          );
          setProfiles(sorted);

          // If no filters active, update allKnownProfiles to ensure all category options remain available
          if (!hasCategoryFilters) {
            setAllKnownProfiles(sorted);
          }
        } else if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
          setProfiles(initialProfiles);
        }
      } catch (err) {
        console.error('Emergency load profiles error:', err);
        if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
          setProfiles(initialProfiles);
        }
      } finally {
        setLoading(false);
      }
    }

    loadFilteredProfiles();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel('realtime-all-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadFilteredProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStyles, selectedSpecialties, selectedServices]);

  // Compute available category options dynamically from constants + all known profiles
  const availableStyles = useMemo(() => {
    const set = new Set<string>(ARTIST_MEDIUMS);
    allKnownProfiles.forEach((p) => {
      const arr = p.art_styles || p.mediums;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [allKnownProfiles]);

  const availableSpecialties = useMemo(() => {
    const set = new Set<string>(ARTIST_SPECIALTIES);
    allKnownProfiles.forEach((p) => {
      const arr = p.art_specialties || p.specialties;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [allKnownProfiles]);

  const availableServices = useMemo(() => {
    const set = new Set<string>(ARTIST_SERVICES);
    allKnownProfiles.forEach((p) => {
      const arr = p.services_offered || p.services;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x).trim()));
      else if (typeof arr === 'string' && arr.trim())
        arr.split(',').forEach((x) => x && set.add(x.trim()));
    });
    return Array.from(set);
  }, [allKnownProfiles]);

  // Category selection toggle handlers
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

  // Filter profiles dynamically while strictly preserving display_order ASC
  const displayedArtists = useMemo(() => {
    let result = profiles;

    // Search query filter
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

    // Selected filter tags across categories
    const allSelectedTags = [
      ...selectedStyles,
      ...selectedSpecialties,
      ...selectedServices,
    ]
      .map(normalizeTag)
      .filter(Boolean);

    // Ensure forgiving overlap matching with case-insensitive and trimmed comparison
    if (allSelectedTags.length > 0) {
      result = result.filter((artist: any) => {
        const artistTags: string[] = [
          ...extractArtistTags(artist.mediums),
          ...extractArtistTags(artist.art_styles),
          ...extractArtistTags(artist.specialties),
          ...extractArtistTags(artist.art_specialties),
          ...extractArtistTags(artist.services),
          ...extractArtistTags(artist.services_offered),
          ...extractArtistTags(artist.other_categories),
          ...extractArtistTags(artist.skills),
        ];

        if (artistTags.length === 0) {
          return false;
        }

        return allSelectedTags.some((selectedTag) =>
          artistTags.some((artistTag) => tagMatches(artistTag, selectedTag))
        );
      });
    }

    // Strictly preserve manual artist ordering (display_order ASC)
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
                  {mounted
                    ? `Showing ${displayedArtists.length} ${
                        displayedArtists.length === 1 ? 'artist' : 'artists'
                      }`
                    : 'Showing artists'}
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
              {loading && (!displayedArtists || displayedArtists.length === 0) &&
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
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

              {Array.isArray(displayedArtists) &&
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
                Reset All
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
