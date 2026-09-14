export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Explore Art & Collections - Coming Soon',
  description:
    'We are curating incredible new ways for you to discover art. This feature will be available soon on Vivid Art.',
});

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 pt-32 pb-24 relative overflow-hidden flex items-center justify-center transition-colors duration-300">
      {/* Aesthetic ambient lighting gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-purple-500/15 via-indigo-500/10 to-transparent dark:from-purple-600/20 dark:via-indigo-600/10 dark:to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-purple-500/10 dark:bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-blue-500/10 dark:bg-blue-900/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        {/* Card Container */}
        <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 sm:p-14 shadow-2xl shadow-slate-200/50 dark:shadow-purple-950/20 backdrop-blur-xl space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-bold tracking-wider uppercase shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
            <span>Coming Soon</span>
          </div>

          {/* Compass Icon Graphic */}
          <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 opacity-20 dark:opacity-30 blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center shadow-lg">
              <Compass className="w-12 h-12 sm:w-14 sm:h-14 text-purple-600 dark:text-purple-400 transition-transform duration-700 hover:rotate-45" />
            </div>
          </div>

          {/* Headings */}
          <div className="space-y-4 max-w-xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Explore Art & Collections
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
              We are curating incredible new ways for you to discover art. This feature will be available soon!
            </p>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/gallery" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 gap-2 cursor-pointer transition-all duration-200"
              >
                <span>Go to Gallery</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/artists" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl cursor-pointer"
              >
                <span>Discover Artists</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
