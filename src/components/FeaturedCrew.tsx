'use client';

import React, { useEffect, useState, startTransition } from 'react';
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
  const [featuredMember, setFeaturedMember] = useState<CrewMember | null>(null);
  const [reviews, setReviews] = useState<ManualReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function loadCrew() {
      try {
        const { data: crewData, error } = await supabase
          .from('crew_members')
          .select('*')
          .order('display_order', { ascending: true });

        if (!error && Array.isArray(crewData) && crewData.length > 0 && isMounted) {
          const rawFeatured = crewData.find((c: any) => c.is_featured) || crewData[0];
          if (rawFeatured) {
            setFeaturedMember({
              ...rawFeatured,
              avatar_url: rawFeatured.image_url || rawFeatured.avatar_url || '',
              image_url: rawFeatured.image_url || rawFeatured.avatar_url || '',
            });
          }
          return;
        }

        const res = await fetch('/api/crew');
        if (res.ok) {
          const json = await res.json();
          if (json?.crew && Array.isArray(json.crew) && json.crew.length > 0 && isMounted) {
            const rawFeatured = json.crew.find((c: any) => c.is_featured) || json.crew[0];
            if (rawFeatured) {
              setFeaturedMember({
                ...rawFeatured,
                avatar_url: rawFeatured.image_url || rawFeatured.avatar_url || '',
                image_url: rawFeatured.image_url || rawFeatured.avatar_url || '',
              });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load featured crew:', err);
      }
    }

    async function loadReviews() {
      try {
        const { data: revData, error } = await supabase
          .from('manual_reviews')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && Array.isArray(revData) && revData.length > 0 && isMounted) {
          setReviews(revData);
          return;
        }

        const res = await fetch('/api/reviews');
        if (res.ok) {
          const json = await res.json();
          if (json?.reviews && Array.isArray(json.reviews) && json.reviews.length > 0 && isMounted) {
            setReviews(json.reviews);
          }
        }
      } catch (err) {
        console.warn('Failed to load manual reviews:', err);
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

    // Enable Supabase Realtime subscriptions for both crew and reviews
    const channel = supabase
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
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isLoading && !featuredMember && reviews.length === 0) {
    return null;
  }

  const activeMember = featuredMember;
  const activeReviews = reviews;

  return (
    <section className="relative w-full py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-amber-50/40 to-slate-100 dark:from-slate-950 dark:via-amber-950/15 dark:to-slate-950 border-b border-slate-200 dark:border-amber-900/30 transition-colors duration-300 overflow-hidden">
      {/* Background Warm Amber Glowing Orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-5 w-72 h-72 bg-yellow-500/10 dark:bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        
        {/* ============================================================ */}
        {/* PART 1: FEATURED CREW MEMBER SHOWCASE (Large Image + Bio)   */}
        {/* ============================================================ */}
        {activeMember && (
          <div className="max-w-6xl mx-auto">
            {/* Section Badge */}
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 dark:bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase shadow-sm mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                <span>Curator of the Month</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Featured Crew Showcase
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-1.5">
                Highlighting the exceptional individuals shaping art discovery and curation at Vivid Art.
              </p>
            </div>

            {/* Featured Crew Card */}
            <div className="relative rounded-3xl p-6 sm:p-8 md:p-10 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-amber-500/30 shadow-2xl shadow-slate-300/40 dark:shadow-amber-950/30 backdrop-blur-xl overflow-hidden transition-colors duration-300">
              {/* Ambient inner gradient */}
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center">
                {/* Large Image Column (Left 5 Cols) */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[340px] md:max-w-none aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden ring-4 ring-amber-500/30 shadow-2xl group">
                    <img
                      src={activeMember.image_url || activeMember.avatar_url}
                      alt={activeMember.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500 text-slate-950 shadow-md">
                        <Award className="w-3.5 h-3.5" />
                        Featured Member
                      </span>
                    </div>
                  </div>
                </div>

                {/* Story & Details Column (Right 7 Cols) */}
                <div className="md:col-span-7 space-y-4 sm:space-y-5 text-left">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                      <span>{activeMember.position}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {activeMember.name}
                    </h3>
                  </div>

                  {/* Short Bio / Highlight */}
                  {activeMember.short_bio && (
                    <div className="p-4 rounded-xl bg-slate-100/90 dark:bg-slate-950/60 border border-slate-200 dark:border-amber-500/20 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                      <p className="font-medium text-amber-800 dark:text-amber-200/90 mb-1">
                        &ldquo;{activeMember.short_bio}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Truncated Description */}
                  <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3">
                    {activeMember.full_story || activeMember.short_bio}
                  </p>

                  {/* Social Media Links (Conditional on presence) */}
                  {Boolean(
                    activeMember.linkedin_url ||
                    activeMember.instagram_url ||
                    activeMember.facebook_url ||
                    activeMember.twitter_url ||
                    activeMember.x_url
                  ) && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {activeMember.linkedin_url && (
                        <a
                          href={activeMember.linkedin_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={`${activeMember.name} on LinkedIn`}
                        >
                          <IconBrandLinkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {activeMember.instagram_url && (
                        <a
                          href={activeMember.instagram_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={`${activeMember.name} on Instagram`}
                        >
                          <IconBrandInstagram className="w-3.5 h-3.5" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {activeMember.facebook_url && (
                        <a
                          href={activeMember.facebook_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={`${activeMember.name} on Facebook`}
                        >
                          <IconBrandFacebook className="w-3.5 h-3.5" />
                          <span>Facebook</span>
                        </a>
                      )}
                      {(activeMember.twitter_url || activeMember.x_url) && (
                        <a
                          href={activeMember.twitter_url || activeMember.x_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all hover:scale-105"
                          aria-label={`${activeMember.name} on X (Twitter)`}
                        >
                          <IconBrandX className="w-3.5 h-3.5" />
                          <span>X</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* CTA / See More Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => startTransition(() => setIsStoryModalOpen(true))}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 hover:scale-105 transition-all duration-200 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>See More</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 2: DYNAMIC MANUAL REVIEWS SECTION                       */}
        {/* ============================================================ */}
        {activeReviews.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/15 dark:bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold tracking-wide uppercase shadow-sm mb-3">
                <Star className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
                <span>Collector &amp; Artist Testimonials</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                What Art Visionaries Say
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-1.5">
                Verified reviews from art collectors, architects, and patrons who trust Vivid Art.
              </p>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {activeReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="relative rounded-2xl p-6 sm:p-7 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 shadow-xl shadow-slate-200/50 dark:shadow-black/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
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
                      <Quote className="w-5 h-5 text-amber-500/40 group-hover:text-amber-600 dark:group-hover:text-amber-400/80 transition-colors" />
                    </div>

                    {/* Review Quote Text */}
                    <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed italic mb-6">
                      &ldquo;{rev.content}&rdquo;
                    </p>
                  </div>

                  {/* Author Information */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-amber-500/40 bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold text-sm">
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400/90 truncate font-medium">
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
      {activeMember && (
        <Dialog open={isStoryModalOpen} onOpenChange={setIsStoryModalOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-amber-500/40 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 max-h-[88vh] overflow-y-auto shadow-2xl">
            <DialogHeader className="text-left space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold w-fit">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Full Crew Member Story</span>
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {activeMember.name}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {activeMember.position}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4 text-left">
              {/* Image Banner */}
              <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden ring-2 ring-amber-500/30 shadow-xl">
                <img
                  src={activeMember.image_url || activeMember.avatar_url}
                  alt={activeMember.name}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs sm:text-sm font-medium text-amber-200 drop-shadow">
                    &ldquo;{activeMember.short_bio}&rdquo;
                  </p>
                </div>
              </div>

              {/* Story Paragraphs */}
              <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  Creative Journey &amp; Impact
                </h4>
                <p className="whitespace-pre-line">
                  {activeMember.full_story || activeMember.short_bio}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  At Vivid Art, {activeMember.name} works directly with verified creators and world-class patrons, ensuring every commission and curated piece represents the pinnacle of artistic integrity.
                </p>
              </div>

              {/* Active Social Media Links */}
              {Boolean(
                activeMember.linkedin_url ||
                activeMember.instagram_url ||
                activeMember.facebook_url ||
                activeMember.twitter_url ||
                activeMember.x_url
              ) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Connect &amp; Follow
                  </h4>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {activeMember.linkedin_url && (
                      <a
                        href={activeMember.linkedin_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${activeMember.name} on LinkedIn`}
                      >
                        <IconBrandLinkedin className="w-4 h-4" />
                        <span>LinkedIn</span>
                      </a>
                    )}

                    {activeMember.instagram_url && (
                      <a
                        href={activeMember.instagram_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${activeMember.name} on Instagram`}
                      >
                        <IconBrandInstagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    )}

                    {activeMember.facebook_url && (
                      <a
                        href={activeMember.facebook_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${activeMember.name} on Facebook`}
                      >
                        <IconBrandFacebook className="w-4 h-4" />
                        <span>Facebook</span>
                      </a>
                    )}

                    {(activeMember.twitter_url || activeMember.x_url) && (
                      <a
                        href={activeMember.twitter_url || activeMember.x_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all hover:scale-105"
                        aria-label={`${activeMember.name} on X (Twitter)`}
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
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
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

