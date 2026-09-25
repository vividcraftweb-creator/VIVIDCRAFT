'use client';

import React, { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { MapPin, CheckCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getPublicUrl } from '@/lib/profile-helpers';
import { normalizeTags as baseNormalizeTags, parseDisplayTags } from '@/lib/artist-categories';
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
  return parseDisplayTags(tags);
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
  show_on_home?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  available_for_commissions?: boolean;
}

export interface ArtistCardProps {
  artist?: ArtistProfile;
  profile?: ArtistProfile;
}

export function ArtistCardComponent({ artist: propArtist, profile: propProfile }: ArtistCardProps) {
  const artist = propArtist || propProfile;
  const [imgError, setImgError] = useState(false);
  const [discoveredAvatar, setDiscoveredAvatar] = useState<string | null>(null);

  const artistId = artist?.id || artist?.userId || '';
  const firstName = artist?.first_name || artist?.firstName || '';
  const lastName = artist?.last_name || artist?.lastName || '';
  const email = artist?.email || artist?.businessEmail || artist?.business_email || '';

  const displayName = useMemo(() => {
    if (!artist) return 'Artist';
    let name = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (
      firstName.toLowerCase().includes('studio1') ||
      email.toLowerCase().includes('studio1.foreignbusiness') ||
      (firstName.toLowerCase().startsWith('studio') && !lastName)
    ) {
      return 'studio One';
    } else if (!name) {
      return artist.full_name || artist.name || artist.username || 'Artist';
    }
    return name;
  }, [artist, firstName, lastName, email]);

  const professionalTitle = artist?.title || artist?.professional_title || '';
  const bio = artist?.bio || artist?.description || '';

  const displayPills = useMemo(() => {
    if (!artist) return ['Visual Artist', 'Custom Art'];
    const skills: string[] = parseDisplayTags(artist.skills);
    const styles: string[] = parseDisplayTags(artist.art_styles);
    const specialties: string[] = parseDisplayTags(artist.art_specialties || artist.specialties);
    const services: string[] = parseDisplayTags(artist.services_offered || artist.services);
    const mediums: string[] = parseDisplayTags(artist.mediums);

    const seenTags = new Set<string>();
    const categoryPills: string[] = [];

    [...styles, ...skills, ...mediums, ...specialties, ...services].forEach((tag) => {
      const cleanTag = tag.trim();
      const lowerKey = cleanTag.toLowerCase();
      if (cleanTag && !seenTags.has(lowerKey)) {
        seenTags.add(lowerKey);
        categoryPills.push(cleanTag);
      }
    });

    return categoryPills.length > 0 ? categoryPills : ['Visual Artist', 'Custom Art'];
  }, [artist]);

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
    <Link href={`/freelancers/${artistId}`} className="block h-full">
      <article className="group flex h-full flex-col justify-between rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm dark:shadow-[0_20px_80px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#A2694E]/50 dark:hover:border-[#A2694E]/50 hover:cursor-pointer">
        <div className="flex flex-col gap-4">
          {/* Header: Avatar + Display Name & Title */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Avatar Component - Uniform Circle */}
              <div className="relative h-16 w-16 sm:h-18 sm:w-18 flex-shrink-0 overflow-hidden rounded-full border-2 border-[#A2694E]/30 ring-4 ring-[#A2694E]/15 shadow-md shadow-[#A2694E]/10 transition-transform group-hover:scale-105 bg-muted">
                {avatarSrc && !imgError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarSrc}
                    alt={`${displayName} profile picture`}
                    className="h-full w-full object-cover rounded-full"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#A2694E] to-amber-700 text-xl sm:text-2xl font-bold text-white">
                    {initialLetter}
                  </div>
                )}
              </div>

              {/* Name & Title */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1 break-words text-base leading-snug transition-colors group-hover:text-[#A2694E]">
                  {displayName}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                  {professionalTitle || 'Visual Creator'}
                </p>
                {isVerified && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-3 w-3" />
                    Verified Artist
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bio Section with Uniform Min-Height */}
          <div className="min-h-[2.5rem] flex items-center">
            <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {bio ? bio : 'Passionate creator open for custom art commissions and creative collaborations.'}
            </p>
          </div>

          {/* Category Badges Section - Always Rendered with Fallback */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[30px]">
            {displayPills.slice(0, 3).map((item) => (
              <span
                key={`pill-${item}`}
                className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200"
              >
                {item}
              </span>
            ))}
            {displayPills.length > 3 && (
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                +{displayPills.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Footer: Location / Commission Status + Pinned 'View Artist' Button */}
        <footer className="mt-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
          <div className="space-y-1 min-w-0 flex-1 pr-2">
            {locationVal ? (
              <p className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">
                <MapPin className="h-3.5 w-3.5 text-[#A2694E] flex-shrink-0" />
                <span className="truncate">{locationVal}</span>
              </p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 truncate">
                <Clock className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <span className="truncate">Available for commissions</span>
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#A2694E]/10 px-3 py-1.5 text-xs font-semibold text-[#A2694E] transition-colors group-hover:bg-[#A2694E] group-hover:text-white">
              View Artist
            </span>
          </div>
        </footer>
      </article>
    </Link>
  );
}

export const ArtistCard = memo(ArtistCardComponent);
export default ArtistCard;
