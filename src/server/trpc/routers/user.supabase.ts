/**
 * User Router - Migrated to Supabase
 * Handles all user account operations using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { checkTokenReset, resetUserTokensIndividual, deductTokens, getUserTokenHistory, TOKEN_COSTS } from '../../../lib/token-management';
import { getPlanFeatureSummary } from '@/lib/feature-enforcement';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/create-notification';

export const userRouter = router({
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    // Use admin client to bypass RLS since we removed all User table policies
    const supabase = createAdminClient();
    const userId = ctx.session.user.id;

    let { data: user } = await (supabase as any)
      .from('users')
      .select('id, email, role, subscriptionPlan, tokens, tokenResetAt, jobPostsUsed, jobPostsResetAt, isVerified, verificationPaidAt, profileCompleted, clientType, verificationPaymentStatus, verificationStartedAt, verificationDeadline, verificationSubmittedAt, createdAt')
      .eq('id', userId)
      .maybeSingle();

    if (!user) {
      const res = await supabase
        .from('User')
        .select('id, email, role, subscriptionPlan, tokens, tokenResetAt, jobPostsUsed, jobPostsResetAt, isVerified, verificationPaidAt, profileCompleted, clientType, verificationPaymentStatus, verificationStartedAt, verificationDeadline, verificationSubmittedAt, createdAt')
        .eq('id', userId)
        .maybeSingle();
      if (res.data) {
        user = res.data;
      }
    }

    if (!user) {
      // Fallback to profiles table or auth
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      const email = authUser?.user?.email || profile?.email || ctx.session.user.email || '';
      const rawRole = profile?.role || authUser?.user?.user_metadata?.role || (authUser?.user as any)?.role || ctx.session.user.role || 'artist';
      const isArtist = ['ARTIST', 'FREELANCER', 'CREATOR', 'SELLER'].includes(String(rawRole).toUpperCase());
      const role: 'FREELANCER' | 'CLIENT' = isArtist ? 'FREELANCER' : 'CLIENT';

      const userCreatePayload = {
        id: userId,
        email,
        role,
        subscriptionPlan: role === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO',
        tokens: role === 'FREELANCER' ? 250 : 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const { data: createdUser } = await (supabase as any)
          .from('users')
          .upsert(userCreatePayload, { onConflict: 'id' })
          .select()
          .single();
        if (createdUser) {
          user = createdUser;
        }
      } catch (e) {}

      if (!user) {
        try {
          const { data: createdUser } = await supabase
            .from('User')
            .upsert(userCreatePayload, { onConflict: 'id' })
            .select()
            .single();

          if (createdUser) {
            user = createdUser;
          }
        } catch (e) {}
      }

      if (!user) {
        user = {
          id: userId,
          email,
          role,
          subscriptionPlan: role === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO',
          tokens: role === 'FREELANCER' ? 250 : 0,
          tokenResetAt: new Date().toISOString(),
          jobPostsUsed: 0,
          jobPostsResetAt: new Date().toISOString(),
          isVerified: false,
          verificationPaidAt: null,
          profileCompleted: true,
          clientType: 'INDIVIDUAL',
          verificationPaymentStatus: 'PAID',
          verificationStartedAt: null,
          verificationDeadline: null,
          verificationSubmittedAt: null,
          createdAt: new Date().toISOString(),
        } as any;
      }
    }

    return user;
  }),

  getPlanFeatures: protectedProcedure.query(async ({ ctx }) => {
    try {
      const summary = await getPlanFeatureSummary(ctx.session.user.id);
      return summary;
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch plan features',
      });
    }
  }),

  updateEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      // Check if email is already taken by another user
      const { data: existingUser } = await supabase
        .from('User')
        .select('id')
        .eq('email', input.email)
        .neq('id', ctx.session.user.id)
        .single();

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email is already in use.',
        });
      }

      const { data, error } = await supabase
        .from('User')
        .update({ email: input.email, updatedAt: new Date().toISOString() })
        .eq('id', ctx.session.user.id)
        .select()
        .single();

      if (error) {
      }

      return data;
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      })
    )
    .mutation(async ({ input }) => {
      // With Supabase Auth, password changes are handled through Supabase API
      const supabase = await createClient();

      const { error } = await supabase.auth.updateUser({
        password: input.newPassword,
      });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      return { success: true };
    }),

  // Token management routes
  getTokenStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return checkTokenReset(userId);
  }),

  resetTokens: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Check if user is eligible for reset (has been a week)
    const status = await checkTokenReset(userId);
    if (!status?.needsReset) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token reset not available yet. Tokens reset weekly.',
      });
    }

    return resetUserTokensIndividual(userId);
  }),

  getTokenHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return getUserTokenHistory(userId, input.limit);
    }),

  spendTokens: protectedProcedure
    .input(
      z.object({
        action: z.enum(['SUBMIT_PROPOSAL', 'PREMIUM_SEARCH', 'FEATURED_PROFILE', 'CONTACT_CLIENT']),
        metadata: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cost = TOKEN_COSTS[input.action];

      try {
        const updatedUser = await deductTokens(userId, cost, input.action);
        return {
          success: true,
          remainingTokens: updatedUser.tokens,
          cost,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to spend tokens';
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: errorMessage,
        });
      }
    }),

  getTokenCosts: protectedProcedure.query(() => {
    return TOKEN_COSTS;
  }),

  // Development only: manually verify user
  devVerifyUser: protectedProcedure.mutation(async ({ ctx }) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Development endpoint not available',
      });
    }

    const userId = ctx.session.user.id;

    // Use admin client to bypass RLS since we removed all User table policies
    const supabase = createAdminClient();

    // Check if user already verified
    const { data: user } = await supabase
      .from('User')
      .select('isVerified')
      .eq('id', userId)
      .single();

    if (user?.isVerified) {
      return { success: true, message: 'User is already verified' };
    }

    // Verify the user
    await supabase
      .from('User')
      .update({
        isVerified: true,
        verificationPaidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', userId);

    // Create notification
    await createNotification(supabase, {
      userId,
      type: 'PAYMENT_RECEIVED',
      message: 'Your account has been verified! You can now apply for jobs and start working.',
      link: '/dashboard',
      read: false,
    });

    return { success: true, message: 'User verified successfully!' };
  }),

  getUserById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      // Use admin client to bypass RLS since we removed all User table policies
      const supabase = createAdminClient();

      const { data: user, error } = await supabase
        .from('User')
        .select(`
          id,
          email,
          role,
          Profile(*)
        `)
        .eq('id', input.userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
      }

      return user;
    }),

  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    // Use admin client to bypass RLS since we removed all User table policies
    const supabase = createAdminClient();

    const { data: user, error } = await supabase
      .from('User')
      .select('notificationPreferences')
      .eq('id', ctx.session.user.id)
      .single();

    if (error) {
    }

    // Return default preferences if none are set
    const defaultPreferences = {
      emailNotifications: true,
      newProposals: true,
      proposalUpdates: true,
      newMessages: true,
      interviewScheduled: true,
      jobStatusChanges: true,
      weeklyTokens: true,
      marketingEmails: false,
    };

    return user?.notificationPreferences || defaultPreferences;
  }),

  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean(),
        newProposals: z.boolean(),
        proposalUpdates: z.boolean(),
        newMessages: z.boolean(),
        interviewScheduled: z.boolean(),
        jobStatusChanges: z.boolean(),
        weeklyTokens: z.boolean(),
        marketingEmails: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use admin client to bypass RLS since we removed all User table policies
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from('User')
        .update({
          notificationPreferences: input,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ctx.session.user.id)
        .select()
        .single();

      if (error) {
      }

      return data;
    }),

  updateClientType: protectedProcedure
    .input(
      z.object({
        clientType: z.enum(['INDIVIDUAL', 'BUSINESS']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use admin client to bypass RLS and avoid recursion issues
      const supabase = createAdminClient();

      // Verify user is a CLIENT
      const { data: user } = await supabase
        .from('User')
        .select('role')
        .eq('id', ctx.session.user.id)
        .single();

      if (user?.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can set a client type',
        });
      }

      const { data, error } = await supabase
        .from('User')
        .update({
          clientType: input.clientType,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', ctx.session.user.id)
        .select()
        .single();

      if (error) {
      }

      return data;
    }),
});
