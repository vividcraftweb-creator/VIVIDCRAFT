'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  CheckCircle,
  Clock,
  Shield,
  Palette,
  Sparkles,
  Briefcase,
  ChevronDown,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import ArtistCard, { getPublicUrl } from '@/components/artists/ArtistCard';
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
  const [loading, setLoading] = useState(initialProfiles.length === 0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Multi-select category filter states
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<'style' | 'specialty' | 'service' | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 1. Direct Supabase Query: Fetch all artists directly from 'profiles' table
  useEffect(() => {
    const supabase = createClient();

    async function loadAllProfiles() {
      setLoading(true);
      try {
        const { data: artists, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'artist')
          .order('display_order', { ascending: true });

        if (error) {
          console.error("Error fetching artists from profiles:", error);
          if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
            setProfiles(initialProfiles);
          }
          return;
        }

        if (artists && Array.isArray(artists)) {
          const profilesMap = new Map<string, any>();
          for (const p of artists) {
            const key = p.id || p.userId || p.user_id;
            if (key) {
              const avatar = p.avatar_url || p.profile_picture || p.profilePicture || p.avatar || p.image;
              profilesMap.set(key, {
                ...p,
                id: key,
                userId: p.user_id || p.userId || key,
                avatar_url: avatar,
                profile_picture: avatar,
                art_styles: p.art_styles || p.mediums || [],
                art_specialties: p.art_specialties || p.specialties || [],
                services_offered: p.services_offered || p.services || [],
                display_order: p.display_order ?? 999,
              });
            }
          }
          const sorted = Array.from(profilesMap.values()).sort(
            (a, b) => (Number(a.display_order ?? 999)) - (Number(b.display_order ?? 999))
          );
          setProfiles(sorted);
        } else if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
          setProfiles(initialProfiles);
        }
      } catch (err) {
        console.error("Emergency load profiles error:", err);
        if (Array.isArray(initialProfiles) && initialProfiles.length > 0) {
          setProfiles(initialProfiles);
        }
      } finally {
        setLoading(false);
      }
    }

    loadAllProfiles();

    // Subscribe to realtime database updates
    const channel = supabase
      .channel('realtime-all-profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadAllProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute available category options dynamically from constants + loaded profiles
  const availableStyles = useMemo(() => {
    const set = new Set<string>(ARTIST_MEDIUMS);
    profiles.forEach((p) => {
      const arr = p.art_styles || p.mediums;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x)));
    });
    return Array.from(set);
  }, [profiles]);

  const availableSpecialties = useMemo(() => {
    const set = new Set<string>(ARTIST_SPECIALTIES);
    profiles.forEach((p) => {
      const arr = p.art_specialties || p.specialties;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x)));
    });
    return Array.from(set);
  }, [profiles]);

  const availableServices = useMemo(() => {
    const set = new Set<string>(ARTIST_SERVICES);
    profiles.forEach((p) => {
      const arr = p.services_offered || p.services;
      if (Array.isArray(arr)) arr.forEach((x) => x && set.add(String(x)));
    });
    return Array.from(set);
  }, [profiles]);

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

  const clearAllFilters = () => {
    setSelectedStyles([]);
    setSelectedSpecialties([]);
    setSelectedServices([]);
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedStyles.length > 0 ||
    selectedSpecialties.length > 0 ||
    selectedServices.length > 0;

  // 2. Filter profiles dynamically with array overlap logic while strictly preserving display_order ASC
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
        const skills = Array.isArray(artist.skills) ? artist.skills.join(', ') : (artist.skills || '');
        const loc = artist.location || artist.address || '';
        const text = `${fName} ${lName} ${fullName} ${email} ${title} ${bio} ${skills} ${loc}`.toLowerCase();
        return text.includes(q);
      });
    }

    // Art styles multi-select filter (strict array overlap logic)
    if (selectedStyles.length > 0) {
      result = result.filter((artist: any) => {
        const artistStyles: string[] = [
          ...(artist.art_styles || []),
          ...(artist.mediums || []),
        ].map((x: string) => String(x).toLowerCase());
        return selectedStyles.every((s) => artistStyles.includes(s.toLowerCase()));
      });
    }

    // Specialties multi-select filter (strict array overlap logic)
    if (selectedSpecialties.length > 0) {
      result = result.filter((artist: any) => {
        const artistSpecialties: string[] = [
          ...(artist.art_specialties || []),
          ...(artist.specialties || []),
        ].map((x: string) => String(x).toLowerCase());
        return selectedSpecialties.every((s) => artistSpecialties.includes(s.toLowerCase()));
      });
    }

    // Services multi-select filter (strict array overlap logic)
    if (selectedServices.length > 0) {
      result = result.filter((artist: any) => {
        const artistServices: string[] = [
          ...(artist.services_offered || []),
          ...(artist.services || []),
        ].map((x: string) => String(x).toLowerCase());
        return selectedServices.every((s) => artistServices.includes(s.toLowerCase()));
      });
    }

    // Strictly preserve manual artist ordering (display_order ASC)
    return result.sort(
      (a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999)
    );
  }, [profiles, searchQuery, selectedStyles, selectedSpecialties, selectedServices]);

  const resetSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen">
      <header className="px-4 pt-6 pb-2 sm:pt-6 sm:pb-2 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Vivid Art Marketplace
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Discover <span className="text-primary">Top Artists &amp; Creators</span>
            </h1>
          </div>

          {/* Compact Search Input & Button */}
          <div className="mx-auto mt-4 max-w-xl">
            <div className="glass-card rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-1.5 sm:p-2 shadow-md backdrop-blur">
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
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Multi-Select Category Filters */}
          <div ref={dropdownRef} className="relative mx-auto mt-3 max-w-2xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {/* Filter 1: Medium / Art Style */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'style' ? null : 'style')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition shadow-sm cursor-pointer ${
                    selectedStyles.length > 0
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Palette className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Art Style</span>
                  {selectedStyles.length > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {selectedStyles.length}
                    </span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'style' ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === 'style' && (
                  <div className="absolute left-0 sm:left-auto z-50 mt-1.5 w-64 sm:w-72 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Medium / Art Style</span>
                      {selectedStyles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStyles([])}
                          className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {availableStyles.map((item) => {
                        const isChecked = selectedStyles.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => toggleStyle(item)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer select-none"
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                            }`}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className={`flex-1 ${isChecked ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter 2: Specialty / Art Type */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'specialty' ? null : 'specialty')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition shadow-sm cursor-pointer ${
                    selectedSpecialties.length > 0
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Specialty</span>
                  {selectedSpecialties.length > 0 && (
                    <span className="rounded-full bg-indigo-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {selectedSpecialties.length}
                    </span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'specialty' ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === 'specialty' && (
                  <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 z-50 mt-1.5 w-64 sm:w-72 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Specialty / Art Type</span>
                      {selectedSpecialties.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialties([])}
                          className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {availableSpecialties.map((item) => {
                        const isChecked = selectedSpecialties.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => toggleSpecialty(item)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer select-none"
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                            }`}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className={`flex-1 ${isChecked ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter 3: Services Offered */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition shadow-sm cursor-pointer ${
                    selectedServices.length > 0
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Services Offered</span>
                  {selectedServices.length > 0 && (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {selectedServices.length}
                    </span>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === 'service' ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === 'service' && (
                  <div className="absolute right-0 z-50 mt-1.5 w-64 sm:w-72 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Services Offered</span>
                      {selectedServices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedServices([])}
                          className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {availableServices.map((item) => {
                        const isChecked = selectedServices.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => toggleService(item)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer select-none"
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                            }`}>
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className={`flex-1 ${isChecked ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Filters Display & Reset */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
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
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 pt-2 pb-20 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {mounted
              ? `Showing ${displayedArtists.length} ${displayedArtists.length === 1 ? 'artist' : 'artists'}`
              : 'Showing artists'}
          </p>
          {(searchQuery || hasActiveFilters) && (
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-primary transition hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Clear all filters
            </button>
          )}
        </div>

        {/* 3. Direct Card Grid Rendering */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {loading && (!displayedArtists || displayedArtists.length === 0) &&
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6">
                <Skeleton className="mb-4 h-10 w-10 rounded-full" />
                <Skeleton className="mb-2 h-4 w-32" />
                <Skeleton className="mb-4 h-3 w-48" />
                <Skeleton className="mb-2 h-3 w-full" />
                <Skeleton className="mb-2 h-3 w-3/4" />
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              </div>
            ))}

          {Array.isArray(displayedArtists) && displayedArtists.length > 0 &&
            displayedArtists.map((artist: any) => (
              <ArtistCard
                key={artist.id || artist.userId || Math.random().toString()}
                artist={artist}
              />
            ))}
        </div>

        {!loading && displayedArtists.length === 0 && (
          <div className="col-span-full mt-12 rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center shadow-inner">
            <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">No artists found</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Try adjusting your search or category filters to view all artists.
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
      </main>
    </div>
  );
}
