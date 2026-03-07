/**
 * Feature Enforcement - Migrated to Supabase
 * Manages feature access and subscription limits using Supabase database
 */

import { SubscriptionPlan, Role } from '@/types/database.types';
import { getSubscriptionPlanInfo } from './subscription-plans';
import { createAdminClient } from './supabase/server';
import {
  MessagingLevel,
  SearchPlacementLevel,
  FreelancerAnalyticsLevel,
  SupportLevel,
  ClientPlacementLevel,
  ClientAnalyticsLevel,
} from './subscription-plans';

export interface FeaturePermissions {
  // Freelancer features
  canApplyToJobs: boolean;
  maxApplicationsPerWeek: number;
  hasApplicationTokens: boolean;
  messagingLevel?: MessagingLevel;
  searchPlacementLevel?: SearchPlacementLevel;
  analyticsLevel?: FreelancerAnalyticsLevel;
  supportLevel?: SupportLevel;
  hasPriorityPlacement: boolean;
  hasFeaturedBadge: boolean;
  maxPortfolioItems: number;
  hasPriorityMessaging: boolean;
  hasAdvancedAnalytics: boolean;
  hasMarketInsights: boolean;
  hasDedicatedFreelancerManager: boolean;

  // Client features
  canPostJobs: boolean;
  maxJobPostsPerMonth: number | null; // null = unlimited
  clientSupportLevel?: SupportLevel;
  clientPlacementLevel?: ClientPlacementLevel;
  clientAnalyticsLevel?: ClientAnalyticsLevel;
  hasPriorityJobPlacement: boolean;
  hasFeaturedJobListings: boolean;
  hasAdvancedFreelancerSearch: boolean;
  hasTeamCollaboration: boolean;
  hasEnhancedProjectManagement: boolean;
  hasDedicatedAccountManager: boolean;
  hasAdvancedClientAnalytics: boolean;
  hasEarlyFeatureAccess: boolean;
  hasPrioritySupport: boolean;
}

export interface PlanFeatureSummary {
  plan: SubscriptionPlan;
  role: Role;
  permissions: FeaturePermissions;
}

export interface SubscriptionLimits {
  tokensRemaining: number;
  jobPostsUsedThisMonth: number;
  jobPostsRemainingThisMonth: number | null;
  tokenResetDate?: Date;
  jobPostResetDate?: Date;
}

function getMaxPortfolioItems(plan: SubscriptionPlan): number {
  switch (plan) {
    case 'FREELANCER_ELITE':
      return 20;
    case 'FREELANCER_PRO':
      return 10;
    case 'FREELANCER_FREE':
    default:
      return 5;
  }
}

export async function getUserFeaturePermissions(userId: string): Promise<FeaturePermissions> {
  // Use admin client to bypass RLS since we removed all User table policies
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from('User')
    .select('subscriptionPlan, role, tokens, jobPostsUsed, tokenResetAt, jobPostsResetAt')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  const planInfo = getSubscriptionPlanInfo(user.subscriptionPlan as SubscriptionPlan);
  const isFreelancer = user.role === 'FREELANCER';
  const isClient = user.role === 'CLIENT';
  const freelancerPerks = planInfo.freelancerPerks;
  const clientPerks = planInfo.clientPerks;

  return {
    // Freelancer features
    canApplyToJobs: isFreelancer,
    maxApplicationsPerWeek: planInfo.tokensPerWeek || 0,
    hasApplicationTokens: user.tokens > 0,
    messagingLevel: freelancerPerks?.messaging,
    searchPlacementLevel: freelancerPerks?.searchPlacement,
    analyticsLevel: freelancerPerks?.analytics,
    supportLevel: freelancerPerks?.support,
    hasPriorityPlacement: isFreelancer && !!freelancerPerks && freelancerPerks.searchPlacement !== 'none',
    hasFeaturedBadge: !!(isFreelancer && freelancerPerks?.featuredBadge),
    maxPortfolioItems: getMaxPortfolioItems(user.subscriptionPlan as SubscriptionPlan),
    hasPriorityMessaging: isFreelancer && !!freelancerPerks && freelancerPerks.messaging !== 'standard',
    hasAdvancedAnalytics: isFreelancer && !!freelancerPerks && freelancerPerks.analytics !== 'none',
    hasMarketInsights: !!(isFreelancer && freelancerPerks?.marketInsights),
    hasDedicatedFreelancerManager: !!(isFreelancer && freelancerPerks?.dedicatedAccountManager),

    // Client features
    canPostJobs: isClient,
    maxJobPostsPerMonth: planInfo.maxJobPosts ?? null,
    clientSupportLevel: clientPerks?.support,
    clientPlacementLevel: clientPerks?.priorityPlacement,
    clientAnalyticsLevel: clientPerks?.analytics,
    hasPriorityJobPlacement: isClient && !!clientPerks && clientPerks.priorityPlacement !== 'none',
    hasFeaturedJobListings: !!(isClient && clientPerks?.priorityPlacement === 'featured'),
    hasAdvancedFreelancerSearch: !!(isClient && clientPerks?.advancedSearch),
    hasTeamCollaboration: !!(isClient && clientPerks?.teamCollaboration),
    hasEnhancedProjectManagement: !!(isClient && clientPerks?.projectManagement),
    hasDedicatedAccountManager: !!(isClient && clientPerks?.dedicatedAccountManager),
    hasAdvancedClientAnalytics: !!(isClient && clientPerks?.analytics !== 'none'),
    hasEarlyFeatureAccess: !!clientPerks?.earlyAccess,
    hasPrioritySupport:
      (!!freelancerPerks && freelancerPerks.support !== 'email') ||
      (!!clientPerks && clientPerks.support !== 'email'),
  };
}

