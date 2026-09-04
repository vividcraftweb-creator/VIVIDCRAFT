/**
 * Token Management - Migrated to Supabase
 * Handles token resets, deductions, and history using Supabase database
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createNotificationBatch } from '@/lib/notifications/create-notification';
import { getSubscriptionPlanInfo } from './subscription-plans';

export async function resetUserTokens() {
  try {
    const supabase = createAdminClient();

    // Fetch all freelancers with their subscription plans (only freelancers have tokens)
    const { data: users, error: fetchError } = await supabase
      .from('User')
      .select('id, subscriptionPlan, role')
      .eq('role', 'FREELANCER');

    if (fetchError) {
      throw fetchError;
    }

    if (!users || users.length === 0) {
      return 0;
    }

    const now = new Date().toISOString();
    const tokenLogs = [];

    // Update each user with plan-specific token amount
    for (const user of users) {
      const planInfo = getSubscriptionPlanInfo(user.subscriptionPlan);
      const tokensToSet = planInfo.tokensPerWeek ?? 150; // Default to 150 if not specified

      const { error: updateError } = await supabase
        .from('User')
        .update({
          tokens: tokensToSet,
          tokenResetAt: now,
          updatedAt: now,
        })
        .eq('id', user.id);

      if (updateError) {
        // Continue with other users even if one fails
        continue;
      }

      // Create token log for this user
      tokenLogs.push({
        id: crypto.randomUUID(),
        userId: user.id,
        action: 'WEEKLY_RESET',
        amount: tokensToSet,
        createdAt: now,
      });
    }

    // Batch insert token logs
    if (tokenLogs.length > 0) {
      await supabase.from('TokenLog').insert(tokenLogs);
    }

    return users.length;
  } catch (error) {
    return 0;
  }
}

export async function checkTokenResetStatus(userId: string) {
  try {
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select('tokens, tokenResetAt')
      .eq('id', userId)
      .single();

    if (error || !user) return null;

    // Check if it's been a week since last reset
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const lastResetDate = user.tokenResetAt ? new Date(user.tokenResetAt) : null;
    const needsReset = !lastResetDate || lastResetDate < oneWeekAgo;

    return {
      currentTokens: user.tokens,
      lastResetAt: lastResetDate,
      needsReset,
      nextResetAt: lastResetDate
        ? new Date(lastResetDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null,
    };
  } catch (error) {
    return null;
  }
}

export async function resetUserTokensById(userId: string) {
  try {
    const supabase = createAdminClient();

    // Get user's subscription plan and role first
    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('subscriptionPlan, role')
      .eq('id', userId)
      .single();

    if (fetchError || !existingUser) {
      throw new Error(`User not found: ${userId}`);
    }

    const rawRole = (existingUser.role || '').toString().toLowerCase();
    const isArtist = rawRole === 'artist' || rawRole === 'freelancer' || rawRole === 'creator' || (rawRole !== 'client' && rawRole !== 'buyer');
    if (!isArtist) {
      throw new Error('Only artists have tokens to reset');
    }

    // Get plan-specific token amount
    const planInfo = getSubscriptionPlanInfo(existingUser.subscriptionPlan);
    const tokensToSet = planInfo.tokensPerWeek ?? 150;
    const now = new Date().toISOString();

    const { data: user, error: updateError } = await supabase
      .from('User')
      .update({
        tokens: tokensToSet,
        tokenResetAt: now,
        updatedAt: now,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the token reset with correct amount
    await supabase.from('TokenLog').insert({
      id: crypto.randomUUID(),
      userId,
      action: 'WEEKLY_RESET',
      amount: tokensToSet,
      createdAt: now,
    });

    return user;
  } catch (error) {
    throw error;
  }
}

export async function deductTokens(
  userId: string,
  amount: number,
  action: string
) {
  try {
    const supabase = createAdminClient();

    // Check current token balance
    const { data: user, error: fetchError } = await supabase
      .from('User')
      .select('tokens')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new Error('User not found');
    }

    if (user.tokens < amount) {
      throw new Error('Insufficient tokens');
    }

    // Deduct tokens
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        tokens: user.tokens - amount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the transaction
    await supabase.from('TokenLog').insert({
      id: crypto.randomUUID(),
      userId,
      action,
      amount: -amount, // Negative for deduction
      createdAt: new Date().toISOString(),
    });

    return updatedUser;
  } catch (error) {
    throw error;
  }
}

export async function addTokens(
  userId: string,
  amount: number,
  action: string
) {
  try {
    const supabase = createAdminClient();

    // Get current token balance
    const { data: user, error: fetchError } = await supabase
      .from('User')
      .select('tokens')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new Error('User not found');
    }

    // Add tokens
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({
        tokens: user.tokens + amount,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the transaction
    await supabase.from('TokenLog').insert({
      id: crypto.randomUUID(),
      userId,
      action,
      amount, // Positive for addition
      createdAt: new Date().toISOString(),
    });

    return updatedUser;
  } catch (error) {
    throw error;
  }
}

export async function getTokenHistory(userId: string, limit = 50) {
  try {
    const supabase = createAdminClient();

    const { data: history, error } = await supabase
      .from('TokenLog')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return history || [];
  } catch (error) {
    return [];
  }
}

// Exports for compatibility with existing code
export const checkTokenReset = checkTokenResetStatus;
export const resetUserTokensIndividual = resetUserTokensById;
export const getUserTokenHistory = getTokenHistory;

// Token costs configuration
export const TOKEN_COSTS = {
  SUBMIT_PROPOSAL: 2,
  PRIORITY_LISTING: 5,
  FEATURED_LISTING: 10,
  BOOST_PROPOSAL: 3,
  PREMIUM_SEARCH: 1,
  FEATURED_PROFILE: 5,
  CONTACT_CLIENT: 1,
};

export async function performWeeklyTokenReset() {
  try {
    const resetCount = await resetUserTokens();

    // Create notifications for users about their token reset
    if (resetCount > 0) {
      await notifyUsersOfTokenReset();
    }

    return { success: true, resetCount };
  } catch (error) {
    return { success: false, resetCount: 0 };
  }
}

async function notifyUsersOfTokenReset() {
  try {
    const supabase = createAdminClient();

    // Get all active users
    const { data: users, error: fetchError } = await supabase
      .from('User')
      .select('id');

    if (fetchError || !users) {
      throw fetchError;
    }

    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user.id,
      type: 'PAYMENT_RECEIVED' as const, // Using existing enum
      message: 'Your tokens have been reset to 150 for this week. Use them to submit proposals and access platform features.',
      link: '/dashboard',
      read: false,
    }));

    await createNotificationBatch(supabase, notifications);
  } catch (error) {
    // Notification sending failed silently
  }
}
