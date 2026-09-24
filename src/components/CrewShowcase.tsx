'use client';

import React, { useEffect, useState, startTransition } from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandX,
} from '@tabler/icons-react';
import { CrewMember } from '@/types/crew';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function CrewShowcase() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

        if (!error && Array.isArray(data) && isMounted) {
          const mapped = data.map((c: any) => ({
            ...c,
            avatar_url: c.image_url || c.avatar_url || '',
            image_url: c.image_url || c.avatar_url || '',
          }));
          setCrew(mapped);
          setIsLoading(false);
          return;
        }

        const res = await fetch('/api/crew');
        if (res.ok) {
          const json = await res.json();
          if (json?.crew && Array.isArray(json.crew) && isMounted) {
            const mapped = json.crew.map((c: any) => ({
              ...c,
              avatar_url: c.image_url || c.avatar_url || '',
              image_url: c.image_url || c.avatar_url || '',
            }));
            setCrew(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to load crew members:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCrew();

    // Realtime Postgres updates so new/edited crew members appear dynamically
    const channel = supabase
      .channel('crew_showcase_realtime')
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

  const handleCardClick = (member: CrewMember) => {
    startTransition(() => {
      setSelectedMember(member);
      setIsModalOpen(true);
    });
  };

  const handleCloseModal = (open: boolean) => {
    startTransition(() => {
      setIsModalOpen(open);
      if (!open) {
        setSelectedMember(null);
      }
    });
  };

  // Loading Skeleton
  if (isLoading && crew.length === 0) {
    return (
      <section className="relative w-full py-12 sm:py-16 overflow-hidden bg-gradient-to-b from-slate-950 via-rose-950/20 to-slate-950 border-y border-rose-900/30">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-3 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Meet Our Curation Crew</span>
            </div>
            <div className="h-8 w-72 bg-slate-800/60 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-3xl bg-slate-900/60 border border-rose-950/40 animate-pulse p-4 flex flex-col justify-end"
              >
                <div className="space-y-2">
                  <div className="h-5 bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-800/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If no crew rows in database, return null
  if (!isLoading && crew.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-16 sm:py-24 overflow-hidden bg-gradient-to-b from-slate-950 via-rose-950/15 to-slate-950 border-y border-rose-900/30">
      {/* Ambient Red & Rose Glowing Orbs */}
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-wide uppercase shadow-sm shadow-rose-950/50 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Meet Our Curation Crew</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            The Visionaries Behind Cinnamon Gallery
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Click any crew member to explore their background, curatorial philosophy, and social channels.
          </p>
        </div>

        {/* Static Crew Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {crew.map((member) => (
            <div
              key={member.id}
              onClick={() => handleCardClick(member)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(member);
                }
              }}
              className="group relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-slate-900 border border-rose-950/40 hover:border-rose-500/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-rose-950/50 cursor-pointer text-left"
            >
              {/* High-Resolution Portrait Photo */}
              <img
                src={member.image_url || member.avatar_url}
                alt={member.name}
                loading="lazy"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
              />

              {/* Gradient Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />

              {/* Top Row Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                {member.is_featured ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 backdrop-blur-md text-xs font-semibold px-2.5 py-0.5 shadow-md">
                    Featured Curator
                  </Badge>
                ) : <span />}

                <span className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white/70 group-hover:text-white group-hover:bg-rose-600/80 transition-all duration-300 shadow-md">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              {/* Bottom Details Card */}
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 z-10 space-y-1.5">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-rose-200 transition-colors">
                  {member.name}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-rose-400 line-clamp-1">
                  {member.position}
                </p>
                {member.short_bio && (
                  <p className="text-xs text-slate-300/80 line-clamp-2 pt-1 font-light leading-relaxed">
                    {member.short_bio}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crew Details & Social Media Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          {selectedMember && (
            <div>
              {/* Header Portrait Banner */}
              <div className="relative w-full h-72 sm:h-80 bg-slate-900 overflow-hidden">
                <img
                  src={selectedMember.image_url || selectedMember.avatar_url}
                  alt={selectedMember.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {selectedMember.is_featured && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 backdrop-blur-md text-xs font-semibold px-3 py-1 shadow-lg">
                      Featured Curator
                    </Badge>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-8 space-y-5">
                <div>
                  <DialogHeader className="text-left space-y-1">
                    <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {selectedMember.name}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-semibold text-rose-400">
                      {selectedMember.position}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                {/* Short Bio Quote */}
                {selectedMember.short_bio && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-rose-950/40 text-xs sm:text-sm italic text-slate-300 leading-relaxed">
                    &ldquo;{selectedMember.short_bio}&rdquo;
                  </div>
                )}

                {/* Full Story */}
                {selectedMember.full_story && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      About &amp; Curatorial Vision
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedMember.full_story}
                    </p>
                  </div>
                )}

                {/* Active Social Media Links (Only renders if at least one link is provided) */}
                {Boolean(
                  selectedMember.linkedin_url ||
                  selectedMember.instagram_url ||
                  selectedMember.facebook_url ||
                  selectedMember.twitter_url ||
                  selectedMember.x_url
                ) && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Connect &amp; Follow
                    </h4>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {selectedMember.linkedin_url && (
                        <a
                          href={selectedMember.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={selectedMember.name + ' on LinkedIn'}
                        >
                          <IconBrandLinkedin className="w-4 h-4" />
                          <span>LinkedIn</span>
                        </a>
                      )}

                      {selectedMember.instagram_url && (
                        <a
                          href={selectedMember.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={selectedMember.name + ' on Instagram'}
                        >
                          <IconBrandInstagram className="w-4 h-4" />
                          <span>Instagram</span>
                        </a>
                      )}

                      {selectedMember.facebook_url && (
                        <a
                          href={selectedMember.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={selectedMember.name + ' on Facebook'}
                        >
                          <IconBrandFacebook className="w-4 h-4" />
                          <span>Facebook</span>
                        </a>
                      )}

                      {(selectedMember.twitter_url || selectedMember.x_url) && (
                        <a
                          href={selectedMember.twitter_url || selectedMember.x_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={selectedMember.name + ' on X (Twitter)'}
                        >
                          <IconBrandX className="w-4 h-4" />
                          <span>X (Twitter)</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default CrewShowcase;
