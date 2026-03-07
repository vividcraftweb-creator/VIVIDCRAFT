import { SubscriptionPlan } from '@/types/database.types';

export type MessagingLevel = 'standard' | 'priority' | 'vip';
export type SearchPlacementLevel = 'none' | 'priority' | 'top';
export type FreelancerAnalyticsLevel = 'none' | 'basic' | 'advanced';
export type SupportLevel = 'email' | 'priority-email' | 'dedicated';
export type ClientAnalyticsLevel = 'none' | 'standard' | 'advanced';
export type ClientPlacementLevel = 'none' | 'priority' | 'featured';

export interface FreelancerPerks {
  messaging: MessagingLevel;
  searchPlacement: SearchPlacementLevel;
  analytics: FreelancerAnalyticsLevel;
  support: SupportLevel;
  featuredBadge: boolean;
  marketInsights: boolean;
  dedicatedAccountManager: boolean;
}

export interface ClientPerks {
  support: SupportLevel;
  priorityPlacement: ClientPlacementLevel;
  advancedSearch: boolean;
  teamCollaboration: boolean;
  projectManagement: boolean;
  analytics: ClientAnalyticsLevel;
  earlyAccess: boolean;
  dedicatedAccountManager: boolean;
}

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  interval: string;
  features: string[];
  tokensPerWeek?: number;
  maxJobPosts?: number | null;
  freelancerPerks?: FreelancerPerks;
  clientPerks?: ClientPerks;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  // Freelancer Plans
  {
    plan: SubscriptionPlan.FREELANCER_FREE,
    name: 'Free',
    description: 'Perfect for getting started as a freelancer',
    priceAmount: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      '150 application tokens/week',
      'Portfolio showcase (max 5 items)',
      'Standard messaging',
      'Basic dashboard access',
      'Email support',
    ],
    tokensPerWeek: 150,
    freelancerPerks: {
      messaging: 'standard',
      searchPlacement: 'none',
      analytics: 'none',
      support: 'email',
      featuredBadge: false,
      marketInsights: false,
      dedicatedAccountManager: false,
    },
  },
  {
    plan: SubscriptionPlan.FREELANCER_PRO,
    name: 'Pro Plan',
    description: 'Enhanced visibility and more opportunities',
    priceAmount: 9.99,
    currency: 'usd',
    interval: 'month',
    features: [
      '250 application tokens/week',
      'Portfolio showcase (max 20 items)',
      'Priority messaging (higher in employer inbox)',
      'Pro user badge on your public profile',
      'Advanced dashboard with insights',
      'Priority email support',
    ],
    tokensPerWeek: 250,
    freelancerPerks: {
      messaging: 'priority',
      searchPlacement: 'none',
      analytics: 'basic',
      support: 'priority-email',
      featuredBadge: false,
      marketInsights: false,
      dedicatedAccountManager: false,
    },
  },
  {
    plan: SubscriptionPlan.FREELANCER_ELITE,
    name: 'Elite Plan',
    description: 'Maximum visibility and advanced analytics',
    priceAmount: 12.99,
    currency: 'usd',
    interval: 'month',
    features: [
      '500 application tokens/week',
      'Unlimited portfolio items',
      'VIP messaging privileges',
      'Elite user badge on your public profile',
      'Top-tier search placement',
      'Advanced analytics + insights',
      'Market demand trends',
      'Priority email support',
    ],
    tokensPerWeek: 500,
    freelancerPerks: {
      messaging: 'vip',
      searchPlacement: 'top',
      analytics: 'advanced',
      support: 'priority-email',
      featuredBadge: true,
      marketInsights: true,
      dedicatedAccountManager: false,
    },
  },

  // Client Plans
  {
    plan: SubscriptionPlan.CLIENT_STARTER,
    name: 'Starter',
    description: 'Perfect for small hiring needs',
    priceAmount: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'Post up to 1 job per month',
      'Access to verified freelancers',
      'Standard messaging with freelancers',
      'Secure payment protection',
      'Email support',
    ],
    maxJobPosts: 1,
    clientPerks: {
      support: 'email',
      priorityPlacement: 'none',
      advancedSearch: false,
      teamCollaboration: false,
      projectManagement: false,
      analytics: 'none',
      earlyAccess: false,
      dedicatedAccountManager: false,
    },
  },
  {
    plan: SubscriptionPlan.CLIENT_BUSINESS,
    name: 'Business',
    description: 'Advanced tools for growing businesses',
    priceAmount: 12.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited job postings',
      'Priority job placement (jobs appear higher in searches)',
      'API access (100 req/hr)',
      'Webhook integrations',
      'AI freelancer recommendations (top 5)',
      'Team collaboration (up to 2 members)',
      'Enhanced analytics dashboard',
      'Project management tools (milestones, file storage)',
      'Priority email support',
    ],
    maxJobPosts: null,
    clientPerks: {
      support: 'priority-email',
      priorityPlacement: 'priority',
      advancedSearch: true,
      teamCollaboration: true,
      projectManagement: true,
      analytics: 'standard',
      earlyAccess: false,
      dedicatedAccountManager: false,
    },
  },
  {
    plan: SubscriptionPlan.CLIENT_ENTERPRISE,
    name: 'Enterprise',
    description: 'Complete solution for large organizations',
    priceAmount: 18.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Business',
      'Advanced API (1000 req/hr)',
      'Advanced webhooks with retry logic',
      'AI recommendations (top 10 matches)',
      'Unlimited team members',
      'Advanced analytics with custom reports',
      'Priority email support',
      'Audit logs & activity tracking',
      'Early access to new features',
    ],
    maxJobPosts: null,
    clientPerks: {
      support: 'priority-email',
      priorityPlacement: 'featured',
      advancedSearch: true,
      teamCollaboration: true,
      projectManagement: true,
      analytics: 'advanced',
      earlyAccess: true,
      dedicatedAccountManager: false,
    },
  },
];

export function getSubscriptionPlanInfo(plan: SubscriptionPlan): SubscriptionPlanInfo {
  const planInfo = SUBSCRIPTION_PLANS.find((p) => p.plan === plan);
  if (!planInfo) {
    throw new Error(`Unknown subscription plan: ${plan}`);
  }
  return planInfo;
}

export function isFreelancerPlan(plan: SubscriptionPlan): boolean {
  return (
    plan === SubscriptionPlan.FREELANCER_FREE ||
    plan === SubscriptionPlan.FREELANCER_PRO ||
    plan === SubscriptionPlan.FREELANCER_ELITE
  );
}

export function isClientPlan(plan: SubscriptionPlan): boolean {
  return (
    plan === SubscriptionPlan.CLIENT_STARTER ||
    plan === SubscriptionPlan.CLIENT_BUSINESS ||
    plan === SubscriptionPlan.CLIENT_ENTERPRISE
  );
}

export function getDefaultPlanForRole(role: 'FREELANCER' | 'CLIENT'): SubscriptionPlan {
  return role === 'FREELANCER'
    ? SubscriptionPlan.FREELANCER_FREE
    : SubscriptionPlan.CLIENT_STARTER;
}
