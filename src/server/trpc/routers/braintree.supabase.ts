/**
 * Braintree Router - Subscription management using Braintree PayPal integration
 */

import crypto from 'crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

import { router, protectedProcedure, publicProcedure } from '../trpc';
import {
  generateClientToken,
  createTransaction,
  createSubscription,
  cancelBraintreeSubscription,
  updateBraintreeSubscription,
  getOrCreateCustomer
} from '@/lib/braintree';
import { transitionSubscription } from '@/lib/subscription-service';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getSubscriptionPlanInfo, isFreelancerPlan, isClientPlan } from '@/lib/subscription-plans';
import { emailTemplates } from '@/lib/email-edge';
import {
  SubscriptionPlan as SubscriptionPlanEnum,
  Role,
} from '@/types/database.types';

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

const subscriptionPlanSchema = z.nativeEnum(SubscriptionPlanEnum);

function addThirtyDays(from: Date): Date {
  const end = new Date(from);
  end.setTime(end.getTime() + THIRTY_DAYS_IN_MS);
  return end;
}

function getFreePlanForRole(role: Role): SubscriptionPlanEnum {
  if (role === 'CLIENT') {
    return SubscriptionPlanEnum.CLIENT_BUSINESS;
  }
  // Treat ADMIN as freelancers for subscription benefits
  return SubscriptionPlanEnum.FREELANCER_PRO;
}

