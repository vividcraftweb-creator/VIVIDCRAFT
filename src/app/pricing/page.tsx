'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Shield, Users, Briefcase, Crown, Zap, MessageSquare, BarChart3, FileText, Calendar, ArrowRight, Settings } from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  isClientPlan,
  isFreelancerPlan,
} from '@/lib/subscription-plans';
import { SubscriptionPlan } from '@/types/database.types';

const POPULAR_FREELANCER_PLAN = SubscriptionPlan.FREELANCER_PRO;
const POPULAR_CLIENT_PLAN = SubscriptionPlan.CLIENT_BUSINESS;

const formatPrice = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
};

const PlanCard = ({
  plan,
  accent,
  isPopular,
}: {
  plan: (typeof SUBSCRIPTION_PLANS)[number];
  accent: 'freelancer' | 'client';
  isPopular: boolean;
}) => {
  const accentStyles =
    accent === 'freelancer'
      ? 'border-blue-500/20 hover:border-blue-500/40 hover:shadow-blue-500/10'
      : 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10';

  return (
    <div
      className={`glass-card flex h-full flex-col rounded-3xl border bg-white/5 p-8 transition-all duration-300 ${accentStyles}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        {isPopular && (
          <Badge
            className={`${
              accent === 'freelancer'
                ? 'bg-blue-500/15 text-blue-200 border-blue-500/30'
                : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
            }`}
          >
            Most Popular
          </Badge>
        )}
      </div>

      <div className="mt-8 flex items-baseline gap-2 text-white">
        <span className="text-4xl font-bold">
          {formatPrice(plan.priceAmount, plan.currency)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          per {plan.interval}
        </span>
      </div>

      {(plan.tokensPerWeek || plan.maxJobPosts !== undefined) && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-foreground">
          {plan.tokensPerWeek ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {plan.tokensPerWeek} tokens every week
            </span>
          ) : null}
          {plan.maxJobPosts === null && accent === 'client' ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Unlimited job posts
            </span>
          ) : null}
        </div>
      )}

      <div className="my-8 h-px bg-white/10" />

      <div className="space-y-4 text-sm text-muted-foreground">
        <p className="font-medium text-white">Features included:</p>
        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-full p-0.5 ${
                  accent === 'freelancer'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-8">
        <Link
          href="/auth/signup"
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
            accent === 'freelancer'
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
          }`}
        >
          Get Started with {plan.name}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default function PricingPage() {
  const freelancerPlans = SUBSCRIPTION_PLANS.filter((plan) =>
    isFreelancerPlan(plan.plan) && plan.priceAmount > 0
  );

  const clientPlans = SUBSCRIPTION_PLANS.filter((plan) =>
    isClientPlan(plan.plan) && plan.priceAmount > 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background pb-24">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-1/5 top-32 h-72 w-72 rounded-full bg-chart-1/10 blur-[140px]" />
        </div>

        <div className="container mx-auto max-w-5xl px-6 pt-6 sm:pt-8 text-center">
          <Badge className="mx-auto flex w-fit items-center gap-2 bg-white/5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            Premium subscription plans for every role
          </Badge>

          <h1 className="mt-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Choose the subscription that matches your goals
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Review our premium pricing for artists and clients. All plans are managed through your dashboard's subscription tab once you sign up.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <a
              href="#freelancer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              View Artist Plans <ArrowRight className="h-4 w-4" />
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="#client"
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              View Buyer Plans <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Freelancer Plans */}
      <section id="freelancer" className="container mx-auto mt-24 max-w-5xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
            <Users className="h-4 w-4" />
            For Artists
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Grow your independent career
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            Get priority messaging, user badges, increased application tokens, and top-tier placement.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {freelancerPlans.map((plan) => (
            <PlanCard
              key={plan.plan}
              plan={plan}
              accent="freelancer"
              isPopular={plan.plan === POPULAR_FREELANCER_PLAN}
            />
          ))}
        </div>
      </section>

      <div className="container mx-auto my-24 max-w-5xl px-6">
        <div className="glass-card flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center md:flex-row md:gap-8 md:text-left">
          <Shield className="h-12 w-12 text-primary" />
          <div>
            <h3 className="text-xl font-semibold text-white">
              Every plan includes enterprise security & verified matching
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Identity verification, messaging, and project tracking are standard across the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Client Plans */}
      <section id="client" className="container mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <Briefcase className="h-4 w-4" />
            For Buyers & Teams
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Build elite creative teams with confidence
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            Unlimited job postings, priority placement, team collaboration tools, and custom analytics.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {clientPlans.map((plan) => (
            <PlanCard
              key={plan.plan}
              plan={plan}
              accent="client"
              isPopular={plan.plan === POPULAR_CLIENT_PLAN}
            />
          ))}
        </div>
      </section>

      {/* Platform Features Grid */}
      <section className="container mx-auto mt-24 max-w-5xl px-6">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-white sm:text-3xl">
            Included in All Subscription Plans
          </h3>
          <p className="mt-2 text-muted-foreground">
            Everything you need to collaborate, communicate, and deliver exceptional creative work.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <FileText className="h-10 w-10 text-primary mb-4" />
            <h4 className="text-lg font-semibold text-white">Proposal & Application System</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit detailed proposals with cover letters, portfolio samples, and rate quotes. Track all applications in one dashboard.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <MessageSquare className="h-10 w-10 text-emerald-400 mb-4" />
            <h4 className="text-lg font-semibold text-white">Secure Messaging</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Direct messaging between freelancers and clients with file sharing. Pro and Elite members get priority inbox placement.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <Calendar className="h-10 w-10 text-blue-400 mb-4" />
            <h4 className="text-lg font-semibold text-white">Interview Scheduling</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Built-in calendar integration for scheduling video calls and interviews. Automated reminders keep everyone on track.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <Shield className="h-10 w-10 text-yellow-400 mb-4" />
            <h4 className="text-lg font-semibold text-white">Identity Verification</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              All users complete ID verification for trust and safety. Verified badges appear on profiles to build confidence.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <BarChart3 className="h-10 w-10 text-violet-400 mb-4" />
            <h4 className="text-lg font-semibold text-white">Project Management</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Track milestones, deadlines, and deliverables. Business and Enterprise plans include advanced project tools and file storage.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <FileText className="h-10 w-10 text-orange-400 mb-4" />
            <h4 className="text-lg font-semibold text-white">Contract & Milestone Tracking</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Organize project milestones, deadlines, and deliverables within the platform.
            </p>
          </div>
        </div>
      </section>

      {/* How to Subscribe */}
      <section className="container mx-auto mt-24 max-w-4xl px-6">
        <div className="glass-card rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-violet-500/10 p-10 text-center">
          <Settings className="mx-auto h-12 w-12 text-primary mb-4" />
          <h2 className="text-3xl font-bold text-white">
            Ready to Activate Your Plan?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            All subscriptions are managed through your dashboard once you create an account.
          </p>
          <div className="mt-8 space-y-4 text-left max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
                1
              </div>
              <div>
                <p className="text-white font-medium">Create your account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign up as a freelancer or client to select your preferred subscription plan.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
                2
              </div>
              <div>
                <p className="text-white font-medium">Navigate to your dashboard</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Access your personalized dashboard after logging in.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">
                3
              </div>
              <div>
                <p className="text-white font-medium">Open the Subscription tab</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Compare plans, upgrade, or manage billing anytime from the subscription management page.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-8 py-4 text-lg font-semibold text-white transition-all shadow-lg shadow-primary/20"
            >
              Create an Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
