'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Shield, Users, Briefcase, Crown, Zap, MessageSquare, BarChart3, FileText, Calendar, Lock, CreditCard, HelpCircle, ArrowRight, Settings } from 'lucide-react';
import {
  SUBSCRIPTION_PLANS,
  isClientPlan,
  isFreelancerPlan,
} from '@/lib/subscription-plans';
import { SubscriptionPlan } from '@/types/database.types';

const POPULAR_FREELANCER_PLAN = SubscriptionPlan.FREELANCER_PRO;
const POPULAR_CLIENT_PLAN = SubscriptionPlan.CLIENT_BUSINESS;

const formatPrice = (amount: number, currency: string) => {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount);
};

const planOrder: SubscriptionPlan[] = [
  SubscriptionPlan.FREELANCER_FREE,
  SubscriptionPlan.FREELANCER_PRO,
  SubscriptionPlan.FREELANCER_ELITE,
  SubscriptionPlan.CLIENT_STARTER,
  SubscriptionPlan.CLIENT_BUSINESS,
  SubscriptionPlan.CLIENT_ENTERPRISE,
];

const PlanCard = ({
  plan,
  accent,
  isPopular,
}: {
  plan: (typeof SUBSCRIPTION_PLANS)[number];
  accent: 'freelancer' | 'client';
  isPopular: boolean;
}) => {
  const isFree = plan.priceAmount === 0;
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
          {isFree ? '' : `per ${plan.interval}`}
        </span>
      </div>

      {(plan.tokensPerWeek || plan.maxJobPosts !== undefined) && (
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-foreground">
          {plan.tokensPerWeek ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {plan.tokensPerWeek} tokens every week
            </span>
          ) : null}
          {plan.maxJobPosts !== undefined && plan.maxJobPosts !== null ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Up to {plan.maxJobPosts} active job post
              {plan.maxJobPosts === 1 ? '' : 's'}
            </span>
          ) : null}
          {plan.maxJobPosts === null && accent === 'client' ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Unlimited job posts
            </span>
          ) : null}
        </div>
      )}

      <ul className="mt-8 space-y-3 text-sm text-muted-foreground flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-3.5 w-3.5 text-primary" />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function PricingPage() {
  const freelancerPlans = SUBSCRIPTION_PLANS.filter((plan) =>
    isFreelancerPlan(plan.plan)
  ).sort(
    (a, b) =>
      planOrder.indexOf(a.plan) - planOrder.indexOf(b.plan)
  );

  const clientPlans = SUBSCRIPTION_PLANS.filter((plan) =>
    isClientPlan(plan.plan)
  ).sort(
    (a, b) =>
      planOrder.indexOf(a.plan) - planOrder.indexOf(b.plan)
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
            Transparent plans for every role
          </Badge>

          <h1 className="mt-6 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Choose the subscription that matches your goals
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Review our transparent pricing for freelancers and clients. All plans are managed through your dashboard's subscription tab once you sign up.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <a
              href="#freelancer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              View Freelancer Plans <ArrowRight className="h-4 w-4" />
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="#client"
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              View Client Plans <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="freelancer" className="container mx-auto mt-24 max-w-6xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-200">
            <Users className="h-4 w-4" />
            For Freelancers
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Grow your independent career
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            Stay aligned with the subscription tab inside the freelancer dashboard. Upgrade or downgrade whenever you need to and your reviews, portfolio, and proposal history will remain intact.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
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
              Every plan includes the same security guarantees
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Identity verification, messaging, and project tracking are standard across the marketplace. You can bring your own payment agreements and keep what you earn without additional platform fees.
            </p>
          </div>
        </div>
      </div>

      <section id="client" className="container mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            <Briefcase className="h-4 w-4" />
            For Clients and Teams
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Build elite teams with confidence
          </h2>
          <p className="max-w-3xl text-muted-foreground">
            These subscriptions match the client dashboard exactly. Review them here, then head into the app when you are ready to activate a plan for your organisation.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
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

      <section className="container mx-auto mt-24 max-w-5xl px-6">
        <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-10">
          <h3 className="text-2xl font-semibold text-white text-center">
            Every subscription unlocks these marketplace essentials
          </h3>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <Crown className="mx-auto mb-4 h-10 w-10 text-yellow-400" />
              <h4 className="text-lg font-semibold text-white">Verified network</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Freelancers and clients complete ID checks, so you always collaborate with real professionals.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h4 className="text-lg font-semibold text-white">AI guidance</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Smart recommendations surface the right matches and next steps without extra busywork.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
              <Shield className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
              <h4 className="text-lg font-semibold text-white">Connect, not process</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Track project milestones and organize contracts within JobHorizons. All payments between freelancers and clients are handled externally using your preferred payment method.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Token System Explanation */}
      <section className="container mx-auto mt-24 max-w-5xl px-6">
        <div className="text-center mb-12">
          <Badge className="mx-auto flex w-fit items-center gap-2 bg-blue-500/10 text-sm text-blue-200 border-blue-500/30">
            <Zap className="h-4 w-4" />
            Understanding the Token Bidding System
          </Badge>
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            How Token Bidding Works
          </h2>
          <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
            Tokens are your weekly bidding budget. When you apply to a job, you bid tokens to rank higher in the client's applicant list.
          </p>
        </div>

        <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Competitive Bidding</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    When submitting a proposal, you choose how many tokens to bid. Higher bids place you higher on the client's list of applicants, increasing your visibility.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Weekly Refresh</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your token balance automatically resets every Sunday at midnight UTC. Unused tokens don't roll over to the next week.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Bid Strategically</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Allocate more tokens to jobs that perfectly match your skills and experience. Save tokens for opportunities where you have the strongest competitive advantage.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30">
                  <Check className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">More Tokens, More Opportunities</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upgrade your plan to get more tokens each week, allowing you to bid on more jobs or place higher bids on competitive opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Core Features */}
      <section className="container mx-auto mt-24 max-w-6xl px-6">
        <div className="text-center mb-12">
          <Badge className="mx-auto flex w-fit items-center gap-2 bg-white/5 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            What JobHorizons Provides
          </Badge>
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            Complete Platform Features
          </h2>
          <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
            Everything you need to find work, hire talent, and manage projects successfully.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <FileText className="h-10 w-10 text-primary mb-4" />
            <h4 className="text-lg font-semibold text-white">Proposal & Application System</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit detailed proposals with cover letters, portfolio samples, and rate quotes. Track all your applications in one dashboard.
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
              Organize project milestones, deadlines, and deliverables within the platform. All payments are handled externally between you and your client using your preferred method.
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
                <p className="text-white font-medium">Create your free account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign up as a freelancer or client. Both start with a free tier.
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
                  Compare plans, upgrade, downgrade, or cancel anytime from the subscription management page.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-8 py-4 text-lg font-semibold text-white transition-all"
            >
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto mt-24 max-w-4xl px-6">
        <div className="text-center mb-12">
          <Badge className="mx-auto flex w-fit items-center gap-2 bg-white/5 text-sm text-primary">
            <HelpCircle className="h-4 w-4" />
            Common Questions
          </Badge>
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              Can I switch plans anytime?
            </h4>
            <p className="text-sm text-muted-foreground">
              Yes. Upgrades take effect immediately and you'll be charged the prorated difference. Downgrades take effect at the start of your next billing cycle, so you can use your current plan features until then.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              What happens to my data if I downgrade or cancel?
            </h4>
            <p className="text-sm text-muted-foreground">
              Your profile, portfolio, reviews, and message history remain intact. If you downgrade, features like advanced analytics or extra tokens become unavailable, but your account data is preserved. You can reactivate anytime.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              Does JobHorizons handle payments between freelancers and clients?
            </h4>
            <p className="text-sm text-muted-foreground">
              No. JobHorizons is a connection platform only. We don't process, hold, or release any project payments between freelancers and clients. All payments are handled externally using your preferred method (bank transfer, PayPal, cryptocurrency, etc.). Our revenue comes solely from subscription plans. JobHorizons provides milestone tracking and contract templates for organization, but you handle all payments directly.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              How does the token bidding system work?
            </h4>
            <p className="text-sm text-muted-foreground">
              When applying to a job, you decide how many tokens to bid. Higher token bids place your proposal higher on the client's applicant list. Tokens reset every Sunday at midnight UTC and unused tokens don't carry over. If you upgrade mid-week, your new token balance takes effect immediately. If you downgrade, you'll keep your current balance until the next Sunday reset.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              What payment methods do you accept for subscriptions?
            </h4>
            <p className="text-sm text-muted-foreground">
              We accept all major credit cards (Visa, Mastercard, American Express) and debit cards. Subscriptions are billed monthly on the same date you signed up.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              What's included in "priority placement" for clients?
            </h4>
            <p className="text-sm text-muted-foreground">
              Business plan jobs appear higher in search results, above Starter plan jobs. Enterprise plan jobs get featured badges and top placement. This increases visibility to qualified freelancers browsing opportunities.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              Can multiple team members access our client account?
            </h4>
            <p className="text-sm text-muted-foreground">
              Business plans include up to 2 team members with shared access to job posts, applicants, and messages. Enterprise plans offer unlimited team members with role-based permissions and activity audit logs.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              What's the difference between API access on Business vs Enterprise?
            </h4>
            <p className="text-sm text-muted-foreground">
              Business plans get API access with 100 requests per hour, suitable for basic integrations. Enterprise plans include 1,000 requests per hour with advanced webhook retry logic, custom reporting endpoints, and priority support for API issues.
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="text-lg font-semibold text-white mb-3">
              Do I need to verify my identity to use the platform?
            </h4>
            <p className="text-sm text-muted-foreground">
              Yes. All users (freelancers and clients) must complete identity verification to send messages, submit proposals, or post jobs. This ensures a trusted marketplace. Verification typically takes 24-48 hours and requires a government-issued ID.
            </p>
          </div>
        </div>
      </section>

      {/* Billing & Policies */}
      <section className="container mx-auto mt-24 mb-24 max-w-5xl px-6">
        <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-10">
          <div className="text-center mb-8">
            <CreditCard className="mx-auto h-10 w-10 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-white">
              Billing & Policies
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">Billing Cycle</h4>
              <p className="text-muted-foreground">
                All paid subscriptions are billed monthly on the anniversary of your sign-up date. You'll receive an email receipt for each payment.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">No Refunds</h4>
              <p className="text-muted-foreground">
                All subscription payments are non-refundable. You can cancel anytime from your dashboard and retain access to paid features until the end of your current billing period.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Plan Changes</h4>
              <p className="text-muted-foreground">
                Upgrades are prorated and take effect immediately. Downgrades take effect at your next billing date so you keep current features until then.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Secure Payments</h4>
              <p className="text-muted-foreground">
                All subscription payments are processed securely through industry-standard payment processors. We never store your full card details.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Tax & Invoices</h4>
              <p className="text-muted-foreground">
                Prices shown exclude applicable taxes. Download invoices anytime from your billing settings for expense tracking and accounting.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-2">Fair Use Policy</h4>
              <p className="text-muted-foreground">
                API limits, token allocations, and job post limits are designed for normal professional use. Abuse or automated bulk actions may be limited.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-muted-foreground">
              Have questions about billing or need help with your subscription?{' '}
              <Link href="/support" className="text-primary hover:text-primary/80 underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
