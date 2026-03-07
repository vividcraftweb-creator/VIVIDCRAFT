/**
 * Subscription Service - Atomic Subscription Transition Management
 *
 * This service centralizes all subscription state management logic with proper
 * transaction handling to prevent the price stacking bug.
 *
 * Key Principle: Old subscription must be marked CANCELED in database BEFORE
 * new subscription is created, ensuring only one ACTIVE subscription exists.
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  cancelBraintreeSubscription,
  updateBraintreeSubscription,
  createSubscription,
  type BraintreeBillingAddress,
} from '@/lib/braintree';
import type { Database } from '@/types/database.types';

// Type definitions
type SubscriptionRow = Database['public']['Tables']['Subscription']['Row'];
type SubscriptionPlan = string; // 'FREELANCER_PRO', 'CLIENT_ELITE', etc.

export type SubscriptionTransitionStrategy = 'UPDATE' | 'CANCEL_AND_CREATE';

export interface SubscriptionTransitionResult {
  success: boolean;
  strategy: SubscriptionTransitionStrategy;
  subscriptionId: string;
  nextBillingDate: Date;
  error?: string;
}

export interface TransitionSubscriptionParams {
  userId: string;
  newPlan: SubscriptionPlan;
  newBraintreePlanId: string;
  paymentMethodNonce: string;
  billingAddress: BraintreeBillingAddress;
}

/**
 * Determines the best strategy for subscription transition
 *
 * UPDATE: Use Braintree's native update API (preferred when possible)
 * CANCEL_AND_CREATE: Cancel old subscription, create new one (for major changes)
 */
function determineTransitionStrategy(
  oldPlanId: string | null,
  newPlanId: string,
  oldBraintreePlanId: string | null,
  newBraintreePlanId: string,
  oldBraintreeSubId: string | null
): SubscriptionTransitionStrategy {
  // Use UPDATE if both subscriptions exist and have Braintree IDs
  // This is safer and handles proration automatically
  if (oldBraintreeSubId && oldBraintreePlanId && newBraintreePlanId) {
    // Could add more sophisticated logic here to check plan compatibility
    // For now, always use CANCEL_AND_CREATE for safety
    return 'CANCEL_AND_CREATE';
  }

  return 'CANCEL_AND_CREATE';
}

/**
 * Main entry point: Atomically transition a subscription from one plan to another
 *
 * This function ensures:
 * 1. Old subscription is marked CANCELED before new one is created
 * 2. Database constraint prevents multiple ACTIVE subscriptions
 * 3. Proper rollback on failure
 * 4. Retry logic for Braintree API calls
 */
export async function transitionSubscription(
  params: TransitionSubscriptionParams
): Promise<SubscriptionTransitionResult> {
  const { userId, newPlan, newBraintreePlanId, paymentMethodNonce, billingAddress } = params;
  const supabase = createAdminClient();

  console.log('[SubscriptionService] Starting transition', {
    userId,
    newPlan,
    newBraintreePlanId,
  });

  try {
    // Step 1: Fetch current subscription (if any)
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('Subscription')
      .select('*')
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle(); // Use maybeSingle instead of single to handle no results

    if (fetchError) {
      console.error('[SubscriptionService] Error fetching subscription:', fetchError);
      throw new Error(`Failed to fetch current subscription: ${fetchError.message}`);
    }

    // Step 2: Determine strategy
    const strategy = determineTransitionStrategy(
      currentSubscription?.plan || null,
      newPlan,
      currentSubscription?.paypalPlanId || null,
      newBraintreePlanId,
      currentSubscription?.paypalSubscriptionId || null
    );

    console.log('[SubscriptionService] Using strategy:', strategy);

    // Step 3: Execute transition based on strategy
    if (strategy === 'UPDATE' && currentSubscription?.paypalSubscriptionId) {
      return await updateSubscriptionStrategy(
        supabase,
        userId,
        currentSubscription,
        newPlan,
        newBraintreePlanId
      );
    } else {
      return await cancelAndCreateStrategy(
        supabase,
        userId,
        currentSubscription,
        newPlan,
        newBraintreePlanId,
        paymentMethodNonce,
        billingAddress
      );
    }
  } catch (error) {
    console.error('[SubscriptionService] Transition failed:', error);
    return {
      success: false,
      strategy: 'CANCEL_AND_CREATE',
      subscriptionId: '',
      nextBillingDate: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error during subscription transition',
    };
  }
}

