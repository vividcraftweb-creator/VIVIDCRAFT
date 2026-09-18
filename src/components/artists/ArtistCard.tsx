'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPublicUrl } from '@/lib/profile-helpers';
import { normalizeTags as baseNormalizeTags } from '@/lib/artist-categories';
export { getPublicUrl };

/**
 * Robust fallback helper for normalizeTags
 */
export const normalizeTags = (tags: any): string[] => {
  if (typeof baseNormalizeTags === 'function') {
    try {
      return baseNormalizeTags(tags);
    } catch {}
  }
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === 'string') {
    return tags.replace(/[\{\}\"\[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

export const parseTags = normalizeTags;

export interface ArtistProfile {
  id: string;
  userId?: string;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  businessEmail?: string | null;
  business_email?: string | null;
  avatar_url?: string | null;
  profile_picture?: string | null;
  profilePicture?: string | null;
  avatar?: string | null;
  image?: string | null;
  title?: string | null;
  professional_title?: string | null;
  bio?: string | null;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  skills?: string[] | string | null;
  art_styles?: string[] | null;
  art_specialties?: string[] | null;
  services_offered?: string[] | null;
  mediums?: string[] | null;
  specialties?: string[] | null;
  services?: string[] | null;
  other_categories?: string[] | null;
  display_order?: number | null;
  is_verified?: boolean;
  isVerified?: boolean;
}

export interface ArtistCardProps {
  artist?: ArtistProfile;
  profile?: ArtistProfile;
}

export default function ArtistCard({ artist: propArtist, profile: propProfile }: ArtistCardProps) {
  const artist = propArtist || propProfile;
  const [imgError, setImgError] = useState(false);
  const [discoveredAvatar, setDiscoveredAvatar] = useState<string | null>(null);

  if (!artist) return null;

  const artistId = artist.id || artist.userId || '';
  const firstName = artist.first_name || artist.firstName || '';
  const lastName = artist.last_name || artist.lastName || '';
  const email = artist.email || artist.businessEmail || artist.business_email || '';

  let displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (
    firstName.toLowerCase().includes('studio1') ||
    email.toLowerCase().includes('studio1.foreignbusiness') ||
    (firstName.toLowerCase().startsWith('studio') && !lastName)
  ) {
    displayName = 'studio One';
  } else if (!displayName) {
    displayName = artist.full_name || artist.name || artist.username || 'Artist';
  }

  const professionalTitle = artist.title || artist.professional_title || '';
  const bio = artist.bio || artist.description || '';

  const rawSkills = artist.skills;
  const skills: string[] = Array.isArray(rawSkills)
    ? rawSkills
    : typeof rawSkills === 'string' && rawSkills.trim()
    ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const styles: string[] = normalizeTags(artist.art_styles);
  const specialties: string[] = normalizeTags(artist.art_specialties);
  const services: string[] = normalizeTags(artist.services_offered);

  const hasCategories = styles.length > 0 || specialties.length > 0 || services.length > 0;

  const rawAvatar =
    discoveredAvatar ||
    artist.avatar_url ||
    artist.profile_picture ||
    artist.profilePicture ||
    artist.avatar ||
    artist.image;

  // Directly render avatar_url if present, or wrap relative path with getPublicUrl
  const avatarSrc = getPublicUrl(rawAvatar, artistId);
  const initialLetter = (firstName || displayName || 'A').charAt(0).toUpperCase();
  const locationVal = artist.location || artist.address || '';
  const isVerified = Boolean(artist.is_verified || artist.isVerified || (artist as any).verified);

  // If avatar is missing from database row, query Supabase storage in the background for uploaded avatar
  useEffect(() => {
    if (avatarSrc || !artistId) return;

    let isMounted = true;
    async function findStorageAvatar() {
      try {
        const supabase = createClient();
        const { data: files } = await supabase.storage.from('avatars').list(artistId, {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' },
        });

        if (files && files.length > 0 && files[0]?.name && isMounted) {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(`${artistId}/${files[0].name}`);
          if (pubData?.publicUrl) {
            setDiscoveredAvatar(pubData.publicUrl);
          }
        }
      } catch {}
    }

    findStorageAvatar();
    return () => {
      isMounted = false;
    };
  }, [artistId, avatarSrc]);

  return (
    <Link href={`/freelancers/${artistId}`} className="block">
      <article className="group flex h-full flex-col justify-between rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm dark:shadow-[0_20px_80px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-primary/40 dark:hover:border-primary/40 hover:cursor-pointer">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Avatar Component */}
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/20 ring-4 ring-primary/10 shadow-lg shadow-primary/25 transition-transform group-hover:scale-105 bg-muted">
                {avatarSrc && !imgError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarSrc}
                    alt={`${displayName} profile picture`}
                    className="h-full w-full object-cover rounded-full"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-chart-1/70 text-lg font-bold text-white">
                    {initialLetter}
                  </div>
                )}
              </div>

              {/* Name & Title */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 break-words text-base leading-snug transition-colors group-hover:text-primary">
                  {displayName}
                </h3>
                {professionalTitle && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{professionalTitle}</p>
                )}
                {isVerified && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verified Artist
                  </div>
                )}
              </div>
            </div>
          </div>

          {bio && (
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">{bio}</p>
          )}

          {hasCategories ? (
            <div className="flex flex-wrap gap-1.5">
              {styles.slice(0, 3).map((item) => (
                <span
                  key={`style-${item}`}
                  className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 capitalize"
                >
                  {item}
                </span>
              ))}
              {specialties.slice(0, 3).map((item) => (
                <span
                  key={`spec-${item}`}
                  className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 capitalize"
                >
                  {item}
                </span>
              ))}
              {services.slice(0, 2).map((item) => (
                <span
                  key={`srv-${item}`}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 capitalize"
                >
                  {item}
                </span>
              ))}
              {(styles.length + specialties.length + services.length > 8) && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  +{styles.length + specialties.length + services.length - 8} more
                </span>
              )}
            </div>
          ) : null}
        </div>

        <footer className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <div className="space-y-1">
            {locationVal ? (
              <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {locationVal}
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-yellow-400" />
                Available for commissions
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              View Artist
            </span>
          </div>
        </footer>
      </article>
    </Link>
  );
}
