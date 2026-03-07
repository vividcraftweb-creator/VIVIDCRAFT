'use client';

import Link from 'next/link';
import React from 'react';
import {
  Camera,
  CheckCircle,
  ClipboardCheck,
  Search,
  Send,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react';

type StepCard = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'primary' | 'chart-1' | 'chart-2' | 'chart-3';
  step: string;
};

type ProfileSection = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
};

type Milestone = {
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SupportHighlight = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ChecklistItem = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'positive' | 'warning';
};

const quickStartSteps: StepCard[] = [
  {
    step: 'Stage 01',
    title: 'Create your freelancer profile',
    description:
      'Sign up with your preferred email, confirm your role, and verify your address so clients can trust your outreach.',
    icon: UserPlus,
    accent: 'primary',
  },
  {
    step: 'Stage 02',
    title: 'Complete your professional story',
    description:
      'Add skills, experience, portfolio links, and a positioning statement that explains who you help and how.',
    icon: ClipboardCheck,
    accent: 'chart-1',
  },
  {
    step: 'Stage 03',
    title: 'Verify and publish',
    description:
      'Upload identity documents and confirm your availability so clients know you are ready for new engagements.',
    icon: Shield,
    accent: 'chart-2',
  },
  {
    step: 'Stage 04',
    title: 'Start exploring opportunities',
    description:
      'Use job filters and your weekly tokens to prioritize roles that align with your strengths and availability.',
    icon: Search,
    accent: 'chart-3',
  },
];

const profileBlueprint: ProfileSection[] = [
  {
    title: 'Make the first impression count',
    description:
      'Your hero section should prove credibility immediately and reassure clients they can trust you with real work.',
    icon: Camera,
    highlights: [
      'Professional headshot with clean background and confident expression',
      'Concise headline: speciality + audience + value',
      'Pin top testimonials or proof points near the top of the page',
    ],
  },
  {
    title: 'Showcase skills with context',
    description:
      'Move beyond keyword lists. Help clients understand when you have used each ability and the impact it delivered.',
    icon: Star,
    highlights: [
      'Prioritize 8-10 skills and pair each with a short win or stat',
      'Group skills by service category so clients can scan quickly',
      'Keep proficiency ratings honest; clarity beats exaggeration',
    ],
  },
  {
    title: 'Curate a portfolio narrative',
    description:
      'Select projects that mirror the roles you want today. Use storytelling to connect the dots between challenge, solution, and results.',
    icon: Target,
    highlights: [
      'Include 3-5 projects with visuals, metrics, and your exact contribution',
      'Explain collaboration process and tools used with clients',
      'Close with a takeaway that reinforces the type of work you are seeking',
    ],
  },
];

const journeyMilestones: Milestone[] = [
  {
    label: 'Discover',
    title: 'Curate your opportunity feed',
    description:
      'Filter the marketplace by category, rate, and timeline. Spend time understanding the client’s business and desired outcomes.',
    icon: Search,
  },
  {
    label: 'Pitch',
    title: 'Craft tailored proposals',
    description:
      'Summarize the problem in your own words, match your expertise to their needs, and outline a draft action plan with timeline cues.',
    icon: Send,
  },
  {
    label: 'Align',
    title: 'Discuss fit and expectations',
    description:
      'Use messaging to clarify scope, success metrics, collaboration tools, and budget ranges before accepting the work.',
    icon: CheckCircle,
  },
  {
    label: 'Deliver',
    title: 'Move the relationship forward',
    description:
      'Once hired, agree on workflows and keep deliverables, milestones, and feedback loops organized with the tools you already use.',
    icon: Zap,
  },
  {
    label: 'Grow',
    title: 'Capture the win and learnings',
    description:
      'Request testimonials, log results, and update your profile with outcomes to increase credibility for future clients.',
    icon: TrendingUp,
  },
];

const supportHighlights: SupportHighlight[] = [
  {
    title: 'Safety & verification',
    description: 'Identity checks, fraud monitoring, and reporting tools maintain a trusted environment for freelancers.',
    icon: Shield,
  },
  {
    title: 'Application analytics',
    description:
      'Dashboard metrics surface profile views and shortlist rates as you start pitching, helping you iterate with real data.',
    icon: TrendingUp,
  },
  {
    title: 'Responsive support',
    description:
      'Reach out through tickets or live chat whenever you need onboarding help, billing answers, or best-practice guidance.',
    icon: Sparkles,
  },
];

