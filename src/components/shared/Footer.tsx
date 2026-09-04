'use client';
import React from 'react';
import Link from 'next/link';
import {
  Linkedin,
  Mail,
  Shield,
  Zap,
  Star,
  ArrowUp,
  Heart,
  Facebook,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth as useSession } from '@/hooks/useAuth';

const getFooterSections = (userRole?: string) => [
  {
    title: 'Platform',
    links: [
      { name: 'Find Art', href: '/jobs' },
      { name: 'Browse Artists', href: '/freelancers' },
      { name: 'How It Works', href: '/how-it-works' },
    ],
  },
  {
    title: 'For Artists',
    links: [
      {
        name: 'Getting Started',
        href: userRole === 'FREELANCER' ? '/freelancer/checklist' : '/freelancers/getting-started',
      },
    ],
  },
  {
    title: 'For Collectors',
    links: [
      { name: 'List Artwork', href: '/jobs/create' },
      { name: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'About Us', href: '/about' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const socialLinks = [
  { name: 'LinkedIn', href: '#', icon: Linkedin },
  { name: 'X', href: '#', icon: X },
  { name: 'Facebook', href: '#', icon: Facebook },
  { name: 'Email', href: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@yourdomain.com'}`, icon: Mail },
];
const Footer = () => {
  const { data: session } = useSession();
  const userRole = session?.session?.user?.role;
  const footerSections = getFooterSections(userRole);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-gradient-to-b from-transparent to-background/50 border-t border-glass-border">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute -top-20 right-1/3 w-64 h-64 rounded-full bg-chart-1/8 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2.5 group w-fit">
                <svg
                  className="w-8 h-8 group-hover:scale-110 transition-transform duration-300"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="footerLogoGrad1" x1="0" y1="0" x2="48" y2="48">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                    <linearGradient id="footerLogoGrad2" x1="48" y1="0" x2="0" y2="48">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#8B5CF6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M24 4C13 4 6 14 10 24C14 34 20 38 24 44C28 38 34 34 38 24C42 14 35 4 24 4Z"
                    fill="url(#footerLogoGrad1)"
                    fillOpacity="0.9"
                  />
                  <path
                    d="M16 14L24 34L32 14"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="36" cy="12" r="3" fill="url(#footerLogoGrad2)" />
                </svg>
                <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                  Vivid Art
                </span>
              </Link>

              <p className="text-muted-foreground leading-relaxed max-w-md pt-2">
                Connecting artists with art lovers worldwide. Discover, collect, and celebrate creativity.
              </p>

              {/* Key Features */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-muted-foreground">150 weekly tokens for freelancers</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-chart-1/20 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-chart-1" />
                  </div>
                  <span className="text-muted-foreground">Document-verified clients</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-chart-2/20 flex items-center justify-center">
                    <Star className="h-3 w-3 text-chart-2" />
                  </div>
                  <span className="text-muted-foreground">AI-powered fraud prevention</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.name}
                      href={social.href}
                      className="glass-button p-3 rounded-xl hover:scale-110 transition-transform group"
                      aria-label={social.name}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer Links */}
            <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-8">
              {footerSections.map((section) => (
                <div key={section.title} className="space-y-4">
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors hover:translate-x-1 inline-block duration-300"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-glass-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Building the future of freelance work
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" />
                <span>for clients & freelancers</span>
              </div>
              <Button
                onClick={scrollToTop}
                variant="ghost"
                className="glass-button p-2 rounded-xl hover:scale-110 transition-transform"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-center pt-6 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vivid Art. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
