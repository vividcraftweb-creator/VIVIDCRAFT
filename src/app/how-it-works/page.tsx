'use client';

import Link from 'next/link';
import React from 'react';
import {
  ArrowRightCircle,
  Briefcase,
  ClipboardCheck,
  Handshake,
  Search,
  Layers,
  LineChart,
  MessageCircle,
  ShieldCheck,
  Star,
  Target,
  Users,
} from 'lucide-react';

type WorkflowStep = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type RoleHighlight = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type JourneyStep = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const workflowSteps: WorkflowStep[] = [
  {
    title: 'Clients share detailed job briefs',
    description:
      'Verified hiring teams publish openings with scope, budget guidance, and collaboration expectations so freelancers know what success looks like.',
    icon: ClipboardCheck,
  },
  {
    title: 'Freelancers explore and shortlist',
    description:
      'Professionals filter jobs by skill, industry, rate, or timeline and bookmark the opportunities that align with their expertise.',
    icon: Search,
  },
  {
    title: 'Applications arrive in client inboxes',
    description:
      'Clients review structured proposals, compare portfolios, and message shortlisted freelancers directly from their dashboard.',
    icon: MessageCircle,
  },
  {
    title: 'Relationship moves off-platform',
    description:
      'After both parties agree to work together, they manage deliverables, agreements, and payments on their own preferred tools.',
    icon: Handshake,
  },
];

const clientHighlights: RoleHighlight[] = [
  {
    title: 'Detailed project briefs',
    description:
      'Walk talent through your needs with milestones, files, and expectations that reduce back-and-forth.',
    icon: Target,
  },
  {
    title: 'Centralized applicant tracking',
    description:
      'Shortlist candidates, compare experience, and move applicants through interview stages without losing context.',
    icon: Layers,
  },
  {
    title: 'Collaboration-ready interfaces',
    description:
      'Share documentation, schedule conversations, and keep your team aligned from first message to signed agreement.',
    icon: Users,
  },
];

const freelancerHighlights: RoleHighlight[] = [
  {
    title: 'Curated project feed',
    description:
      'Browse opportunities from vetted clients and filter by rate, industry, and engagement type so you stay focused on ideal work.',
    icon: Briefcase,
  },
  {
    title: 'Proposal toolkit',
    description:
      'Use profile templates, saved proposals, and token-based applications to pitch efficiently without sacrificing quality.',
    icon: ArrowRightCircle,
  },
  {
    title: 'Growth insights',
    description:
      'Track profile views, saved jobs, and win rates to understand how clients respond to your positioning.',
    icon: LineChart,
  },
];

const clientJourney: JourneyStep[] = [
  {
    title: 'Post a clear brief',
    description:
      'Share goals, deliverables, and collaboration preferences so candidates understand what a successful engagement looks like.',
    icon: ClipboardCheck,
  },
  {
    title: 'Review structured proposals',
    description:
      'Compare experience, evaluate past work, and message top fits without leaving your dashboard.',
    icon: MessageCircle,
  },
  {
    title: 'Select and coordinate',
    description:
      'Choose the freelancer you want to partner with, align on scope, and move the relationship to your preferred tools.',
    icon: Handshake,
  },
];

const freelancerJourney: JourneyStep[] = [
  {
    title: 'Create a compelling profile',
    description:
      'Showcase your skills, portfolio pieces, and availability so clients can quickly gauge fit.',
    icon: Star,
  },
  {
    title: 'Discover opportunities',
    description:
      'Filter the job feed, save roles, and decide where to invest application tokens for the best match.',
    icon: Search,
  },
  {
    title: 'Collaborate with confidence',
    description:
      'Discuss project details, align on timelines, and transition to the client’s workflow once you both agree to move forward.',
    icon: Handshake,
  },
];

const HowItWorksPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pt-8 sm:pb-16">
        <div className="container relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-primary sm:text-sm">
            Verified network. Direct partnerships.
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:mt-8 sm:text-5xl">
            Connecting businesses and freelancers, simply, directly, and transparently.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-xl">
            JobHorizons surfaces qualified talent for meaningful projects. Clients post opportunities,
            freelancers pitch their expertise, and both parties collaborate off-platform once they agree to work
            together.
          </p>
        </div>
      </section>

      {/* Workflow Overview */}
      <section className="container mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="glass-card rounded-3xl border border-glass-border/60 bg-background/60 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="mx-auto max-w-3xl text-center px-2 sm:px-0">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              The JobHorizons Journey
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-lg">
              Every interaction on JobHorizons is designed to give clients clarity and freelancers confidence.
              Here is how projects move from idea to collaboration.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:gap-8 md:grid-cols-2 md:[perspective:1400px]">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="group relative overflow-hidden rounded-2xl border border-glass-border/70 bg-background/80 p-6 transition-all duration-500 md:hover:-translate-y-3 md:hover:rotate-[0.6deg] md:hover:shadow-2xl"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-1 to-primary/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/30 transition-transform duration-500 md:group-hover:scale-110 md:group-hover:shadow-[0_0_32px_rgba(59,130,246,0.4)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground/80">Step {index + 1}</div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Clients */}
      <section className="bg-gradient-to-b from-background/70 to-background pt-8 pb-12 sm:pt-10 sm:pb-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-chart-1/15 px-4 py-2 text-sm font-medium text-chart-1">
              For Clients
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground sm:text-4xl">
              Build high-trust hiring pipelines
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Publish roles, evaluate proposals, and coordinate hiring with tools that help you move faster from job
              posting to signed agreement.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:gap-8 md:grid-cols-3">
            {clientHighlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <div
                  key={highlight.title}
                  className="glass-card flex h-full flex-col rounded-2xl border border-glass-border/80 bg-background/85 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-chart-1/15 text-chart-1">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{highlight.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{highlight.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mt-14 rounded-3xl border border-glass-border/80 bg-background/80 p-6 shadow-xl sm:mt-16 sm:p-10">
            <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
              How clients move from idea to hire
            </h3>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Follow a transparent path from the first project brief to a confirmed partnership with the freelancer you choose.
            </p>
            <div
              className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              style={{ perspective: '1400px' }}
            >
              {clientJourney.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="group relative flex gap-4 overflow-hidden rounded-2xl border border-glass-border/70 bg-background/90 p-6 transition-all duration-500 hover:-translate-y-3 hover:rotate-[0.8deg] hover:border-primary/50 hover:shadow-2xl"
                  >
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-1/10" />
                      <div className="absolute inset-[-1px] rounded-2xl border border-primary/20 blur-[2px]" />
                    </div>
                    <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner shadow-primary/40 transition-transform duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.45)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {index + 1}
                        </span>
                        Stage {index + 1}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Freelancers */}
      <section className="pt-8 pb-12 sm:pt-10 sm:pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              For Freelancers
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground sm:text-4xl">
              Win work that matches your strengths
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Showcase your expertise, apply strategically with tokens, and stay visible to clients who value your
              skills.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {freelancerHighlights.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <div
                  key={highlight.title}
                  className="glass-card flex h-full flex-col rounded-2xl border border-glass-border/80 bg-background/85 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{highlight.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{highlight.description}</p>
                </div>
              );
            })}
          </div>
          </div>
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mt-16 rounded-3xl border border-glass-border/80 bg-background/80 p-10 shadow-xl">
              <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                How freelancers move from discovery to delivery
              </h3>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Understand each moment in the journey, from creating a standout profile to agreeing on the details of a new engagement.
              </p>
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:[perspective:1400px]">
                {freelancerJourney.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="group relative flex gap-4 overflow-hidden rounded-2xl border border-glass-border/70 bg-background/90 p-6 transition-all duration-500 md:hover:-translate-y-3 md:hover:-rotate-[0.6deg] md:hover:border-primary/50 md:hover:shadow-2xl"
                    >
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 md:group-hover:opacity-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-chart-2/10 via-transparent to-primary/10" />
                        <div className="absolute inset-[-1px] rounded-2xl border border-chart-2/20 blur-[2px]" />
                      </div>
                      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-chart-2/15 text-chart-2 shadow-inner shadow-chart-2/40 transition-transform duration-500 md:group-hover:scale-110 md:group-hover:shadow-[0_0_30px_rgba(16,185,129,0.45)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-chart-2/15 text-chart-2">
                          {index + 1}
                        </span>
                        Stage {index + 1}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-foreground">{step.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Transparency & Support */}
      <section className="bg-gradient-to-b from-background/75 to-background pt-8 pb-12 sm:pt-10 sm:pb-16">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-primary/15 bg-background/90 p-6 shadow-xl backdrop-blur transition-all duration-500 md:hover:-translate-y-4 md:hover:scale-[1.01] md:hover:shadow-[0_35px_120px_rgba(59,130,246,0.25)] sm:p-10">
              <div className="absolute inset-0 opacity-75 transition-opacity duration-500 group-hover:opacity-95">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-chart-1/12" />
                <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute -right-10 bottom-10 hidden h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl sm:block" />
              </div>
              <div className="relative flex h-full flex-col space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  Platform role
                </div>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-[0_0_35px_rgba(59,130,246,0.35)] transition-transform duration-500 group-hover:translate-y-[-6px] group-hover:shadow-[0_0_45px_rgba(59,130,246,0.45)]">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Transparency First</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  JobHorizons connects vetted clients and freelancers. Payments, agreements, and day-to-day collaboration
                  always stay in your control, using the tools and processes you already trust.
                </p>
                <dl className="space-y-4 text-sm leading-relaxed text-muted-foreground/90">
                  <div className="flex gap-3">
                    <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary/60" />
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Direct payouts only</dt>
                      <dd>Clients and freelancers manage invoicing and deposits independently outside JobHorizons.</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-chart-1/60" />
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Private working agreements</dt>
                      <dd>Define scope, milestones, and NDAs within your existing contract stack without platform intervention.</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-chart-2/60" />
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Compliance ready</dt>
                      <dd>Capture an audit trail of job briefs and conversations to stay aligned with procurement or legal requirements.</dd>
                    </div>
                  </div>
                </dl>
                <div className="grid gap-4 text-sm text-muted-foreground/90 sm:grid-cols-2">
                  <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-background/70 p-4 transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-[0_20px_60px_rgba(59,130,246,0.25)]">
                    <div className="absolute -top-8 -right-6 h-20 w-20 rounded-full bg-primary/15 blur-2xl" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Data stays yours</p>
                    <p className="mt-2 text-sm leading-relaxed">
                      Files, invoices, and agreements remain in your storage and contract tools. JobHorizons only references items you share.
                    </p>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl border border-chart-1/10 bg-background/70 p-4 transition-all duration-500 group-hover:border-chart-1/30 group-hover:shadow-[0_20px_60px_rgba(56,189,248,0.2)]">
                    <div className="absolute -bottom-10 -left-6 h-20 w-20 rounded-full bg-chart-1/15 blur-2xl" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-chart-1">Controlled visibility</p>
                    <p className="mt-2 text-sm leading-relaxed">
                      Only verified teammates you invite gain access to project spaces, so sensitive information stays private.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-chart-1/15 bg-background/90 p-6 shadow-xl backdrop-blur transition-all duration-500 md:hover:-translate-y-4 md:hover:scale-[1.01] md:hover:shadow-[0_35px_120px_rgba(56,189,248,0.25)] sm:p-10">
              <div className="absolute inset-0 opacity-80 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-chart-1/12 via-transparent to-primary/12" />
                <div className="absolute right-0 top-0 hidden h-36 w-36 translate-x-20 rotate-6 rounded-full bg-chart-1/20 blur-3xl sm:block" />
              </div>
              <div className="relative flex h-full flex-col">
                <div className="inline-flex items-center gap-2 rounded-full bg-chart-1/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-chart-1">
                  Trust programs
                </div>
                <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-chart-1/20 text-chart-1 shadow-[0_0_35px_rgba(56,189,248,0.35)]">
                    <Star className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground">Support & Safeguards</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Our platform combines human review and automated monitoring to keep every project high trust,
                  from onboarding to delivery.
                </p>
                <ul className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground/90">
                  <li className="flex gap-3 rounded-2xl bg-background/70 p-4 ring-1 ring-transparent transition-colors duration-300 group-hover:ring-chart-1/20">
                    <ShieldCheck className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Verified access</p>
                      <p>Identity and business validation ensures only legitimate clients and freelancers publish jobs or proposals.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-background/70 p-4 ring-1 ring-transparent transition-colors duration-300 group-hover:ring-chart-1/20">
                    <Layers className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Quality reviews</p>
                      <p>Manual profile spot-checks and project audits keep portfolios, briefs, and milestones aligned with platform standards.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-background/70 p-4 ring-1 ring-transparent transition-colors duration-300 group-hover:ring-chart-1/20">
                    <MessageCircle className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Specialist support</p>
                      <p>Priority advisors guide proposal strategy, hiring workflows, and collaboration best practices when you need a second set of eyes.</p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-2xl bg-background/70 p-4 ring-1 ring-transparent transition-colors duration-300 group-hover:ring-chart-1/20">
                    <LineChart className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Proactive monitoring</p>
                      <p>Health dashboards track replies, hire rates, and sentiment so emerging risks are flagged before they impact delivery.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-12 pt-8 sm:pb-16 sm:pt-10">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="glass-card rounded-3xl border border-glass-border/70 bg-gradient-to-r from-primary/25 via-background to-chart-1/25 p-12 text-center shadow-2xl">
            <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
              Ready to grow with JobHorizons?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Join a trusted marketplace built for meaningful partnerships. Create your profile or post your first
              job to start connecting.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Create Your Account
              </Link>
              <Link
                href="/jobs/create"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-glass-border/80 bg-background/80 px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:text-primary"
              >
                Post Your First Job
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
