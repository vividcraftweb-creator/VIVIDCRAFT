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
      {/* Prism background */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Prism
          animationType="rotate"
          timeScale={0.1}
          height={3.5}
          baseWidth={5.5}
          scale={2.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>

      <div className="container relative z-10 mx-auto flex flex-col items-center gap-8 sm:gap-12 px-4 text-center sm:px-6">
        <div className="max-w-3xl">

          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2">
            <span className="text-xs sm:text-sm font-semibold text-white sm:text-base">✨ The Future of Freelancing</span>
          </div>

          <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
            Connecting Businesses with Trusted Freelance Professionals
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-white/90">
          Built for businesses and professionals seeking seamless connections, trusted partnerships, and real results.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/jobs" className="group w-full sm:w-auto">
              <Button
                size="lg"
                className="glass-button w-full px-8 py-4 text-lg font-medium interactive-scale group-hover:shadow-xl"
                onClick={() => trackEvent('hero_cta_click', { button: 'find_work' })}
              >
                <TrendingUp className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Explore Jobs
              </Button>
            </Link>
            <Link href={userRole === 'CLIENT' ? '/jobs/create' : '/freelancers'} className="group w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="glass-button w-full px-8 py-4 text-lg font-medium interactive-scale"
                onClick={() => trackEvent('hero_cta_click', { button: 'hire_freelancers' })}
              >
                <Sparkles className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Hire Talent
              </Button>
            </Link>
          </div>

          <div className="mt-8 w-full">
            <div className="mx-auto w-full max-w-2xl rounded-full border border-white/30 bg-white/15 backdrop-blur-md shadow-lg px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="flex w-full items-center gap-4 sm:gap-5">
                <Search className="h-5 w-5 shrink-0 text-gray-700 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search by role, skill, or industry…"
                  className="flex-1 border-none bg-transparent px-2 text-left text-sm text-white placeholder:text-white/60 focus-visible:ring-0 sm:text-base"
                  aria-label="Search for jobs by title or skill"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  size="sm"
                  className="shrink-0 rounded-full bg-white text-gray-900 hover:bg-white/90 px-5 py-2 sm:px-6 transition-colors"
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