export async function getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  // Use admin client to bypass RLS since we removed all User table policies
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from('User')
    .select('subscriptionPlan, role, tokens, jobPostsUsed, tokenResetAt, jobPostsResetAt')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  const planInfo = getSubscriptionPlanInfo(user.subscriptionPlan as SubscriptionPlan);

  // Calculate job posts remaining this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Reset job posts counter if it's a new month
  let jobPostsUsedThisMonth = user.jobPostsUsed;
  const jobPostResetDate = user.jobPostsResetAt ? new Date(user.jobPostsResetAt) : null;

  if (!jobPostResetDate || jobPostResetDate < startOfMonth) {
    jobPostsUsedThisMonth = 0;
  }

  const jobPostsRemainingThisMonth = planInfo.maxJobPosts === null || planInfo.maxJobPosts === undefined
    ? null
    : Math.max(0, planInfo.maxJobPosts - jobPostsUsedThisMonth);

  // Calculate next token reset date (weekly)
  const tokenResetDate = user.tokenResetAt ? new Date(user.tokenResetAt) : new Date();
  const nextTokenReset = new Date(tokenResetDate);
  nextTokenReset.setDate(nextTokenReset.getDate() + 7);

  return {
    tokensRemaining: Math.max(0, user.tokens),
    jobPostsUsedThisMonth,
    jobPostsRemainingThisMonth,
    tokenResetDate: nextTokenReset,
    jobPostResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export async function canUserPerformAction(userId: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
  const [permissions, limits] = await Promise.all([
    getUserFeaturePermissions(userId),
    getUserSubscriptionLimits(userId),
  ]);

  switch (action) {
    case 'apply_to_job':
      if (!permissions.canApplyToJobs) {
        return { allowed: false, reason: 'Only freelancers can apply to jobs' };
      }
      if (!permissions.hasApplicationTokens) {
        return { allowed: false, reason: 'Insufficient application tokens. Tokens reset weekly.' };
      }
      return { allowed: true };

    case 'post_job':
      if (!permissions.canPostJobs) {
        return { allowed: false, reason: 'Only clients can post jobs' };
      }
      if (limits.jobPostsRemainingThisMonth === 0) {
        return { allowed: false, reason: 'Monthly job posting limit reached. Upgrade your plan for more posts.' };
      }
      return { allowed: true };

    case 'feature_job':
      if (!permissions.hasFeaturedJobListings) {
        return { allowed: false, reason: 'Featured job listings require Enterprise plan' };
      }
      return { allowed: true };

    case 'access_analytics':
      if (!permissions.hasAdvancedAnalytics && !permissions.hasAdvancedClientAnalytics) {
        return { allowed: false, reason: 'Advanced analytics require Pro plan or higher' };
      }
      return { allowed: true };

    case 'priority_support':
      if (!permissions.hasPrioritySupport) {
        return { allowed: false, reason: 'Priority support requires a paid plan' };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
}

export async function getPlanFeatureSummary(userId: string): Promise<PlanFeatureSummary> {
  // Use admin client to bypass RLS since we removed all User table policies
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from('User')
    .select('subscriptionPlan, role')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  const permissions = await getUserFeaturePermissions(userId);

  return {
    plan: user.subscriptionPlan as SubscriptionPlan,
    role: user.role as Role,
    permissions,
  };
}

export async function consumeApplicationToken(
  userId: string,
  amount = 1
): Promise<{ success: boolean; tokensRemaining: number }> {
  try {
    // Use admin client to bypass RLS since we removed all User table policies
    const supabase = createAdminClient();

    // First, check if user has tokens
    const { data: currentUser, error: fetchError } = await supabase
      .from('User')
      .select('tokens')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      return { success: false, tokensRemaining: 0 };
    }

    if (amount <= 0) {
      return { success: false, tokensRemaining: currentUser.tokens };
    }

    if (currentUser.tokens < amount) {
      return { success: false, tokensRemaining: currentUser.tokens };
    }

    // Decrement tokens
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        tokens: currentUser.tokens - amount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('tokens')
      .single();

    if (updateError) {
      return { success: false, tokensRemaining: 0 };
    }

    // Log the token usage
    await supabase.from('TokenLog').insert({
      id: crypto.randomUUID(),
      userId,
      action: 'PROPOSAL_SUBMIT',
      amount: -amount,
      createdAt: new Date().toISOString(),
    });

    return { success: true, tokensRemaining: updatedUser?.tokens || 0 };
  } catch (error) {
    return { success: false, tokensRemaining: 0 };
  }
}

export async function incrementJobPostCount(
  userId: string
): Promise<{ success: boolean; jobPostsUsed: number }> {
  try {
    // Use admin client to bypass RLS since we removed all User table policies
    const supabase = createAdminClient();

    // SECURITY: Use server-side time to prevent client manipulation
    const serverTimeNow = Date.now();
    const now = new Date(serverTimeNow);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: user, error: fetchError } = await supabase
      .from('User')
      .select('jobPostsResetAt, jobPostsUsed')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { success: false, jobPostsUsed: 0 };
    }

    // Reset counter if it's a new month
    const jobPostResetDate = user?.jobPostsResetAt ? new Date(user.jobPostsResetAt) : null;
    const shouldReset = !jobPostResetDate || jobPostResetDate < startOfMonth;

    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        jobPostsUsed: shouldReset ? 1 : (user?.jobPostsUsed || 0) + 1,
        jobPostsResetAt: shouldReset ? startOfMonth.toISOString() : user?.jobPostsResetAt,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('jobPostsUsed')
      .single();

    if (updateError) {
      return { success: false, jobPostsUsed: 0 };
    }

    return { success: true, jobPostsUsed: updatedUser?.jobPostsUsed || 0 };
  } catch (error) {
    return { success: false, jobPostsUsed: 0 };
  }
}
