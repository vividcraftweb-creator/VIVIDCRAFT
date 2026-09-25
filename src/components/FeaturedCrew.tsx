'use client';

import React, { useEffect, useState, useRef, startTransition } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Star,
  Quote,
  ArrowRight,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { CrewMember } from '@/types/crew';
import { ManualReview } from '@/types/reviews';
import { createClient } from '@/lib/supabase/client';

const FeaturedCrewStoryModal = dynamic(() => import('./FeaturedCrewStoryModal'), {
  ssr: false,
});

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
          .select('id, name, position, image_url, avatar_url, short_bio, full_story, is_featured, display_order, created_at, linkedin_url, instagram_url, facebook_url, twitter_url, x_url')
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
        if (isMounted) setCrewMembers([]);
      }
    }

    async function loadReviews() {
      try {
        let revsLoaded = false;
        try {
          const { data: revData, error } = await supabase
            .from('manual_reviews')
            .select('id, author_name, author_role, content, rating, avatar_url, is_active, display_order')
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
      {/* CREW STORY & DETAILS MODAL (Lazy Loaded via Dynamic Import)   */}
      {/* ============================================================ */}
      {isStoryModalOpen && selectedMember && (
        <FeaturedCrewStoryModal
          isOpen={isStoryModalOpen}
          onOpenChange={setIsStoryModalOpen}
          selectedMember={selectedMember}
        />
      )}
    </section>
  );
}

export default FeaturedCrew;