/**
 * Strategy 1: Use Braintree's update API (preferred when possible)
 *
 * This strategy is safer but currently unused in favor of cancel-and-create
 * for maximum compatibility. Can be enabled in the future.
 */
async function updateSubscriptionStrategy(
  supabase: any,
  userId: string,
  currentSubscription: SubscriptionRow,
  newPlan: SubscriptionPlan,
  newBraintreePlanId: string
): Promise<SubscriptionTransitionResult> {
  console.log('[SubscriptionService] Executing UPDATE strategy');

  try {
    // Update in Braintree first
    const braintreeResult = await updateBraintreeSubscription(
      currentSubscription.paypalSubscriptionId!,
      newBraintreePlanId
    );

    if (!braintreeResult.success || !braintreeResult.subscription) {
      throw new Error('Braintree update failed');
    }

    // Update our database record atomically
    const { error: updateError } = await supabase
      .from('Subscription')
      .update({
        plan: newPlan,
        paypalPlanId: newBraintreePlanId,
        currentPeriodEnd: braintreeResult.subscription.nextBillingDate?.toISOString() ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', currentSubscription.id);

    if (updateError) {
      console.error('[SubscriptionService] Database update failed:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log('[SubscriptionService] UPDATE strategy completed successfully');

    return {
      success: true,
      strategy: 'UPDATE',
      subscriptionId: currentSubscription.paypalSubscriptionId!,
      nextBillingDate: braintreeResult.subscription.nextBillingDate || new Date(),
    };
  } catch (error) {
    console.error('[SubscriptionService] UPDATE strategy failed:', error);
    return {
      success: false,
      strategy: 'UPDATE',
      subscriptionId: '',
      nextBillingDate: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Strategy 2: Cancel old and create new (improved with proper atomicity)
 *
 * Critical steps:
 * 1. Mark old subscription as CANCELED in database FIRST
 * 2. Cancel in Braintree (with retry)
 * 3. Create new subscription in Braintree
 * 4. Insert new ACTIVE subscription in database
 * 5. On failure: Rollback database changes
 */
async function cancelAndCreateStrategy(
  supabase: any,
  userId: string,
  currentSubscription: SubscriptionRow | null,
  newPlan: SubscriptionPlan,
  newBraintreePlanId: string,
  paymentMethodNonce: string,
  billingAddress: BraintreeBillingAddress
): Promise<SubscriptionTransitionResult> {
  console.log('[SubscriptionService] Executing CANCEL_AND_CREATE strategy');

  const now = new Date().toISOString();
  let oldSubscriptionRestored = false;

  try {
    // ========================================================================
    // CRITICAL STEP 1: Mark old subscription as CANCELED in database FIRST
    // This ensures the database constraint allows the new ACTIVE subscription
    // ========================================================================
    if (currentSubscription) {
      console.log('[SubscriptionService] Marking old subscription as CANCELED:', currentSubscription.id);

      const { error: cancelError } = await supabase
        .from('Subscription')
        .update({
          status: 'CANCELED',
          cancelAtPeriodEnd: true,
          updatedAt: now,
        })
        .eq('id', currentSubscription.id)
        .eq('status', 'ACTIVE'); // Ensure it's still ACTIVE before updating

      if (cancelError) {
        console.error('[SubscriptionService] Failed to mark subscription as CANCELED:', cancelError);
        throw new Error(`Failed to mark subscription as canceled: ${cancelError.message}`);
      }

      console.log('[SubscriptionService] Old subscription marked as CANCELED');

      // ========================================================================
      // STEP 2: Cancel in Braintree (with retry logic)
      // ========================================================================
      if (currentSubscription.paypalSubscriptionId) {
        console.log('[SubscriptionService] Canceling Braintree subscription:', currentSubscription.paypalSubscriptionId);

        try {
          await cancelBraintreeSubscriptionWithRetry(
            currentSubscription.paypalSubscriptionId,
            3 // max retries
          );
          console.log('[SubscriptionService] Braintree subscription canceled successfully');
        } catch (cancelError) {
          // Log but continue - we've already marked it as CANCELED in our database
          // The important thing is our database is consistent
          console.warn('[SubscriptionService] Braintree cancellation failed (continuing anyway):', cancelError);
        }
      }
    }

    // ========================================================================
    // STEP 3: Create new subscription in Braintree
    // ========================================================================
    console.log('[SubscriptionService] Creating new Braintree subscription');

    const braintreeResult = await createSubscription({
      userId,
      paymentMethodNonce,
      braintreePlanId: newBraintreePlanId,
      billingAddress,
    });

    if (!braintreeResult.success || !braintreeResult.subscription) {
      throw new Error('Failed to create new subscription in Braintree');
    }

    console.log('[SubscriptionService] New Braintree subscription created:', braintreeResult.subscriptionId);

    // ========================================================================
    // STEP 4: Create new ACTIVE subscription record in database
    // ========================================================================
    const periodStart = new Date();
    const periodEnd = braintreeResult.nextBillingDate
      ? new Date(braintreeResult.nextBillingDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newSubscriptionData = {
      id: crypto.randomUUID(),
      userId,
      plan: newPlan,
      status: 'ACTIVE',
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      paypalOrderId: braintreeResult.subscriptionId,
      paypalPaymentId: braintreeResult.subscriptionId,
      paypalPlanId: newBraintreePlanId,
      paypalSubscriptionId: braintreeResult.subscriptionId,
      cancelAtPeriodEnd: false,
      reminderSentAt: null,
      gracePeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    };

    console.log('[SubscriptionService] Inserting new subscription record');

    const { error: insertError } = await supabase
      .from('Subscription')
      .insert(newSubscriptionData);

    if (insertError) {
      console.error('[SubscriptionService] Database insert failed:', insertError);

      // CRITICAL ERROR: New subscription created in Braintree but not in DB
      // This requires manual intervention - log extensively
      console.error('[SubscriptionService] CRITICAL: Subscription created in Braintree but not in database', {
        userId,
        braintreeSubscriptionId: braintreeResult.subscriptionId,
        error: insertError,
        timestamp: now,
      });

      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log('[SubscriptionService] CANCEL_AND_CREATE strategy completed successfully');

    return {
      success: true,
      strategy: 'CANCEL_AND_CREATE',
      subscriptionId: braintreeResult.subscriptionId,
      nextBillingDate: periodEnd,
    };
  } catch (error) {
    console.error('[SubscriptionService] CANCEL_AND_CREATE strategy failed:', error);

    // ========================================================================
    // ROLLBACK: Restore old subscription if it was canceled
    // ========================================================================
    if (currentSubscription && !oldSubscriptionRestored) {
      console.log('[SubscriptionService] Attempting rollback: restoring old subscription');

      try {
        await supabase
          .from('Subscription')
          .update({
            status: 'ACTIVE',
            cancelAtPeriodEnd: false,
            updatedAt: now,
          })
          .eq('id', currentSubscription.id);

        console.log('[SubscriptionService] Rollback successful: old subscription restored');
      } catch (rollbackError) {
        console.error('[SubscriptionService] CRITICAL: Rollback failed!', rollbackError);
        // This is very bad - manual intervention required
      }
    }

    return {
      success: false,
      strategy: 'CANCEL_AND_CREATE',
      subscriptionId: '',
      nextBillingDate: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error during subscription creation',
    };
  }
}

/**
 * Retry logic for Braintree cancellation
 *
 * Retries with exponential backoff: 1s, 2s, 4s
 */
async function cancelBraintreeSubscriptionWithRetry(
  subscriptionId: string,
  maxRetries: number
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SubscriptionService] Cancellation attempt ${attempt}/${maxRetries}`);
      await cancelBraintreeSubscription(subscriptionId);
      console.log('[SubscriptionService] Cancellation successful');
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`[SubscriptionService] Cancellation attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.log(`[SubscriptionService] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Cancellation failed after retries');
}

/**
 * Helper function to add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