const qualityChecklist: ChecklistItem[] = [
  {
    title: 'Lead with relevance',
    description: 'Open with a personalized hook that references the client\'s product, industry, or current initiative.',
    icon: CheckCircle,
    tone: 'positive',
  },
  {
    title: 'Prove capability',
    description: 'Attach a case study or portfolio link that mirrors their scope, highlighting outcomes you delivered.',
    icon: CheckCircle,
    tone: 'positive',
  },
  {
    title: 'Set expectations',
    description: 'Outline next steps, collaboration tools, and estimated timelines so clients can visualize partnering with you.',
    icon: CheckCircle,
    tone: 'positive',
  },
  {
    title: 'Close with intent',
    description: 'Invite a short call or ask a clarifying question that keeps the conversation moving forward.',
    icon: CheckCircle,
    tone: 'positive',
  },
  {
    title: 'Demonstrate value',
    description: 'Use numbers and metrics to show the ROI or business impact you typically deliver for similar projects.',
    icon: CheckCircle,
    tone: 'positive',
  },
  {
    title: 'Address their challenge',
    description: 'Reference specific pain points from the job post and explain your strategic approach to solving them.',
    icon: CheckCircle,
    tone: 'positive',
  },
];

const GettingStartedPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(59,130,246,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(16,185,129,0.12), transparent 40%), radial-gradient(circle at 20% 85%, rgba(56,189,248,0.1), transparent 55%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/3 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary/25 via-primary/5 to-transparent blur-[140px] opacity-70" />
        <div className="absolute right-[-6rem] top-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-chart-1/30 via-transparent to-chart-2/40 blur-[160px] opacity-60" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full border border-primary/10 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_70%)] opacity-40 backdrop-blur-md" />
        <div
          className="absolute left-[12%] bottom-[18%] h-72 w-72 -translate-x-1/2 rounded-full border border-primary/40 bg-gradient-to-tr from-primary/20 via-transparent to-chart-1/40 opacity-80 animate-spin"
          style={{ animationDuration: '35s' }}
        />
        <div
          className="absolute right-[18%] top-[18%] h-56 w-56 rounded-[40%] border border-chart-2/30 bg-gradient-to-br from-chart-2/20 via-transparent to-primary/30 opacity-70 animate-spin"
          style={{ animationDuration: '26s', animationDirection: 'reverse' }}
        />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pt-8 sm:pb-16">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-3xl" />
          <div className="absolute left-[12%] top-[20%] h-52 w-52 rounded-full bg-chart-1/10 blur-[140px]" />
          <div className="absolute right-[10%] top-[65%] h-64 w-64 rounded-full bg-chart-2/10 blur-[160px]" />
        </div>
        <div className="container relative mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Freelancer Playbook
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Launch, win, and grow your freelance career with confidence.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            This guided walkthrough covers every moment of the JobHorizons freelancer experience, from setting up a
            standout profile to landing your first project and keeping momentum with repeat clients.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 hover:-translate-y-1 hover:bg-primary/90"
            >
              <UserPlus className="h-5 w-5" />
              Create Freelancer Account
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-glass-border/70 bg-background/80 px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary"
            >
              <Search className="h-5 w-5" />
              Explore Opportunities
            </Link>
          </div>
          <dl className="grid w-full gap-6 rounded-2xl border border-glass-border/80 bg-background/70 p-6 text-left shadow-xl sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Token System</dt>
              <dd className="mt-2 text-3xl font-semibold text-foreground">Weekly Refresh</dd>
              <p className="mt-1 text-sm text-muted-foreground">Use tokens strategically to prioritize high-value opportunities.</p>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Response Time</dt>
              <dd className="mt-2 text-3xl font-semibold text-foreground">&lt; 24 hours</dd>
              <p className="mt-1 text-sm text-muted-foreground">Most clients review proposals within one business day.</p>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Verification review</dt>
              <dd className="mt-2 text-3xl font-semibold text-foreground">24–48 hrs</dd>
              <p className="mt-1 text-sm text-muted-foreground">Most profiles are verified within two business days after documents are submitted.</p>
            </div>
          </dl>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* Quick Start */}
        <section className="mb-20">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Your first week roadmap</h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Follow these four stages to publish your profile and begin pitching with clarity.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {quickStartSteps.map((step) => {
              const Icon = step.icon;
              const accent =
                step.accent === 'primary'
                  ? 'bg-primary/12 text-primary'
                  : step.accent === 'chart-1'
                  ? 'bg-chart-1/12 text-chart-1'
                  : step.accent === 'chart-2'
                  ? 'bg-chart-2/12 text-chart-2'
                  : 'bg-chart-3/12 text-chart-3';

              return (
                <div
                  key={step.title}
                  className="group relative overflow-hidden rounded-3xl border border-glass-border/70 bg-background/85 p-6 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-1/10" />
                  </div>
                  <div className="relative flex flex-col gap-6">
                    <span
                      className={`inline-flex w-fit items-center justify-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest ${accent}`}
                    >
                      {step.step}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shadow-primary/25">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Profile Blueprint */}
        <section className="mb-20">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Design a profile that wins trust</h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Treat your profile like a living sales page. Every section should reinforce why you are the right choice
                for the roles you pursue.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Profile Blueprint
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {profileBlueprint.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-3xl border border-glass-border/70 bg-background/80 p-8 transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-chart-2/10" />
                  </div>
                  <div className="relative flex h-full flex-col gap-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner shadow-primary/25">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                    </div>
                    <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                      {section.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-3">
                          <CheckCircle className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application Strategy */}
        <section className="mb-20">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Apply with Purpose</h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Quality applications win contracts. Focus on fit, not volume.
            </p>
          </div>
          <div className="rounded-3xl border border-glass-border/80 bg-background/85 p-8 shadow-xl md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <Zap className="h-8 w-8 text-primary" />
              <h3 className="text-2xl font-semibold text-foreground">Smart Application Strategy</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {qualityChecklist.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-inner shadow-black/10"
                  >
                    <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-foreground">{item.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/8 p-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Best Practices</h4>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>• Research client needs and company context before applying</li>
                    <li>• Tailor each proposal to the specific project requirements</li>
                    <li>• Track response rates and refine your approach based on results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* End-to-end journey */}
        <section className="mb-20">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">From discovery to long-term partners</h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Understand the flow each successful freelancer follows. The more intentional you are at every step, the
              faster you secure aligned work.
            </p>
          </div>
          <div className="relative rounded-3xl border border-glass-border/70 bg-background/85 p-8 shadow-xl">
            <div className="absolute left-6 top-20 hidden h-[calc(100%-5rem)] w-0.5 bg-gradient-to-b from-primary/50 via-chart-1/50 to-chart-2/50 md:block" />
            <div className="space-y-10">
              {journeyMilestones.map((milestone, index) => {
                const Icon = milestone.icon;
                return (
                  <div
                    key={milestone.title}
                    className="relative grid gap-6 rounded-2xl border border-glass-border/80 bg-background/90 p-6 shadow-inner shadow-black/5 transition-all duration-300 hover:border-primary/40 md:grid-cols-[auto_1fr]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="hidden h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold uppercase tracking-widest text-primary md:flex">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner shadow-primary/25">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {milestone.label}
                      </span>
                      <h3 className="mt-3 text-xl font-semibold text-foreground">{milestone.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Support system */}
        <section className="mb-20">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Tools and support that keep you moving</h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                You are never on your own. JobHorizons provides guidance, data, and safety net features so you can focus
                on delivering great work.
              </p>
            </div>
            <div className="rounded-2xl border border-chart-1/30 bg-chart-1/10 px-4 py-2 text-sm font-medium text-chart-1">
              Available to all verified freelancers
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {supportHighlights.map((support) => {
              const Icon = support.icon;
              return (
                <div
                  key={support.title}
                  className="rounded-3xl border border-glass-border/70 bg-background/85 p-7 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-2xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner shadow-primary/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{support.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{support.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background/60 to-chart-1/20 p-12 text-center shadow-2xl">
          <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Ready to craft your next win on JobHorizons?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Publish your optimized profile, curate a list of dream projects, and use your weekly tokens to start real
            conversations with clients who value your expertise.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 hover:-translate-y-1 hover:bg-primary/90"
            >
              <UserPlus className="h-5 w-5" />
              Launch My Profile
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-glass-border/70 bg-background/80 px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:text-primary"
            >
              <Search className="h-5 w-5" />
              Browse Active Jobs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GettingStartedPage;
