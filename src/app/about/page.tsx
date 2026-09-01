'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  CheckCircle,
  Code,
  Compass,
  HeartHandshake,
  Lightbulb,
  MessageCircle,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

type HighlightCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
};

type Principle = {
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

type TimelineStep = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const highlightCards: HighlightCard[] = [
  {
    title: 'Built for trust',
    description:
      'Document verification, fraud detection, and moderation workflows keep every interaction accountable from day one.',
    icon: Shield,
    accent: 'from-primary/40 via-primary/15 to-background/90',
  },
  {
    title: 'Quality over noise',
    description:
      'Tokens limit spam and elevate thoughtful proposals, while clients surface in curated feeds designed for relevance.',
    icon: Target,
    accent: 'from-chart-1/40 via-chart-1/15 to-background/90',
  },
  {
    title: 'Owned relationships',
    description:
      'We connect professionals and teams, then get out of the way. Contracts, payments, and delivery stay in your tools.',
    icon: HeartHandshake,
    accent: 'from-chart-2/40 via-chart-2/15 to-background/90',
  },
];

const principles: Principle[] = [
  {
    title: 'Transparency every step',
    body: 'Clear expectations, active status tracking, and open communication flows keep both sides aligned.',
    icon: Compass,
  },
  {
    title: 'Respect for expertise',
    body: 'Professionals showcase portfolios, testimonials, and verified skills so hiring teams can move with confidence.',
    icon: Award,
  },
  {
    title: 'Efficient collaboration',
    body: 'Job wizards, proposal inboxes, and conversation threads reduce friction from posting to kickoff.',
    icon: MessageCircle,
  },
  {
    title: 'Security baked in',
    body: 'Role-based permissions, audit logs, and identity checks protect data without slowing momentum.',
    icon: Shield,
  },
];

const timeline: TimelineStep[] = [
  {
    title: 'The spark',
    description:
      'After years of freelancing, it was clear: professionals needed a platform that respects their time and craft.',
    icon: Lightbulb,
  },
  {
    title: 'Crafting the experience',
    description:
      'Design, engineering, and content were built from scratch with a single goal: leave bureaucracy behind and move experiences forward.',
    icon: Code,
  },
  {
    title: 'Launching Vivid Art',
    description:
      'We introduced a token-driven, verification-first network that balances opportunity flow for both clients and freelancers.',
    icon: Briefcase,
  },
  {
    title: 'Growing together',
    description:
      'Every release delivers faster matching, richer profiles, and deeper analytics while keeping ownership in the hands of the community.',
    icon: Users,
  },
];

const AboutPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.12), transparent 45%), radial-gradient(circle at 75% 10%, rgba(129,140,248,0.12), transparent 55%), radial-gradient(circle at 55% 80%, rgba(45,212,191,0.12), transparent 50%)',
        }}
      />

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden pt-6 pb-12 sm:pt-8 sm:pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[12%] top-[10%] h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-[15%] top-[30%] h-48 w-48 rounded-full bg-chart-1/20 blur-3xl" />
          <div className="absolute left-1/2 bottom-[-20%] h-64 w-64 -translate-x-1/2 rounded-full bg-chart-2/15 blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto flex flex-col gap-16 px-4 sm:px-6 lg:flex-row lg:items-center lg:gap-24">
          <div className="max-w-2xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition-all duration-700 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              About Vivid Art
            </div>
            <h1
              className={`mt-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl transition-all duration-700 delay-100 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              Building a professional network that respects expertise.
            </h1>
            <p
              className={`mt-6 text-base text-muted-foreground sm:text-lg lg:text-xl transition-all duration-700 delay-200 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              Vivid Art was crafted to give freelancers and clients a modern, ownership-first platform. We connect
              people who value thoughtful collaboration, then let them run with their own agreements.
            </p>
            <div
              className={`mt-10 flex flex-col gap-4 sm:flex-row transition-all duration-700 delay-300 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-1 hover:bg-primary/90"
              >
                See how Vivid Art works
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 rounded-xl border border-glass-border/70 bg-background/80 px-6 py-3 text-sm font-semibold text-foreground transition-transform duration-300 hover:-translate-y-1 hover:border-primary/50"
              >
                Explore jobs and talent
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-gradient-to-br from-primary/20 via-transparent to-chart-1/20 blur-3xl" />
            <div className="relative rounded-[30px] border border-white/10 bg-background/85 p-8 shadow-[0_55px_140px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="rounded-full bg-primary/15 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Independent craft
                </div>
                <BadgeCheck className="h-5 w-5 text-chart-1" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">
                One founder. One mission.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Vivid Art is designed, engineered, and operated by a solo creator who built the platform he wished existed, a place where
                professionals connect without giving up control.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-primary/10 p-4">
                  <h3 className="text-sm font-semibold text-primary">Crafted in public</h3>
                  <p className="mt-1 text-xs text-primary/80">
                    Every launch is shipped transparently, with feedback guiding the roadmap.
                  </p>
                </div>
                <div className="rounded-2xl border border-chart-1/10 bg-chart-1/10 p-4">
                  <h3 className="text-sm font-semibold text-chart-1">Future-focused</h3>
                  <p className="mt-1 text-xs text-chart-1/80">
                    Continuous improvements keep collaboration modern, fast, and secure.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <Users className="h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">
                  Trusted by teams who want curated talent and freelancers who refuse low-quality work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {highlightCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`group relative overflow-hidden rounded-[26px] border border-white/10 bg-background/80 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.25)] transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_50px_140px_rgba(15,23,42,0.3)]`}
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative flex items-start gap-3">
                  <div className="rounded-xl bg-background/70 p-2 text-primary shadow-inner shadow-primary/30">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Principles */}
      <section className="container mx-auto max-w-6xl px-4 pt-8 pb-12 sm:pt-10 sm:pb-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Principles that shape Vivid Art</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Every feature builds toward transparency, trust, and professional respect.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div
                key={principle.title}
                className="group flex gap-4 rounded-3xl border border-white/10 bg-background/85 p-6 transition-transform duration-500 hover:-translate-y-2 hover:shadow-[0_35px_120px_rgba(15,23,42,0.25)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{principle.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{principle.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">From idea to impact</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            The milestones that shaped Vivid Art into the platform it is today.
          </p>
        </div>
        <div className="relative mt-12">
          <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/60 via-chart-1/40 to-transparent lg:block" />
          <div className="space-y-16">
            {timeline.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              return (
                <div
                  key={step.title}
                  className="relative grid gap-8 lg:grid-cols-2 lg:items-center"
                >
                  <div className={`lg:${isEven ? 'order-1 text-right' : 'order-2'}`}>
                    <div className="inline-block rounded-[24px] border border-white/10 bg-background/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.25)]">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 lg:justify-end">
                        <span>{step.title}</span>
                        <Icon className="h-5 w-5 text-primary" />
                      </h3>
                      <p className={`mt-2 text-sm text-muted-foreground ${isEven ? 'lg:text-right' : ''}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-center lg:${isEven ? 'order-2' : 'order-1'}`}>
                    <div className="relative h-10 w-10 rounded-full bg-primary/80">
                      <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="container mx-auto max-w-6xl px-4 pt-8 pb-12 sm:pt-10 sm:pb-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-white/10 bg-background/85 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.3)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Founder&apos;s note
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">
              “This isn&apos;t a marketplace built for volume. It&apos;s engineered to champion people who take their craft seriously.”
            </h3>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              As a freelancer turned founder, I saw firsthand how difficult it is to separate signal from noise. Vivid Art is built so
              the right conversations happen faster and both sides keep control while working together.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="rounded-2xl border border-primary/10 bg-primary/10 px-5 py-3 text-sm text-primary">
                Crafted solo, built for teams
              </div>
              <div className="rounded-2xl border border-chart-1/10 bg-chart-1/10 px-5 py-3 text-sm text-chart-1">
                Shipped transparently with community feedback
              </div>
            </div>
          </div>
          <div className="rounded-[32px] border border-white/10 bg-background/80 p-8 shadow-[0_35px_110px_rgba(15,23,42,0.25)]">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/15 p-3 text-primary">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Built around real outcomes</p>
                <p className="text-lg font-semibold text-foreground">Vivid Art Guiding Values</p>
              </div>
            </div>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                <span>Freelancers control their pipeline while showcasing relevant expertise.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                <span>Clients discover curated talent without being flooded by low-signal applications.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                <span>Every feature is reviewed through the lens of trust, transparency, and ownership.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="glass-card rounded-[32px] border border-white/10 bg-gradient-to-r from-primary/20 via-background/80 to-chart-1/20 p-10 text-center shadow-[0_40px_120px_rgba(15,23,42,0.35)]">
            <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Your next collaboration starts here.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Join a community where craftsmanship matters and every conversation values your time.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-1 hover:bg-primary/90"
              >
                Create your Vivid Art account
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white/80 transition-transform duration-300 hover:-translate-y-1 hover:border-white/40 hover:text-white"
              >
                Learn more about the workflow
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
