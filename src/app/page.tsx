import { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';
import Hero from '@/components/landing/Hero';
import Benefits from '@/components/landing/Benefits';
import Features from '@/components/landing/Features';
import CTA from '@/components/landing/CTA';

export const metadata: Metadata = createPageMetadata({
  title: 'Home',
  description: 'Vivid Art connects talented freelancers with quality remote work opportunities. Discover verified projects, build your career, and work with trusted clients worldwide.',
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
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-hidden">
      <Hero />
      <Benefits />
      <Features />
      <CTA />
    </div>
  );
}
