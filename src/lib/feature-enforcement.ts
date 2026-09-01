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

export async function getUserFeaturePermissions(userId: string): Promise<FeaturePermissions> {
  // Globally unlocked - All users have full Elite/Pro access across all tools
  return {
    // Freelancer features
    canApplyToJobs: true,
    maxApplicationsPerWeek: 9999,
    hasApplicationTokens: true,
    messagingLevel: 'vip',
    searchPlacementLevel: 'top',
    analyticsLevel: 'advanced',
    supportLevel: 'priority-email',
    hasPriorityPlacement: true,
    hasFeaturedBadge: true,
    maxPortfolioItems: 9999,
    hasPriorityMessaging: true,
    hasAdvancedAnalytics: true,
    hasMarketInsights: true,
    hasDedicatedFreelancerManager: true,

    // Client features
    canPostJobs: true,
    maxJobPostsPerMonth: null,
    clientSupportLevel: 'priority-email',
    clientPlacementLevel: 'featured',
    clientAnalyticsLevel: 'advanced',
    hasPriorityJobPlacement: true,
    hasFeaturedJobListings: true,
    hasAdvancedFreelancerSearch: true,
    hasTeamCollaboration: true,
    hasEnhancedProjectManagement: true,
    hasDedicatedAccountManager: true,
    hasAdvancedClientAnalytics: true,
    hasEarlyFeatureAccess: true,
    hasPrioritySupport: true,
  };
}

export async function getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  const now = new Date();
  const nextTokenReset = new Date(now);
  nextTokenReset.setDate(nextTokenReset.getDate() + 7);

  return {
    tokensRemaining: 9999,
    jobPostsUsedThisMonth: 0,
    jobPostsRemainingThisMonth: null, // Unlimited
    tokenResetDate: nextTokenReset,
    jobPostResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export async function canUserPerformAction(userId: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
  // All actions are allowed globally
  return { allowed: true };
}

export async function getPlanFeatureSummary(userId: string): Promise<PlanFeatureSummary> {
  const permissions = await getUserFeaturePermissions(userId);

  try {
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from('User')
      .select('subscriptionPlan, role')
      .eq('id', userId)
      .maybeSingle();

    if (user) {
      return {
        plan: (user.subscriptionPlan as SubscriptionPlan) || SubscriptionPlan.FREELANCER_PRO,
        role: (user.role as Role) || 'FREELANCER',
        permissions,
      };
    }
  } catch (e) {}

  return {
    plan: SubscriptionPlan.FREELANCER_PRO,
    role: 'FREELANCER',
    permissions,
  };
}

export async function consumeApplicationToken(
  userId: string,
  amount = 1
): Promise<{ success: boolean; tokensRemaining: number }> {
  return { success: true, tokensRemaining: 9999 };
}

export async function incrementJobPostCount(
  userId: string
): Promise<{ success: boolean; jobPostsUsed: number }> {
  return { success: true, jobPostsUsed: 0 };
}
