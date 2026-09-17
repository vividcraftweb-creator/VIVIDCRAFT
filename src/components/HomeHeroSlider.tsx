'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Tag,
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

export const DEFAULT_ADVERTISING_BANNERS: BannerSlide[] = [
  {
    id: 'banner-gallery',
    badge: 'Curated Masterpieces',
    title: 'Explore Original Fine Art & Portfolios',
    subtitle: 'Discover oil paintings, digital art, sculptures, and mixed media ranked by verified collectors and creators.',
    cta_text: 'Get Offer',
    link_url: '/gallery',
    image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80',
    accent: 'from-amber-500/20 to-orange-500/10',
    offer_code: 'OFFER-7842',
  },
  {
    id: 'banner-artists',
    badge: 'Verified Creators',
    title: 'Commission Elite Artists for Custom Works',
    subtitle: 'Connect directly with master painters, illustrators, and visual designers for custom portraits and bespoke commissions.',
    cta_text: 'Get Offer',
    link_url: '/artists',
    image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1920&q=80',
    accent: 'from-purple-500/20 to-pink-500/10',
    offer_code: 'OFFER-5190',
  },
  {
    id: 'banner-bidding',
    badge: 'Live Art Auctions',
    title: 'Exclusive Art Auctions & Open Bidding',
    subtitle: 'Place competitive bids on rare, one-of-a-kind original creations or enter your masterpiece into live auctions.',
    cta_text: 'Get Offer',
    link_url: '/bidding',
    image_url: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1920&q=80',
    accent: 'from-blue-500/20 to-cyan-500/10',
    offer_code: 'OFFER-3421',
  },
  {
    id: 'banner-creator',
    badge: 'Join Vivid Art',
    title: 'Showcase Your Art & Sell to Global Collectors',
    subtitle: 'Join Sri Lanka’s premier digital art marketplace. Create your artist profile, upload artworks, and get discovered.',
    cta_text: 'Get Offer',
    link_url: '/auth/signup',
    image_url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1920&q=80',
    accent: 'from-emerald-500/20 to-teal-500/10',
    offer_code: 'OFFER-9018',
  },
];

interface HomeHeroSliderProps {
  className?: string;
}

export function HomeHeroSlider({ className = '' }: HomeHeroSliderProps) {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerSlide[]>(DEFAULT_ADVERTISING_BANNERS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Fetch dynamic banners from Supabase database live rows
  useEffect(() => {
    let isMounted = true;
    async function loadBanners() {
      try {
        // 1. Direct Supabase live query
        const supabase = createClient();
        let { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
          const adRes = await supabase
            .from('advertisements')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });
          if (!adRes.error) {
            data = adRes.data;
            error = null;
          }
        }

        if (!error && Array.isArray(data) && isMounted) {
          if (data.length > 0) {
            setBanners(data as BannerSlide[]);
            return;
          }
        }

        // 2. Fallback to API route
        const res = await fetch('/api/banners');
        if (res.ok) {
          const json = await res.json();
          if (json?.banners && Array.isArray(json.banners) && isMounted) {
            if (json.banners.length > 0) {
              setBanners(json.banners);
            }
          }
        }
      } catch (e) {
        // Silently retain current banners on network failure
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
                {/* Background Image */}
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover object-center filter brightness-[0.88] dark:brightness-[0.75] transition-transform duration-7000 ease-out group-hover:scale-105"
                />

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 sm:bg-gradient-to-r sm:from-black/90 sm:via-black/55 sm:to-transparent" />

                {/* Banner Content */}
                <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-6 sm:p-10 md:p-14 lg:p-16 max-w-2xl text-left z-20 space-y-2 sm:space-y-3.5">
                  {/* Badge & Offer Code Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {banner.badge}
                    </span>

                    {/* Prominent Offer Code Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider bg-black/50 text-amber-400 border border-amber-400/50 backdrop-blur-md shadow-sm">
                      <Tag className="w-3 h-3 text-amber-400" />
                      Code: {banner.offer_code}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
                    {banner.title}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-xs sm:text-sm md:text-base text-slate-200 font-normal leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-xl drop-shadow-sm">
                    {banner.subtitle}
                  </p>

                  {/* Clickable "Get Offer →" Action Button connected to WhatsApp */}
                  <div className="pt-2 sm:pt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleClaimOffer(e, banner)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                      aria-label={`Get Offer for ${banner.title}`}
                    >
                      <MessageCircle className="w-4 h-4 fill-slate-950 text-transparent" />
                      <span>Get Offer</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <span className="text-[11px] text-amber-200/80 hidden sm:inline-block font-mono">
                      Claim via WhatsApp with code{' '}
                      <span className="text-amber-400 font-bold underline decoration-amber-400/50">
                        {banner.offer_code}
                      </span>
                    </span>
                  </div>
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
