'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, CheckCircle, Clock, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { getProfilePictureUrl } from '@/lib/profile-helpers';
import ArtistCard, { getPublicUrl } from '@/components/artists/ArtistCard';

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

  useEffect(() => {
    setMounted(true);
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
          .eq('role', 'artist');

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
              });
            }
          }
          setProfiles(Array.from(profilesMap.values()));
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

  // 2. Display all artist profiles without restrictive filters, filtering only on search query
  const displayedArtists = useMemo(() => {
    if (!searchQuery.trim()) {
      return profiles;
    }

    const q = searchQuery.toLowerCase().trim();
    return profiles.filter((artist: any) => {
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
  }, [profiles, searchQuery]);

  const resetSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen">
      <header className="px-4 pb-12 pt-6 sm:pb-16 sm:pt-8 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Vivid Art Marketplace
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Discover <span className="text-primary">Top Artists &amp; Creators</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
              Discover verified artists and creative professionals ready to bring your artistic visions to life. Search by artist name, style, or skills in seconds.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {mounted && displayedArtists.length > 0
                ? `${displayedArtists.length} ${displayedArtists.length === 1 ? 'artist' : 'artists'} available`
                : 'Discover amazing creative talent'}
            </p>
          </div>

          {/* Simple Search Input & Button */}
          <div className="mx-auto mt-10 max-w-3xl">
            <div className="glass-card rounded-3xl border border-white/5 bg-background/75 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.35)] backdrop-blur">
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
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
                    placeholder="Search by artist name, style, or skills…"
                    className="w-full rounded-2xl border border-white/10 bg-background/60 py-3 pl-12 pr-4 text-sm text-foreground shadow-inner shadow-black/20 transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:bg-primary/90"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {mounted
              ? `Showing ${displayedArtists.length} ${displayedArtists.length === 1 ? 'artist' : 'artists'}`
              : 'Showing artists'}
          </p>
          {searchQuery && (
            <button
              onClick={resetSearch}
              className="text-xs font-semibold text-primary transition hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        {/* 3. Direct Card Grid Rendering */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {loading && (!displayedArtists || displayedArtists.length === 0) &&
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
              Try adjusting your search terms or clear the search to view all artists.
            </p>
            <button
              type="button"
              onClick={resetSearch}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Show all artists
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
