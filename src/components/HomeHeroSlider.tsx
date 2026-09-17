'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  badge: string;
  title: string;
  subtitle: string;
  cta_text?: string;
  link_url?: string;
  image_url: string;
  accent?: string;
  offer_code: string;
  is_active?: boolean;
}

interface HomeHeroSliderProps {
  className?: string;
}

export function HomeHeroSlider({ className = '' }: HomeHeroSliderProps) {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Fetch dynamic banners directly from Supabase advertisements table
  useEffect(() => {
    let isMounted = true;
    async function loadBanners() {
      try {
        const supabase = createClient();
        // 1. Fetch directly from advertisements table
        let { data, error } = await supabase
          .from('advertisements')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          const bRes = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });
          if (!bRes.error) {
            data = bRes.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data) && isMounted) {
          setBanners(data as BannerSlide[]);
          setIsLoading(false);
          return;
        }

        // 2. Fallback to API route if direct query failed
        const res = await fetch('/api/banners');
        if (res.ok) {
          const json = await res.json();
          if (json?.banners && Array.isArray(json.banners) && isMounted) {
            setBanners(json.banners);
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

  const totalSlides = banners.length || 1;

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  }, [totalSlides]);

  // Auto-play sliding every 4 seconds with pause-on-hover
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      handleNext();
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused, handleNext, totalSlides]);

  // Mobile Touch Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  // Handle "Get Offer" WhatsApp Claim
  const handleClaimOffer = (e: React.MouseEvent, banner: BannerSlide) => {
    e.stopPropagation();
    const offerCode = banner.offer_code || 'OFFER-7842';

    // Support phone number resolution
    const configuredPhone =
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
      process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
      DEFAULT_WHATSAPP_NUMBER ||
      '94783813833';
    const cleanPhone = String(configuredPhone).replace(/\D/g, '') || '94783813833';

    // Build standard wa.me URL
    const message = `Hi, I want to claim this offer code: ${offerCode}`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isLoading && banners.length === 0) {
    return null;
  }

  if (isLoading && banners.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="relative w-full h-[280px] sm:h-[380px] md:h-[440px] lg:h-[490px] rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-amber-950/10 dark:shadow-black/40 bg-slate-900 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Aspect Ratio Container */}
        <div className="relative w-full h-[280px] sm:h-[380px] md:h-[440px] lg:h-[490px] overflow-hidden">
          {banners.map((banner, index) => {
            const isActive = index === currentSlide;

            return (
              <div
                key={banner.id || index}
                onClick={() => {
                  if (banner.link_url) {
                    router.push(banner.link_url);
                  }
                }}
                className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out cursor-pointer ${
                  isActive
                    ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                    : 'opacity-0 scale-105 z-0 pointer-events-none'
                }`}
              >
                {/* Background Image - 100% bright and crisp without dark filter */}
                <img
                  src={banner.image_url}
                  alt={banner.title || 'Banner'}
                  className="w-full h-full object-cover object-center transition-transform duration-7000 ease-out group-hover:scale-105"
                />

                {/* Only the "Get Offer →" Button positioned neatly on top of the banner */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20">
                  <button
                    type="button"
                    onClick={(e) => handleClaimOffer(e, banner)}
                    className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-black/40 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    aria-label={`Get Offer for ${banner.offer_code}`}
                  >
                    <MessageCircle className="w-4 h-4 fill-slate-950 text-transparent" />
                    <span>Get Offer</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Left Navigation Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Previous slide"
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer opacity-75 sm:opacity-90 hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Right Navigation Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next slide"
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/75 text-white/90 hover:text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer opacity-75 sm:opacity-90 hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Bottom-Center Pagination Dots */}
        <div className="absolute bottom-3.5 sm:bottom-5 left-1/2 -translate-y-0 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {banners.map((_, dotIndex) => {
            const isCurrent = dotIndex === currentSlide;

            return (
              <button
                key={dotIndex}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(dotIndex);
                }}
                aria-label={`Go to slide ${dotIndex + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isCurrent
                    ? 'w-7 h-2 bg-amber-500 shadow-md shadow-amber-500/50'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HomeHeroSlider;