export const braintreeRouter = router({
  /**
   * Generate a client token for frontend Braintree initialization
   */
  getClientToken: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;
      // Use admin client for User table queries
      const supabase = createAdminClient();

      const { data: user, error } = await supabase
        .from('User')
        .select('email, profile:Profile(firstName, lastName)')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Generate Braintree client token
      const clientToken = await generateClientToken();

      return {
        clientToken,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate payment token',
      });
    }
  }),

  /**
   * Public list of available plans
   */
  getSubscriptionPlans: publicProcedure.query(async () => {
    const supabase = await createClient();

    const { data: plans, error } = await supabase
      .from('SubscriptionPlanConfig')
      .select('*')
      .eq('isActive', true)
      .gt('priceAmount', 0)
      .order('priceAmount', { ascending: true });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to load subscription plans.',
      });
    }

    return plans ?? [];
  }),

  /**
   * Fetch current plan and active subscription window
   */
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    // Use admin client for User table queries
    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const userId = ctx.session.user.id;

    const { data: user, error: userError } = await adminSupabase
      .from('User')
      .select('subscriptionPlan, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    const { data: planConfig } = await supabase
      .from('SubscriptionPlanConfig')
      .select('*')
      .eq('plan', user.subscriptionPlan)
      .single();

    const { data: activeSubscriptions } = await supabase
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .order('currentPeriodEnd', { ascending: false })
      .limit(1);

    return {
      currentPlan: user.subscriptionPlan,
      planConfig,
      activeSubscription: activeSubscriptions?.[0] ?? null,
      role: user.role,
    };
  }),

  /**
   * Process and verify a Braintree payment
   */
  verifySubscription: protectedProcedure
    .input(
      z.object({
        paymentMethodNonce: z.string().min(1),
        subscriptionPlan: subscriptionPlanSchema,
        billingAddress: z.object({
          firstName: z.string().min(2).max(100),
          lastName: z.string().min(2).max(100),
          streetAddress: z.string().min(5).max(255),
          streetAddress2: z.string().optional(),
          city: z.string().min(2).max(100),
          state: z.string().min(2).max(100), // Support international states/provinces (e.g., "Bukidnon")
          postalCode: z.string().min(3).max(20), // Support international postal codes (e.g., "8709", "SW1A 1AA")
          country: z.string().length(2).default('US'),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminSupabase = createAdminClient();
      const supabase = await createClient();
      const userId = ctx.session.user.id;
      const now = new Date();
      const nowIso = now.toISOString();

      const { data: user, error: userError } = await adminSupabase
        .from('User')
        .select('role, subscriptionPlan, email, profile:Profile(firstName, lastName)')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      if (!user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Missing email on your account. Please update your profile and try again.',
        });
      }

      // Validate plan matches user role (SECURITY: Prevent cross-role subscriptions)
      const isPlanForFreelancer = isFreelancerPlan(input.subscriptionPlan);
      const isPlanForClient = isClientPlan(input.subscriptionPlan);

      if (user.role === 'FREELANCER' && isPlanForClient) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Freelancers cannot subscribe to client plans. Please select a freelancer plan.',
        });
      }

      if (user.role === 'CLIENT' && isPlanForFreelancer) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Clients cannot subscribe to freelancer plans. Please select a client plan.',
        });
      }

      if (user.role === 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin accounts cannot purchase subscriptions.',
        });
      }

      const { data: planConfig, error: planError } = await adminSupabase
        .from('SubscriptionPlanConfig')
        .select('*')
        .eq('plan', input.subscriptionPlan)
        .single();

      if (planError || !planConfig) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selected plan is unavailable.',
        });
      }

      if (planConfig.priceAmount <= 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Paid plan required for upgrade.',
        });
      }

      // Check if plan has a Braintree Plan ID
      if (!planConfig.paypalPlanId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This plan is not configured for Braintree subscriptions. Please contact support.',
        });
      }

      // Ensure customer exists in Braintree
      const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;

      await getOrCreateCustomer(
        userId,
        user.email,
        profile?.firstName ?? undefined,
        profile?.lastName ?? undefined,
      );

      // ========================================================================
      // Use new atomic subscription service to prevent price stacking bug
      // ========================================================================
      const transitionResult = await transitionSubscription({
        userId,
        newPlan: input.subscriptionPlan,
        newBraintreePlanId: planConfig.paypalPlanId,
        paymentMethodNonce: input.paymentMethodNonce,
        billingAddress: {
          firstName: input.billingAddress.firstName,
          lastName: input.billingAddress.lastName,
          streetAddress: input.billingAddress.streetAddress,
          extendedAddress: input.billingAddress.streetAddress2,
          locality: input.billingAddress.city,
          region: input.billingAddress.state,
          postalCode: input.billingAddress.postalCode,
          countryCodeAlpha2: input.billingAddress.country || 'US',
        },
      });

      if (!transitionResult.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: transitionResult.error || 'Subscription transition failed',
        });
      }

      const subscriptionId = transitionResult.subscriptionId;
      const periodEnd = transitionResult.nextBillingDate;

      // Store billing address in database
      const { data: billingAddressRecord, error: billingError } = await adminSupabase
        .from('BillingAddress')
        .insert({
          // Let database auto-generate ID
          userId,
          firstName: input.billingAddress.firstName,
          lastName: input.billingAddress.lastName,
          streetAddress: input.billingAddress.streetAddress,
          streetAddress2: input.billingAddress.streetAddress2 || null,
          city: input.billingAddress.city,
          state: input.billingAddress.state,
          postalCode: input.billingAddress.postalCode,
          country: input.billingAddress.country || 'US',
          isDefault: true,
          // Let database auto-generate timestamps
        })
        .select()
        .single();

      if (billingError || !billingAddressRecord) {
        console.error('Billing address save error:', billingError);
        // Continue without billing address - not critical
      }

      // Record initial payment in database
      const { data: existingPayment } = await adminSupabase
        .from('PayPalPayment')
        .select('id')
        .eq('paypalCaptureId', subscriptionId)
        .limit(1);

      if (!existingPayment || existingPayment.length === 0) {
        await adminSupabase.from('PayPalPayment').insert({
          id: crypto.randomUUID(),
          userId,
          amount: planConfig.priceAmount,
          currency: 'USD',
          status: 'COMPLETED',
          type: 'SUBSCRIPTION',
          paypalOrderId: subscriptionId,
          paypalCaptureId: subscriptionId,
          billingAddressId: billingAddressRecord?.id || null,
          metadata: JSON.stringify({
            plan: input.subscriptionPlan,
            planName: planConfig.name,
            braintreeSubscription: true,
            braintreeSubscriptionId: subscriptionId,
            emailSentAt: new Date().toISOString(), // Track when email was sent
            isInitialPurchase: true, // Flag for first payment
          }),
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // Update user metadata + reset token counts based on plan configuration
      const planInfo = getSubscriptionPlanInfo(input.subscriptionPlan);
      const userUpdates: Partial<{
        subscriptionPlan: SubscriptionPlanEnum;
        updatedAt: string;
        tokens: number;
        tokenResetAt: string;
        jobPostsUsed: number;
        jobPostsResetAt: string;
      }> = {
        subscriptionPlan: input.subscriptionPlan,
        updatedAt: nowIso,
      };

      if (user.role === 'FREELANCER') {
        userUpdates.tokens = planInfo.tokensPerWeek ?? userUpdates.tokens;
        userUpdates.tokenResetAt = nowIso;
      } else if (user.role === 'CLIENT') {
        userUpdates.jobPostsUsed = 0;
        userUpdates.jobPostsResetAt = nowIso;
      }

      await adminSupabase.from('User').update(userUpdates).eq('id', userId);

      // Send confirmation email for subscription purchase
      try {
        await emailTemplates.paymentSuccessEmail(
          user.email,
          planConfig.priceAmount * 100, // Convert dollars to cents
          planConfig.name
        );
      } catch (emailError) {
        // Log but don't fail the transaction - email is not critical
        console.error('Failed to send subscription confirmation email:', emailError);
      }

      return {
        success: true,
        message: `Successfully subscribed to ${planConfig.name}. You will be charged $${planConfig.priceAmount}/month.`,
        currentPeriodEnd: periodEnd.toISOString(),
        plan: input.subscriptionPlan,
        subscriptionId,
        nextBillingDate: periodEnd.toISOString(),
      };
    }),

  /**
   * Mark subscription to end at the current period
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const adminSupabase = createAdminClient();
    const userId = ctx.session.user.id;
    const nowIso = new Date().toISOString();

    const { data: subscriptionRows, error } = await adminSupabase
      .from('Subscription')
      .select('id, currentPeriodEnd, paypalSubscriptionId')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .order('currentPeriodEnd', { ascending: false })
      .limit(1);

    const subscription = subscriptionRows?.[0];

    if (error || !subscription) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No active subscription found.',
      });
    }

    // Cancel the Braintree subscription if it exists
    if (subscription.paypalSubscriptionId) {
      try {
        await cancelBraintreeSubscription(subscription.paypalSubscriptionId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel subscription with payment provider. Please contact support.',
        });
      }
    }

    // Mark subscription as cancelled in our database
    await adminSupabase
      .from('Subscription')
      .update({
        cancelAtPeriodEnd: true,
        updatedAt: nowIso,
      })
      .eq('id', subscription.id);

    return {
      success: true,
      message: `Your subscription will end on ${new Date(
        subscription.currentPeriodEnd
      ).toLocaleDateString()}. You will not be charged again.`,
    };
  }),

  /**
   * Immediate downgrade to free tier
   */
  downgradeToFree: protectedProcedure.mutation(async ({ ctx }) => {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const userId = ctx.session.user.id;
    const nowIso = new Date().toISOString();

    const { data: user, error: userError } = await adminSupabase
      .from('User')
      .select('role, subscriptionPlan')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    const freePlan = getFreePlanForRole(user.role as Role);
    if (user.subscriptionPlan === freePlan) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You are already on the free plan.',
      });
    }

    await adminSupabase
      .from('Subscription')
      .update({
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        updatedAt: nowIso,
      })
      .eq('userId', userId)
      .eq('status', 'ACTIVE');

    const planInfo = getSubscriptionPlanInfo(freePlan);
    const updates: Partial<{
      subscriptionPlan: SubscriptionPlanEnum;
      updatedAt: string;
      tokenResetAt: string;
      jobPostsResetAt: string;
      tokens: number;
      jobPostsUsed: number;
    }> = {
      subscriptionPlan: freePlan,
      updatedAt: nowIso,
      tokenResetAt: nowIso,
      jobPostsResetAt: nowIso,
    };

    if (user.role === 'FREELANCER') {
      updates.tokens = planInfo.tokensPerWeek ?? 150;
    } else if (user.role === 'CLIENT') {
      updates.jobPostsUsed = 0;
    }

    await adminSupabase.from('User').update(updates).eq('id', userId);

    return {
      success: true,
      message: 'Successfully downgraded to the free plan.',
      newPlan: freePlan,
    };
  }),

  /**
   * Lightweight status helper for dashboard banners
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();
    const userId = ctx.session.user.id;

    const { data: subscriptions } = await supabase
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .order('currentPeriodEnd', { ascending: false })
      .limit(1);

    const subscription = subscriptions?.[0];

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        daysUntilExpiry: null,
        isExpiringSoon: false,
      };
    }

    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const msUntilExpiry = endDate.getTime() - now.getTime();
    const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

    return {
      hasActiveSubscription: true,
      currentPeriodEnd: subscription.currentPeriodEnd,
      daysUntilExpiry,
      isExpiringSoon: daysUntilExpiry <= 7,
      canRenew: true,
    };
  }),

  /**
   * Process $1 verification payment to verify client legitimacy
   */
  processVerificationPayment: protectedProcedure
    .input(
      z.object({
        paymentMethodNonce: z.string().min(1),
        // TODO: Add billing address requirement when UI is updated
        // For now, verification payments proceed without billing address
        // This is acceptable for $1 verification charge
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminSupabase = createAdminClient();
      const supabase = await createClient();
      const userId = ctx.session.user.id;
      const now = new Date();
      const nowIso = now.toISOString();

      // Get user data using admin client for User table
      const { data: user, error: userError } = await adminSupabase
        .from('User')
        .select('role, email, verificationPaymentStatus, profile:Profile(firstName, lastName)')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      // Check if user is a client
      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Verification payment is only required for clients.',
        });
      }

      // Check if already paid
      if (user.verificationPaymentStatus === 'PAID') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Verification payment already completed.',
        });
      }

      if (!user.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Missing email on your account. Please update your profile and try again.',
        });
      }

      // Process $1.00 verification payment
      const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;

      await getOrCreateCustomer(
        userId,
        user.email,
        profile?.firstName ?? undefined,
        profile?.lastName ?? undefined,
      );

      let transactionResult;
      try {
        transactionResult = await createTransaction({
          userId,
          paymentMethodNonce: input.paymentMethodNonce,
          amount: 1.00, // $1.00 verification charge
        });
      } catch (error) {
        // Update status to FAILED
        await adminSupabase
          .from('User')
          .update({
            verificationPaymentStatus: 'FAILED',
            updatedAt: nowIso,
          })
          .eq('id', userId);

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment processing failed. Please check your payment method and try again.',
        });
      }

      if (!transactionResult.success || !transactionResult.transaction) {
        await adminSupabase
          .from('User')
          .update({
            verificationPaymentStatus: 'FAILED',
            updatedAt: nowIso,
          })
          .eq('id', userId);

        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Payment was not successful.',
        });
      }

      const transactionId = transactionResult.transactionId;

      // Store payment method token if available
      const paymentMethodToken = transactionResult.transaction.creditCard?.token || null;

      // Update User record with payment success
      const verificationDeadline = new Date(now);
      verificationDeadline.setDate(verificationDeadline.getDate() + 7); // 7 days from now

      await adminSupabase
        .from('User')
        .update({
          verificationPaymentStatus: 'PAID',
          verificationPaymentIntentId: transactionId,
          verificationPaymentMethodId: paymentMethodToken,
          verificationStartedAt: nowIso,
          verificationDeadline: verificationDeadline.toISOString(),
          updatedAt: nowIso,
        })
        .eq('id', userId);

      return {
        success: true,
        message: 'Verification payment successful! You have 7 days to complete your verification.',
        transactionId,
        verificationDeadline: verificationDeadline.toISOString(),
      };
    }),

  /**
   * Get verification payment status
   */
  getVerificationPaymentStatus: protectedProcedure.query(async ({ ctx }) => {
    // Use admin client for User table queries
    const adminSupabase = createAdminClient();
    const userId = ctx.session.user.id;

    const { data: user, error } = await adminSupabase
      .from('User')
      .select('verificationPaymentStatus, verificationStartedAt, verificationDeadline, verificationPaymentIntentId')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found.',
      });
    }

    return {
      status: user.verificationPaymentStatus,
      startedAt: user.verificationStartedAt,
      deadline: user.verificationDeadline,
      transactionId: user.verificationPaymentIntentId,
    };
  }),
});
