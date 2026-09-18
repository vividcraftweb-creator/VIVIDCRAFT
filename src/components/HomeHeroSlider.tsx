'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { DEFAULT_WHATSAPP_NUMBER } from '@/lib/whatsapp';

export interface BannerSlide {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  cta_text?: string;
  link_url?: string;
  target_route?: string;
  image_url: string;
  accent?: string;
  offer_code: string;
  is_active?: boolean;
  display_order?: number;
}

interface HomeHeroSliderProps {
  className?: string;
}

export function HomeHeroSlider({ className = '' }: HomeHeroSliderProps) {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Responsive cards-per-view: calculated cleanly without hydration flash
  const [cardsPerView, setCardsPerView] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w >= 1200) return 4;
      if (w >= 850) return 3;
      if (w >= 600) return 2;
      return 1;
    }
    return 4;
  });

  // Slider animation and positioning state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [withTransition, setWithTransition] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Mobile Touch Swipe Handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Measure window for cardsPerView
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1200) {
        setCardsPerView(4);
      } else if (w >= 850) {
        setCardsPerView(3);
      } else if (w >= 600) {
        setCardsPerView(2);
      } else {
        setCardsPerView(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch dynamic banners directly from Supabase advertisements table
  useEffect(() => {
    let isMounted = true;
    async function loadBanners() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && isMounted) {
          const activeOnly = data.filter((b: any) => b.is_active !== false);
          const mapped: BannerSlide[] = activeOnly.map((b: any) => ({
            id: b.id,
            badge: b.badge || 'Special Offer',
            title: b.title || '',
            subtitle: b.subtitle || '',
            cta_text: b.cta_text || 'Get Offer',
            link_url: b.target_route || b.link_url || '/gallery',
            target_route: b.target_route || b.link_url || '/gallery',
            image_url: b.image_url || '',
            accent: b.accent || 'from-amber-500/20 to-orange-500/10',
            offer_code: b.offer_code || 'OFFER-7842',
            is_active: b.is_active !== false,
            display_order: b.display_order ?? 0,
          }));
          setBanners(mapped);
          setIsLoading(false);
          return;
        }

        // 2. Fallback to API route if direct query failed
        const res = await fetch('/api/banners');
        if (res.ok) {
          const json = await res.json();
          if (json?.banners && Array.isArray(json.banners) && isMounted) {
            const mapped: BannerSlide[] = json.banners
              .filter((b: any) => b.is_active !== false)
              .map((b: any) => ({
                id: b.id,
                badge: b.badge || 'Special Offer',
                title: b.title || '',
                subtitle: b.subtitle || '',
                cta_text: b.cta_text || 'Get Offer',
                link_url: b.target_route || b.link_url || '/gallery',
                target_route: b.target_route || b.link_url || '/gallery',
                image_url: b.image_url || '',
                accent: b.accent || 'from-amber-500/20 to-orange-500/10',
                offer_code: b.offer_code || 'OFFER-7842',
                is_active: b.is_active !== false,
                display_order: b.display_order ?? 0,
              }));
            setBanners(mapped);
          }
        }
      } catch (e) {
        console.warn('Failed to load advertisements:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  // Build repeatable chain of cards so multiple cards wrap seamlessly around
  const baseList = useMemo(() => {
    if (banners.length === 0) return [];
    let list = [...banners];
    // Ensure base list has at least 6 items so 4-card desktop views always have ample items
    while (list.length < 6) {
      list = [...list, ...banners];
    }
    return list;
  }, [banners]);

  // Triple the list: [Set A, Set B, Set C]. We operate primarily in Set B.
  const displayItems = useMemo(() => {
    if (baseList.length <= 1) return baseList;
    return [...baseList, ...baseList, ...baseList];
  }, [baseList]);

  // Set initial position to the beginning of Set B
  useEffect(() => {
    if (baseList.length > 1) {
      setWithTransition(false);
      setCurrentIndex(baseList.length);
    }
  }, [baseList.length]);

  // Handle seamless infinite loop reset when sliding into Set A or Set C
  const handleTransitionEnd = () => {
    if (baseList.length <= 1) return;

    if (currentIndex >= baseList.length * 2) {
      setWithTransition(false);
      setCurrentIndex(currentIndex - baseList.length);
    } else if (currentIndex < baseList.length) {
      setWithTransition(false);
      setCurrentIndex(currentIndex + baseList.length);
    }
  };

  // Re-enable transition on the next animation frame after an instant reset
  useEffect(() => {
    if (!withTransition) {
      const raf = requestAnimationFrame(() => {
        setWithTransition(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [withTransition]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    startTransition(() => {
      setWithTransition(true);
      setCurrentIndex((prev) => prev + 1);
    });
  }, []);

  const handlePrev = useCallback(() => {
    startTransition(() => {
      setWithTransition(true);
      setCurrentIndex((prev) => prev - 1);
    });
  }, []);

  // Auto-play sliding every 3.5 seconds with pause-on-hover
  useEffect(() => {
    if (isPaused || baseList.length <= 1) return;

    const timer = setInterval(() => {
      handleNext();
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, handleNext, baseList.length]);

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 40) {
        handleNext();
      } else if (diff < -40) {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setTimeout(() => setIsPaused(false), 2000);
  };

  // Handle "Get Offer" WhatsApp Claim
  const handleClaimOffer = (e: React.MouseEvent, banner: BannerSlide) => {
    e.stopPropagation();
    const offerCode = banner.offer_code || 'OFFER-7842';

    const configuredPhone =
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
      DEFAULT_WHATSAPP_NUMBER ||
      '94783813833';
    const cleanPhone = String(configuredPhone).replace(/\D/g, '') || '94783813833';

    const message = `Hi, I want to claim this offer code: ${offerCode}`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isLoading && banners.length === 0) {
    return null;
  }

  // Loading Skeleton: Row of compact cards
  if (isLoading && banners.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[200px] sm:h-[215px] md:h-[225px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Single Banner Card display (no carousel needed)
  if (banners.length === 1) {
    const single = banners[0];
    return (
      <div className={`w-full max-w-sm sm:max-w-md mx-auto ${className}`}>
        <div
          onClick={() => {
            if (single.link_url || single.target_route) {
              router.push(single.link_url || single.target_route || '/gallery');
            }
          }}
          className="relative h-[200px] sm:h-[215px] md:h-[225px] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-900 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer"
        >
          <img
            src={single.image_url}
            alt={single.title || 'Special Offer'}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute bottom-3 left-3 z-20">
            <button
              type="button"
              onClick={(e) => handleClaimOffer(e, single)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-black/40 transition-all duration-200 hover:scale-105 cursor-pointer"
              aria-label={`Get Offer for ${single.offer_code}`}
            >
              <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-transparent" />
              <span>Get Offer</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-Card Auto-Swiper Chain
  const activeDotIndex = banners.length > 0 ? currentIndex % banners.length : 0;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Slider Track Container */}
      <div
        className="relative w-full overflow-hidden py-1 group/slider"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Horizontal sliding track */}
        <div
          onTransitionEnd={handleTransitionEnd}
          className="flex gap-4"
          style={{
            transform: `translateX(calc(-${currentIndex} * (100% + 16px) / ${cardsPerView}))`,
            transition: withTransition ? 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          }}
        >
          {displayItems.map((banner, idx) => (
            <div
              key={`${banner.id}-${idx}`}
              onClick={() => {
                if (banner.link_url || banner.target_route) {
                  router.push(banner.link_url || banner.target_route || '/gallery');
                }
              }}
              style={{
                flex: `0 0 calc(${100 / cardsPerView}% - ${(cardsPerView - 1) * 16 / cardsPerView}px)`,
              }}
              className="relative h-[200px] sm:h-[215px] md:h-[225px] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-900 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer flex-shrink-0"
            >
              {/* 100% Bright, Crisp Image Without Dark Overlays */}
              <img
                src={banner.image_url}
                alt={banner.title || 'Special Offer'}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Retain ONLY the neat "Get Offer →" button positioned at bottom-left */}
              <div className="absolute bottom-3 left-3 z-20">
                <button
                  type="button"
                  onClick={(e) => handleClaimOffer(e, banner)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-black/40 transition-all duration-200 hover:scale-105 cursor-pointer"
                  aria-label={`Get Offer for ${banner.offer_code}`}
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-slate-950 text-transparent" />
                  <span>Get Offer</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Previous card"
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/75 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer opacity-70 group-hover/slider:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next card"
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/75 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer opacity-70 group-hover/slider:opacity-100"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Subtle Pagination Indicators */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {banners.map((_, dotIdx) => {
            const isDotActive = dotIdx === activeDotIndex;
            return (
              <button
                key={dotIdx}
                type="button"
                onClick={() => {
                  startTransition(() => {
                    setWithTransition(true);
                    // Jump closest to Set B corresponding dot
                    setCurrentIndex(baseList.length + dotIdx);
                  });
                }}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isDotActive
                    ? 'w-6 h-1.5 bg-amber-500 shadow-sm shadow-amber-500/50'
                    : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HomeHeroSlider;
