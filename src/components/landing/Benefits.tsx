'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import createGlobe from 'cobe';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Quote } from 'lucide-react';

const ART_QUOTES = [
  {
    quote: 'Every child is an artist. The problem is how to remain an artist once he grows up.',
    author: 'Pablo Picasso',
  },
  {
    quote: 'I dream my painting and I paint my dream.',
    author: 'Vincent van Gogh',
  },
  {
    quote: 'Art is the lie that enables us to realize the truth.',
    author: 'Pablo Picasso',
  },
  {
    quote: 'Creativity takes courage.',
    author: 'Henri Matisse',
  },
];

export default function Benefits() {
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate quotes every 4.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveQuoteIndex((prev) => (prev + 1) % ART_QUOTES.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <section className="relative z-20 py-16 sm:py-24 lg:py-32 max-w-7xl mx-auto overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-purple-500/10 via-indigo-500/5 to-transparent dark:from-purple-600/15 dark:via-indigo-600/10 dark:to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Task 1: Heading Redesign */}
      <div className="px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-4 mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-semibold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
          <span>Global Artistic Community</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl lg:leading-tight font-extrabold tracking-tight text-slate-900 dark:text-white">
          Where Creativity Meets Global Inspiration
        </h2>

        <p className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          Connecting extraordinary artists with art lovers and visionaries around the world.
        </p>
      </div>

      {/* Task 2: Globe Centering & Dynamic Art Quotes Carousel */}
      <div className="relative flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Floating Glassmorphism Quotes Carousel */}
        <div className="w-full max-w-3xl z-30 relative mb-4 sm:mb-8">
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="relative w-full rounded-3xl p-6 sm:p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/80 shadow-2xl dark:shadow-purple-950/20 overflow-hidden"
          >
            {/* Subtle ambient colorful backdrop highlights */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Quote Icon Header */}
            <div className="flex justify-center mb-2 sm:mb-3 text-purple-600/40 dark:text-purple-400/40">
              <Quote className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Rotating Quotes Display */}
            <div className="relative min-h-[120px] sm:min-h-[96px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeQuoteIndex}
                  initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="text-center px-2 sm:px-4"
                >
                  <p className="text-base sm:text-xl md:text-2xl font-serif italic text-slate-800 dark:text-slate-100 leading-relaxed drop-shadow-sm">
                    &ldquo;{ART_QUOTES[activeQuoteIndex].quote}&rdquo;
                  </p>
                  <div className="mt-3.5 inline-flex items-center gap-2">
                    <span className="w-6 h-[1.5px] bg-gradient-to-r from-transparent to-purple-500/60" />
                    <p className="text-xs sm:text-sm font-semibold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
                      {ART_QUOTES[activeQuoteIndex].author}
                    </p>
                    <span className="w-6 h-[1.5px] bg-gradient-to-l from-transparent to-purple-500/60" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Indicators */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {ART_QUOTES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQuoteIndex(idx)}
                  aria-label={`Go to quote ${idx + 1}`}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300 cursor-pointer',
                    activeQuoteIndex === idx
                      ? 'w-8 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm shadow-purple-500/30'
                      : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center-Aligned 3D Interactive Globe Element */}
        <div className="relative w-full max-w-[620px] aspect-square flex items-center justify-center -mt-4 sm:-mt-8 pointer-events-auto">
          {/* Subtle glowing halo behind globe */}
          <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute w-80 h-80 bg-blue-500/10 rounded-full blur-2xl -z-10 pointer-events-none" />

          <Globe className="w-full h-full max-w-[600px] max-h-[600px] drop-shadow-[0_20px_60px_rgba(124,58,237,0.18)]" />
        </div>
      </div>
    </section>
  );
}

export const Globe = ({ className }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const r = useRef(0);

  useEffect(() => {
    let phi = 0;

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.15,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.65, 0.35, 1], // Aesthetic violet marker tint
      glowColor: [0.85, 0.7, 1],
      markers: [
        // North America
        { location: [37.7595, -122.4367], size: 0.04 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.08 }, // New York
        { location: [34.0522, -118.2437], size: 0.05 }, // Los Angeles
        { location: [43.6532, -79.3832], size: 0.05 }, // Toronto
        { location: [19.4326, -99.1332], size: 0.04 }, // Mexico City
        // Europe
        { location: [51.5074, -0.1278], size: 0.07 }, // London
        { location: [48.8566, 2.3522], size: 0.06 }, // Paris
        { location: [52.52, 13.405], size: 0.05 }, // Berlin
        { location: [41.9028, 12.4964], size: 0.04 }, // Rome
        { location: [55.7558, 37.6173], size: 0.05 }, // Moscow
        { location: [59.3293, 18.0686], size: 0.03 }, // Stockholm
        // Asia
        { location: [35.6762, 139.6503], size: 0.07 }, // Tokyo
        { location: [1.3521, 103.8198], size: 0.05 }, // Singapore
        { location: [22.3193, 114.1694], size: 0.05 }, // Hong Kong
        { location: [31.2304, 121.4737], size: 0.06 }, // Shanghai
        { location: [37.5665, 126.978], size: 0.05 }, // Seoul
        { location: [28.6139, 77.209], size: 0.06 }, // New Delhi
        { location: [19.076, 72.8777], size: 0.05 }, // Mumbai
        { location: [13.7563, 100.5018], size: 0.04 }, // Bangkok
        { location: [25.2048, 55.2708], size: 0.05 }, // Dubai
        // South America
        { location: [-23.5505, -46.6333], size: 0.06 }, // São Paulo
        { location: [-34.6037, -58.3816], size: 0.04 }, // Buenos Aires
        { location: [-33.4489, -70.6693], size: 0.03 }, // Santiago
        // Africa
        { location: [-33.9249, 18.4241], size: 0.04 }, // Cape Town
        { location: [6.5244, 3.3792], size: 0.04 }, // Lagos
        { location: [30.0444, 31.2357], size: 0.04 }, // Cairo
        // Oceania
        { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
        { location: [-37.8136, 144.9631], size: 0.04 }, // Melbourne
        { location: [-36.8485, 174.7633], size: 0.03 }, // Auckland
      ],
      onRender: (state) => {
        if (pointerInteracting.current === null) {
          phi += 0.005;
        }
        state.phi = phi + r.current;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={(e) => {
        pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      }}
      onPointerUp={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }}
      onPointerOut={() => {
        pointerInteracting.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }}
      onMouseMove={(e) => {
        if (pointerInteracting.current !== null) {
          const delta = e.clientX - pointerInteracting.current;
          pointerInteractionMovement.current = delta;
          r.current = delta * 0.01;
        }
      }}
      onTouchMove={(e) => {
        if (pointerInteracting.current !== null && e.touches[0]) {
          const delta = e.touches[0].clientX - pointerInteracting.current;
          pointerInteractionMovement.current = delta;
          r.current = delta * 0.01;
        }
      }}
      style={{
        width: 600,
        height: 600,
        maxWidth: '100%',
        aspectRatio: 1,
        cursor: 'grab',
      }}
      className={className}
    />
  );
};
