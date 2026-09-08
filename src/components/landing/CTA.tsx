'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BackgroundLines } from '@/components/ui/background-lines';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function CTA() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, [supabase.auth]);
  return (
    <section className="relative isolate overflow-hidden pb-20 sm:pb-0">
      <BackgroundLines className="flex items-center justify-center w-full flex-col px-4 sm:px-6 py-16 sm:py-20 md:py-24 lg:py-28">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8 relative z-20">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-neutral-600 dark:text-neutral-400" />
          <span className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            For Artists & Clients
          </span>
        </div>

        {/* Heading */}
        <h2 className="bg-clip-text text-transparent text-center bg-gradient-to-b from-neutral-900 to-neutral-700 dark:from-neutral-600 dark:to-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-sans py-2 sm:py-4 md:py-6 relative z-20 font-bold tracking-tight leading-tight max-w-4xl px-4">
          Start Your Vivid Art Today.
          <br />
          Find Work or Hire Talent.
        </h2>

        {/* Description */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg lg:text-xl text-neutral-700 dark:text-neutral-400 text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 relative z-20 px-4">
          Whether you're an artist seeking opportunities or a client looking for top talent,
          get started with 150 free tokens per week. No credit card required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center relative z-20 w-full sm:w-auto px-4 max-w-md sm:max-w-none mx-auto">
          <Button
            asChild
            size="lg"
            className="group w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-6 sm:px-8 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Link href={user ? '/dashboard' : '/auth/signup'} className="w-full sm:w-auto">
              {user ? 'Go to Dashboard' : 'Start For Free'}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold rounded-full border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-900 dark:hover:border-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-all"
          >
            <Link href="/how-it-works" className="w-full sm:w-auto">
              Learn More
            </Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="mt-6 sm:mt-8 md:mt-10 lg:mt-12 flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 text-xs sm:text-sm text-neutral-500 dark:text-neutral-500 relative z-20 px-4">
          <div className="whitespace-nowrap">
            <span className="font-medium">🚀 150</span> free tokens weekly
          </div>
          <div className="whitespace-nowrap">
            <span className="font-medium">✓</span> No credit card required
          </div>
          <div className="whitespace-nowrap">
            <span className="font-medium">✓</span> Get started in minutes
          </div>
        </div>
      </BackgroundLines>
    </section>
  );
}
