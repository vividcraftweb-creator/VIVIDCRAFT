'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CrewMember } from '@/types/crew';
import { createClient } from '@/lib/supabase/client';

export const DEFAULT_CURATED_CREW: CrewMember[] = [
  {
    id: 'crew-default-1',
    name: 'Elena Rostova',
    position: 'Chief Art Curator & Valuation Lead',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    short_bio: '12+ years in contemporary European curation and gallery direction.',
    full_story: 'Elena leads our curation board with over a decade of prestigious gallery direction across Paris, Vienna, and London. She specializes in authenticating physical and digital fine art masterworks.',
    is_featured: true,
    display_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'crew-default-2',
    name: 'Marcus Vance',
    position: 'Senior Fine Art Specialist',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    short_bio: 'Expert in auction valuation, oil on canvas, and rare digital artifacts.',
    full_story: 'Marcus brings an eagle eye for technical technique and historical significance, helping collectors identify rising master talents before they reach international auctions.',
    is_featured: false,
    display_order: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'crew-default-3',
    name: 'Sarah Jenkins',
    position: 'Master Conservator & Technique Advisor',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    short_bio: 'Bridging classical fine art preservation with contemporary digital mediums.',
    full_story: 'Sarah ensures artistic integrity across every medium. With degrees from the Royal College of Art, she mentors emerging creators on archival permanence and digital provenance.',
    is_featured: false,
    display_order: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'crew-default-4',
    name: 'David Chen',
    position: 'Global Collector Relations',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    short_bio: 'Advising private patrons, luxury interior architects, and institutional buyers.',
    full_story: 'David bridges visionary artists with elite private collectors and interior architects worldwide, facilitating seamless commissions and custom installations.',
    is_featured: false,
    display_order: 4,
    created_at: '2026-01-01T00:00:00Z',
  },
];

export function CrewMarquee() {
  const [crew, setCrew] = useState<CrewMember[]>(DEFAULT_CURATED_CREW);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadCrew() {
      try {
        const { data, error } = await supabase
          .from('crew_members')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setCrew(data);
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/crew');
        if (res.ok) {
          const json = await res.json();
          if (json?.crew && Array.isArray(json.crew) && json.crew.length > 0 && isMounted) {
            setCrew(json.crew);
          }
        }
      } catch (err) {
        console.warn('Failed to load crew marquee:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCrew();

    // Enable Supabase Realtime subscription for instant live updates
    const channel = supabase
      .channel('crew_marquee_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members' },
        () => {
          loadCrew();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // If loading and no crew loaded yet, display sleek pulse skeleton loader
  if (isLoading && crew.length === 0) {
    return (
      <section className="relative w-full py-10 sm:py-14 overflow-hidden bg-gradient-to-b from-slate-950 via-rose-950/20 to-slate-950 border-y border-rose-900/30">
        <div className="container mx-auto px-4 mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Meet Our Curation Crew</span>
          </div>
          <div className="h-6 w-64 bg-slate-800/80 rounded-md mx-auto animate-pulse" />
        </div>
        <div className="flex gap-4 sm:gap-6 px-4 overflow-hidden justify-center">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 w-[280px] sm:w-[330px] p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-rose-950/40 animate-pulse flex-shrink-0"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Safe active crew ensuring zero layout shift
  const activeCrew = crew.length > 0 ? crew : DEFAULT_CURATED_CREW;

  // Duplicate crew array to create a seamless infinite loop
  const marqueeItems = [...activeCrew, ...activeCrew, ...activeCrew];

  return (
    <section className="relative w-full py-10 sm:py-14 overflow-hidden bg-gradient-to-b from-slate-950 via-rose-950/20 to-slate-950 border-y border-rose-900/30">
      {/* Ambient Red Glow Highlights */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Red Section Badge & Title */}
      <div className="container mx-auto px-4 mb-6 sm:mb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide uppercase shadow-sm shadow-rose-950/50 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Meet Our Curation Crew</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          The Visionaries Behind Vivid Art
        </h2>
        <p className="text-xs sm:text-sm text-rose-200/70 max-w-xl mx-auto mt-1">
          Passionate curators, master artists, and valuation specialists dedicated to fine art excellence.
        </p>
      </div>

      {/* Infinite Horizontal Scrolling Track */}
      <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-crew-marquee hover:[animation-play-state:paused] gap-4 sm:gap-6 py-2 cursor-pointer">
          {marqueeItems.map((member, idx) => (
            <div
              key={`${member.id}-${idx}`}
              className="flex items-center gap-3.5 sm:gap-4 w-[280px] sm:w-[330px] p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-rose-900/40 hover:border-rose-500/50 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 group flex-shrink-0"
            >
              {/* Circular Avatar Thumbnail */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden ring-2 ring-rose-500/40 group-hover:ring-rose-400 transition-all flex-shrink-0 bg-slate-800">
                <img
                  src={member.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                  alt={member.name}
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                    {member.name}
                  </h3>
                  {member.is_featured && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                      Lead
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-rose-400/90 truncate">
                  {member.position}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {member.short_bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes crew-marquee {
            0% {
              transform: translateX(0%);
            }
            100% {
              transform: translateX(-33.333%);
            }
          }
          .animate-crew-marquee {
            animation: crew-marquee 38s linear infinite;
          }
        `
      }} />
    </section>
  );
}

export default CrewMarquee;
