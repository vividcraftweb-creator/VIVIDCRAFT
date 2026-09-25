'use client';

import React, { useEffect, useState, useRef, startTransition } from 'react';
import {
  Sparkles,
  Star,
  Quote,
  ArrowRight,
  BookOpen,
  Award,
  CheckCircle2,
} from 'lucide-react';
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CrewMember } from '@/types/crew';
import { ManualReview } from '@/types/reviews';
import { createClient } from '@/lib/supabase/client';

export function FeaturedCrew() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [reviews, setReviews] = useState<ManualReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const crewSliderRef = useRef<HTMLDivElement>(null);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadCrew() {
      try {
        const { data: crewData, error } = await supabase
          .from('crew_members')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(crewData) && isMounted) {
          const mapped = crewData.map((c: any) => ({
            ...c,
            avatar_url: c.image_url || c.avatar_url || '',
            image_url: c.image_url || c.avatar_url || '',
          }));
          setCrewMembers(mapped);
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
            setCrewMembers(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to load crew members:', err);
        if (isMounted) setCrewMembers([]);
      }
    }

    async function loadReviews() {
      try {
        let revsLoaded = false;
        try {
          const { data: revData, error } = await supabase
            .from('manual_reviews')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (!error && Array.isArray(revData) && revData.length > 0 && isMounted) {
            setReviews(revData);
            revsLoaded = true;
            return;
          }
        } catch (dbErr) {
          console.warn('Direct manual_reviews query notice (handled gracefully):', dbErr);
        }

        if (!revsLoaded) {
          try {
            const res = await fetch('/api/reviews');
            if (res.ok) {
              const json = await res.json();
              if (json?.reviews && Array.isArray(json.reviews) && json.reviews.length > 0 && isMounted) {
                setReviews(json.reviews);
                revsLoaded = true;
                return;
              }
            }
          } catch (apiErr) {
            console.warn('API /api/reviews fallback notice (handled gracefully):', apiErr);
          }
        }

        if (!revsLoaded && isMounted) {
          setReviews([]);
        }
      } catch (err) {
        console.warn('Failed to load manual reviews (defaulting to empty array):', err);
        if (isMounted) {
          setReviews([]);
        }
      }
    }

    async function loadAllData() {
      setIsLoading(true);
      await Promise.all([loadCrew(), loadReviews()]);
      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadAllData();

    // Enable Supabase Realtime subscriptions for both crew and reviews safely
    let channel: any = null;
    try {
      channel = supabase
        .channel('featured_crew_and_reviews_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'crew_members' },
          () => {
            loadCrew();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'manual_reviews' },
          () => {
            loadReviews();
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('Featured crew realtime subscription notice:', err.message);
          }
        });
    } catch (chanErr) {
      console.warn('Realtime channel error in FeaturedCrew (handled):', chanErr);
    }

    return () => {
      isMounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  const displayedCrew = crewMembers.slice(0, 3);
  const activeReviews = reviews;

  // Automatic horizontal auto-moving carousel for mobile view
  useEffect(() => {
    const slider = crewSliderRef.current;
    if (!slider) return;

    const interval = setInterval(() => {
      if (isSliderPaused) return;
      if (slider.scrollWidth > slider.clientWidth) {
        const maxScroll = slider.scrollWidth - slider.clientWidth;
        if (slider.scrollLeft >= maxScroll - 15) {
          slider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          slider.scrollBy({ left: 280, behavior: 'smooth' });
        }
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isSliderPaused, displayedCrew.length]);

  if (!isLoading && crewMembers.length === 0 && reviews.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full py-16 sm:py-24 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        
        {/* ============================================================ */}
        {/* PART 1: COMPACT RESPONSIVE 3-CARD CREW GRID                  */}
        {/* ============================================================ */}
        {displayedCrew.length > 0 && (
          <div className="max-w-6xl mx-auto">
            {/* Section Badge */}
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A2694E]/10 border border-[#A2694E]/25 text-[#A2694E] dark:text-[#C58B6F] text-xs font-semibold tracking-wide uppercase mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#8B9B88]" />
                <span>Curatorial Team</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Featured Crew Showcase
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2">
                Highlighting the exceptional individuals shaping art discovery and curation at Cinnamon Gallery.
              </p>
            </div>

            {/* Responsive Ultra-Minimal 3-Card Grid (Desktop) / Horizontal Carousel (Mobile) */}
            <div
              ref={crewSliderRef}
              onMouseEnter={() => setIsSliderPaused(true)}
              onMouseLeave={() => setIsSliderPaused(false)}
              onTouchStart={() => setIsSliderPaused(true)}
              onTouchEnd={() => setIsSliderPaused(false)}
              className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 md:gap-4.5 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory scrollbar-none pb-4 md:pb-0 px-2 sm:px-0 scroll-smooth max-w-xl mx-auto items-stretch justify-start md:justify-center md:justify-items-center"
            >
              {displayedCrew.map((member) => (
                <div
                  key={member.id}
                  className="relative w-[180px] sm:w-[190px] md:w-[195px] max-w-[200px] flex-shrink-0 md:flex-shrink rounded-xl p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#A2694E]/50 dark:hover:border-[#A2694E]/40 transition-all flex flex-col justify-between snap-center text-center group"
                >
                  {/* Compact Card Portrait Photo: h-28 sm:h-32 */}
                  <div
                    onClick={() => {
                      setSelectedMember(member);
                      startTransition(() => setIsStoryModalOpen(true));
                    }}
                    className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 border border-slate-200/80 dark:border-slate-800 cursor-pointer"
                  >
                    <img
                      src={member.image_url || member.avatar_url}
                      alt={member.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                    {member.is_featured && (
                      <div className="absolute top-1.5 left-1.5">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#A2694E] text-white shadow-sm">
                          <Award className="w-2.5 h-2.5" />
                          Featured
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Essential Info Only: Designation & Name */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-semibold text-[#A2694E] dark:text-[#C58B6F] uppercase tracking-wider line-clamp-1">
                        {member.position}
                      </div>
                      <h3 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight line-clamp-1 mt-0.5">
                        {member.name}
                      </h3>
                    </div>

                    {/* Minimal 'See More' Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(member);
                          startTransition(() => setIsStoryModalOpen(true));
                        }}
                        className="w-full inline-flex items-center justify-center gap-1 py-1 px-2 rounded-md bg-[#A2694E]/10 hover:bg-[#A2694E]/20 text-[#A2694E] dark:text-[#C58B6F] hover:text-[#8B5A3C] dark:hover:text-[#DDA78D] font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <span>See More</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {displayedCrew.length > 1 && (
              <div className="flex md:hidden items-center justify-center gap-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                <span>Swipe to explore crew</span>
                <ArrowRight className="w-3 h-3 animate-pulse text-[#A2694E]" />
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 2: DYNAMIC MANUAL REVIEWS SECTION                       */}
        {/* ============================================================ */}
        {activeReviews.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-700 dark:text-yellow-400 text-xs font-semibold tracking-wide uppercase mb-3">
                <Star className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                <span>Collector &amp; Artist Testimonials</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                What Art Visionaries Say
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2">
                Verified reviews from art collectors, architects, and patrons who trust Cinnamon Gallery.
              </p>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {activeReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="relative rounded-2xl p-6 sm:p-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  {/* Quote Header & Star Rating */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < rev.rating
                                ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <Quote className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    </div>

                    {/* Review Quote Text */}
                    <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed italic mb-6">
                      &ldquo;{rev.content}&rdquo;
                    </p>
                  </div>

                  {/* Author Information */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-[#A2694E] dark:text-[#C58B6F] font-bold text-sm">
                      {rev.avatar_url ? (
                        <img
                          src={rev.avatar_url}
                          alt={rev.author_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{rev.author_name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {rev.author_name}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#8B9B88] flex-shrink-0" />
                      </div>
                      <p className="text-xs text-[#A2694E] dark:text-[#C58B6F] truncate font-medium">
                        {rev.author_role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* CREW STORY & DETAILS MODAL                                   */}
      {/* ============================================================ */}
      {selectedMember && (
        <Dialog open={isStoryModalOpen} onOpenChange={setIsStoryModalOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl p-6 sm:p-8 max-h-[88vh] overflow-y-auto shadow-xl">
            <DialogHeader className="text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A2694E]/10 border border-[#A2694E]/25 text-[#A2694E] dark:text-[#C58B6F] text-xs font-semibold w-fit">
                <Sparkles className="w-3.5 h-3.5 text-[#8B9B88]" />
                <span>Full Crew Member Story</span>
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {selectedMember.name}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-[#A2694E] dark:text-[#C58B6F]">
                {selectedMember.position}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4 text-left">
              {/* Image Banner */}
              <div className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                <img
                  src={selectedMember.image_url || selectedMember.avatar_url}
                  alt={selectedMember.name}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                {selectedMember.short_bio && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs sm:text-sm font-medium text-[#F8F6F1] drop-shadow">
                      &ldquo;{selectedMember.short_bio}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Story Paragraphs */}
              <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#A2694E] dark:text-[#C58B6F]" />
                  Creative Journey &amp; Impact
                </h4>
                {selectedMember.short_bio && (
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm italic flex items-start gap-2">
                    <Quote className="w-4 h-4 text-[#A2694E] dark:text-[#C58B6F] shrink-0 mt-0.5" />
                    <p>&ldquo;{selectedMember.short_bio}&rdquo;</p>
                  </div>
                )}
                <p className="whitespace-pre-line">
                  {selectedMember.full_story || selectedMember.short_bio}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  At Cinnamon Gallery, {selectedMember.name} works directly with verified creators and world-class patrons, ensuring every commission and curated piece represents the pinnacle of artistic integrity.
                </p>
              </div>

              {/* Active Social Media Links */}
              {Boolean(
                selectedMember.linkedin_url ||
                selectedMember.instagram_url ||
                selectedMember.facebook_url ||
                selectedMember.twitter_url ||
                selectedMember.x_url
              ) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Connect &amp; Follow
                  </h4>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {selectedMember.linkedin_url && (
                      <a
                        href={selectedMember.linkedin_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${selectedMember.name} on LinkedIn`}
                      >
                        <IconBrandLinkedin className="w-4 h-4" />
                        <span>LinkedIn</span>
                      </a>
                    )}

                    {selectedMember.instagram_url && (
                      <a
                        href={selectedMember.instagram_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${selectedMember.name} on Instagram`}
                      >
                        <IconBrandInstagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    )}

                    {selectedMember.facebook_url && (
                      <a
                        href={selectedMember.facebook_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${selectedMember.name} on Facebook`}
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
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${selectedMember.name} on X (Twitter)`}
                      >
                        <IconBrandX className="w-4 h-4" />
                        <span>X (Twitter)</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  onClick={() => startTransition(() => setIsStoryModalOpen(false))}
                  className="px-6 py-2 rounded-xl bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold text-sm cursor-pointer shadow-md shadow-[#A2694E]/20"
                >
                  Close Story
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

export default FeaturedCrew;

