'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { trackEvent } from '@/utils/analytics';
import { useRouter } from 'next/navigation';
import { useAuth as useSession } from '@/hooks/useAuth';
import Prism from '@/components/ui/Prism';

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: session } = useSession();
  const router = useRouter();

  const userRole = session?.session?.user?.role ?? null;

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    trackEvent('hero_search_submit', { query: searchQuery });
    router.push(`/jobs?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/90 to-background flex items-center justify-center -mt-28" suppressHydrationWarning>
      {/* Vibrant fluid gradient mesh (adapts to light/dark) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#09090e] transition-colors duration-500">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-400/30 dark:bg-indigo-600/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-1000" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[60%] rounded-full bg-rose-300/30 dark:bg-fuchsia-600/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-300/30 dark:bg-cyan-700/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Canvas noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      <div className="container relative z-10 mx-auto flex flex-col items-center gap-8 sm:gap-12 px-4 text-center sm:px-6">
        <div className="max-w-3xl">

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-white/30 bg-white/60 dark:bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm">
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white sm:text-base">✨ The Art Marketplace</span>
          </div>

          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white drop-shadow-sm dark:drop-shadow-none">
            Discover and Collect Extraordinary Art from Independent Artists
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-slate-700 dark:text-white/90 max-w-2xl mx-auto font-medium dark:font-normal">
            Built for art lovers and artists seeking seamless connections, trusted partnerships, and creative inspiration.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium interactive-scale shadow-lg group-hover:shadow-xl bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90 rounded-full"
              onClick={() => trackEvent('hero_cta_click', { button: 'find_work' })}
            >
              <Link href="/jobs" className="group w-full sm:w-auto">
                <TrendingUp className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Explore Art
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8 py-4 text-lg font-medium interactive-scale rounded-full border-slate-300 bg-white/80 text-slate-800 hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 backdrop-blur-md shadow-sm"
              onClick={() => trackEvent('hero_cta_click', { button: 'hire_freelancers' })}
            >
              <Link href={userRole === 'CLIENT' ? '/jobs/create' : '/freelancers'} className="group w-full sm:w-auto">
                <Sparkles className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Discover Artists
              </Link>
            </Button>
          </div>

          <div className="mt-12 w-full">
            <div className="mx-auto w-full max-w-2xl rounded-full border border-slate-300 dark:border-white/30 bg-white/90 dark:bg-white/15 backdrop-blur-xl shadow-xl dark:shadow-2xl px-4 py-3 sm:px-6 sm:py-3.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
              <div className="flex w-full items-center gap-4 sm:gap-5">
                <Search className="h-5 w-5 shrink-0 text-slate-400 dark:text-white/60 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search by medium, style, or artist…"
                  className="flex-1 border-none bg-transparent px-2 text-left text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/60 focus-visible:ring-0 sm:text-base font-medium"
                  aria-label="Search for jobs by title or skill"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  size="sm"
                  className="shrink-0 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-white/90 px-5 py-2 sm:px-6 transition-colors font-medium shadow-sm"
                >
                  Search
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
