import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import dynamic from 'next/dynamic';
import { HomeHero } from '@/components/landing/HomeHero';

const FeaturedCrew = dynamic(() => import('@/components/FeaturedCrew'), {
  ssr: true,
  loading: () => <div className="w-full py-16 bg-slate-50/70 dark:bg-slate-950 animate-pulse" />,
});

export const metadata: Metadata = createPageMetadata({
  title: 'Home',
  description: 'Cinnamon Gallery connects talented freelancers with quality remote work opportunities. Discover verified projects, build your career, and work with trusted clients worldwide.',
  keywords: [
    'remote jobs',
    'freelance work',
    'work from home',
    'online jobs',
    'freelance marketplace',
    'hire freelancers',
    'remote opportunities',
    'freelance platform',
  ],
  canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <HomeHero />
      {/* Featured Crew Showcase & Manual Reviews */}
      <FeaturedCrew />
    </div>
  );
}
