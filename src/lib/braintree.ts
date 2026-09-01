import braintree from 'braintree';
import { env } from '../env';
import { SubscriptionPlan } from '@/types/database.types';
import { sendEmail, emailTemplates } from './email';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type BraintreePaymentRow = Database['public']['Tables']['PayPalPayment']['Row'];
type UserRow = Database['public']['Tables']['User']['Row'];

type BraintreePaymentRecord = BraintreePaymentRow & {
  user: UserRow | null;
};

type BraintreeMetadataInput = Partial<{
  planName: string;
}>;

// Initialize Braintree Gateway only if credentials are provided
let gateway: braintree.BraintreeGateway | null = null;

function getGateway(): braintree.BraintreeGateway {
  if (!gateway) {
    if (!env.BRAINTREE_MERCHANT_ID || !env.BRAINTREE_PUBLIC_KEY || !env.BRAINTREE_PRIVATE_KEY) {
      throw new Error('Braintree credentials not configured. Please set BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, and BRAINTREE_PRIVATE_KEY in your environment variables.');
    }

    gateway = new braintree.BraintreeGateway({
      environment: env.BRAINTREE_ENVIRONMENT === 'production'
        ? braintree.Environment.Production
        : braintree.Environment.Sandbox,
      merchantId: env.BRAINTREE_MERCHANT_ID,
      publicKey: env.BRAINTREE_PUBLIC_KEY,
      privateKey: env.BRAINTREE_PRIVATE_KEY,
    });
  }

  return gateway;
}

export type PaymentType = 'SUBSCRIPTION';

export interface CreateBraintreePaymentParams {
  userId: string;
  paymentType: PaymentType;
  amount: number;
  currency?: string;
  metadata?: BraintreeMetadataInput;
}

export interface BraintreeBillingAddress {
  firstName: string;
  lastName: string;
  streetAddress: string;
  extendedAddress?: string;
  locality: string;
  region: string;
  postalCode: string;
  countryCodeAlpha2: string;
}

/**
 * Generate a client token for frontend Braintree initialization
 */
export async function generateClientToken(customerId?: string): Promise<string> {
  try {
    const response = await getGateway().clientToken.generate(
      customerId ? { customerId } : {}
    );
    return response.clientToken;
  } catch (error) {
    throw error;
  }
}

/**
 * Create or get a Braintree customer
 */
export async function getOrCreateCustomer(userId: string, email: string, firstName?: string, lastName?: string) {
  try {
    // Try to find existing customer by ID
    try {
      const customer = await getGateway().customer.find(userId);
      if (customer) {
        console.log('Found existing Braintree customer:', userId);
        return customer;
      }
    } catch (findError: unknown) {
      // Customer doesn't exist, continue to create
      console.log('Customer not found, creating new customer');
    }

    // Create new customer
    const result = await getGateway().customer.create({
      id: userId,
      email,
      firstName,
      lastName,
    });

    if (result.success && result.customer) {
      console.log('Created new Braintree customer:', userId);
      return result.customer;
    }

    // Log the actual error from Braintree
    const errorMessage = result.message || 'Unknown error creating customer';
    console.error('Braintree customer creation failed:', errorMessage);
    throw new Error(`Failed to create Braintree customer: ${errorMessage}`);
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    throw error;
  }
}

/**
 * Process a payment using payment method nonce from frontend
 */
export async function createTransaction({
  userId,
  paymentMethodNonce,
  amount,
}: {
  userId: string;
  paymentMethodNonce: string;
  amount: number;
}) {
  try {
    const result = await getGateway().transaction.sale({
      amount: amount.toFixed(2),
      paymentMethodNonce,
      customerId: userId,
      options: {
        submitForSettlement: true,
      },
      // Custom fields removed - these need to be configured in Braintree dashboard first
      // We'll store this metadata in our own database instead
    });

    if (result.success && result.transaction) {
      return {
        success: true,
        transaction: result.transaction,
        transactionId: result.transaction.id,
      };
    }

    throw new Error(result.message || 'Transaction failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Create a recurring Braintree subscription with billing address
 */
export async function createSubscription({
  userId,
  paymentMethodNonce,
  braintreePlanId,
  billingAddress,
}: {
  userId: string;
  paymentMethodNonce: string;
  braintreePlanId: string;
  billingAddress?: BraintreeBillingAddress;
}) {
  try {
    // First, create a payment method for the customer with billing address
    const paymentMethodResult = await getGateway().paymentMethod.create({
      customerId: userId,
      paymentMethodNonce,
      billingAddress: billingAddress ? {
        firstName: billingAddress.firstName,
        lastName: billingAddress.lastName,
        streetAddress: billingAddress.streetAddress,
        extendedAddress: billingAddress.extendedAddress,
        locality: billingAddress.locality,
        region: billingAddress.region,
        postalCode: billingAddress.postalCode,
        countryCodeAlpha2: billingAddress.countryCodeAlpha2,
      } : undefined,
      options: {
        makeDefault: true,
        verifyCard: true, // Enable AVS verification with billing address
      },
    });

    if (!paymentMethodResult.success) {
      throw new Error(paymentMethodResult.message || 'Failed to create payment method');
    }

    const paymentMethodToken = paymentMethodResult.paymentMethod?.token;
    if (!paymentMethodToken) {
      throw new Error('No payment method token received');
    }

    // Create the subscription
    const result = await getGateway().subscription.create({
      paymentMethodToken,
      planId: braintreePlanId,
    });

    if (result.success && result.subscription) {
      return {
        success: true,
        subscription: result.subscription,
        subscriptionId: result.subscription.id,
        nextBillingDate: result.subscription.nextBillingDate,
        firstBillingDate: result.subscription.firstBillingDate,
      };
    }

    throw new Error(result.message || 'Subscription creation failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Cancel a Braintree subscription
 */
export async function cancelBraintreeSubscription(subscriptionId: string) {
  try {
    const result = await getGateway().subscription.cancel(subscriptionId);

    if ((result as any).success && (result as any).subscription) {
      return {
        success: true,
        subscription: (result as any).subscription,
      };
    }

    const errorMessage = (result as any).message;
    throw new Error(errorMessage || 'Subscription cancellation failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Update a Braintree subscription to a new plan
 */
export async function updateBraintreeSubscription(subscriptionId: string, newPlanId: string) {
  try {
    const result = await getGateway().subscription.update(subscriptionId, {
      planId: newPlanId,
      options: {
        prorateCharges: true, // Prorate when switching plans mid-cycle
      },
    });

    if ((result as any).success && (result as any).subscription) {
      return {
        success: true,
        subscription: (result as any).subscription,
      };
    }

    const errorMessage = (result as any).message;
    throw new Error(errorMessage || 'Subscription update failed');
  } catch (error) {
    throw error;
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(transactionId: string) {
  try {
    const transaction = await getGateway().transaction.find(transactionId);
    return transaction;
  } catch (error) {
    throw error;
  }
}

/**
 * Refund a transaction
 */
export async function refundTransaction(transactionId: string, amount?: number) {
  try {
    const result = await getGateway().transaction.refund(
      transactionId,
      amount ? amount.toFixed(2) : undefined
    );

    if (result.success) {
      return result.transaction;
    }

    throw new Error(result.message || 'Refund failed');
  } catch (error) {
    throw error;
  }
}

export function getProductName(): string {
  return 'Subscription Upgrade';
}

export function getProductDescription(_: PaymentType, metadata?: BraintreeMetadataInput): string {
  return `Upgrade to the ${metadata?.planName || 'selected'} subscription plan`;
}

// Webhook event handlers
type BraintreeSubscriptionWithMetadata = braintree.Subscription & {
  metadata?: Record<string, string>;
};

type WebhookNotificationPayload = braintree.WebhookNotification & {
  subject?: {
    transaction?: braintree.Transaction;
    subscription?: BraintreeSubscriptionWithMetadata;
  };
  kind: braintree.WebhookNotificationKind | string;
};

export async function handleBraintreeWebhook(notification: WebhookNotificationPayload): Promise<void> {
  const kind = notification.kind as string;

  switch (kind) {
    case 'transaction_settled':
    case 'transaction_settlement_confirmed':
      if (notification.subject?.transaction) {
        await handleTransactionSettled(notification.subject.transaction);
      }
      break;

    case 'subscription_charged_successfully':
      if (notification.subject?.subscription) {
        await handleSubscriptionCharged(notification.subject.subscription);
      }
      break;

    case 'subscription_canceled':
    case 'subscription_expired':
      if (notification.subject?.subscription) {
        await handleSubscriptionCanceled(notification.subject.subscription);
      }
      break;

    default:
      // Unhandled webhook type - no action needed
      break;
  }
}

async function handleTransactionSettled(transaction: braintree.Transaction): Promise<void> {
  const supabase = createAdminClient();

  const userId = transaction.customer?.id || transaction.customFields?.user_id;
  if (!userId) {
    return;
  }

  // Find the payment record
  const { data: payment, error: paymentError } = await supabase
    .from('PayPalPayment')
    .select('*, user:User(*)')
    .eq('paypalOrderId', transaction.id)
    .single<BraintreePaymentRecord>();

  if (paymentError || !payment || payment.status === 'COMPLETED') {
    return;
  }

  // Update payment status
  await supabase
    .from('PayPalPayment')
    .update({ status: 'COMPLETED' })
    .eq('id', payment.id);
}

async function handleSubscriptionCharged(subscription: BraintreeSubscriptionWithMetadata): Promise<void> {
  const supabase = createAdminClient();
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.warn('[Webhook] No userId in subscription metadata', { subscriptionId: subscription.id });
    return;
  }

  // Get subscription details and update our database
  const nextBillingDate = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ========================================================================
  // FIX: Query by Braintree subscription ID instead of userId + status
  // This prevents race conditions where multiple subscriptions exist temporarily
  // ========================================================================
  const { data: existingSubscription, error: fetchError } = await supabase
    .from('Subscription')
    .select('id, status')
    .eq('userId', userId)
    .eq('paypalSubscriptionId', subscription.id) // Match by Braintree ID
    .single();

  if (fetchError) {
    console.error('[Webhook] Could not find subscription', {
      userId,
      braintreeSubscriptionId: subscription.id,
      error: fetchError,
    });
    return;
  }

  // Only update if status is ACTIVE (ignore CANCELED subscriptions)
  if (existingSubscription.status !== 'ACTIVE') {
    console.warn('[Webhook] Ignoring charge for non-active subscription', {
      subscriptionId: existingSubscription.id,
      status: existingSubscription.status,
      braintreeSubscriptionId: subscription.id,
    });
    return;
  }

  // Update subscription with new billing date
  await supabase
    .from('Subscription')
    .update({
      currentPeriodEnd: nextBillingDate,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', existingSubscription.id)
    .eq('status', 'ACTIVE'); // Double-check it's still active

  // Check if this is a renewal by looking for existing payment records
  const { data: existingPayments } = await supabase
    .from('PayPalPayment')
    .select('id, createdAt')
    .eq('userId', userId)
    .eq('type', 'SUBSCRIPTION')
    .order('createdAt', { ascending: false })
    .limit(2);

  const isRenewal = existingPayments && existingPayments.length > 1;

  // Only proceed with email if this is a renewal OR if enough time has passed
  // (backup email for failed initial email - 5 minute window)
  const shouldSendEmail = isRenewal ||
    (existingPayments && existingPayments.length > 0 &&
     new Date().getTime() - new Date(existingPayments[0].createdAt).getTime() > 5 * 60 * 1000);

  if (!shouldSendEmail) {
    // Skip webhook email - already sent via verifySubscription
    return;
  }

  // Send confirmation email
  const { data: user } = await supabase
    .from('User')
    .select('email, profile:Profile(firstName)')
    .eq('id', userId)
    .single();

  if (user?.email) {
    const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
    const amount = subscription.price ? Number(subscription.price) : 0;
    const planName = isRenewal ? 'Subscription Renewal' : 'Subscription';

    await emailTemplates.paymentSuccessEmail(
      user.email,
      amount * 100, // Convert dollars to cents for email template
      planName
    );
  }
}

async function handleSubscriptionCanceled(subscription: BraintreeSubscriptionWithMetadata): Promise<void> {
  const supabase = createAdminClient();
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  // Downgrade to free plan
  const { data: user } = await supabase
    .from('User')
    .select('email, role, profile:Profile(firstName)')
    .eq('id', userId)
    .single();

  if (user) {
    const profile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
    const defaultPlan =
      user.role === 'FREELANCER' ? SubscriptionPlan.FREELANCER_PRO : SubscriptionPlan.CLIENT_BUSINESS;

    await supabase
      .from('User')
      .update({ subscriptionPlan: defaultPlan })
      .eq('id', userId);

    // Update subscription record
    await supabase
      .from('Subscription')
      .update({
        status: 'CANCELED',
        cancelAtPeriodEnd: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('userId', userId)
      .eq('status', 'ACTIVE');

    // Send cancellation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Subscription Has Been Cancelled',
        html: `
          <h1>Subscription Cancelled</h1>
          <p>Hi ${profile?.firstName || 'there'},</p>
          <p>Your subscription has been cancelled and you've been moved to the ${defaultPlan.replace('_', ' ')} plan.</p>
          <p>You can reactivate your subscription at any time from your dashboard.</p>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
        `,
        text: `Your subscription has been cancelled and you've been moved to the ${defaultPlan.replace('_', ' ')} plan.`,
      });
    } catch (emailError) {
      // Ignore email errors
    }
  }
}

/**
 * Parse webhook notification
 */
export async function parseWebhookNotification(signature: string, payload: string) {
  try {
    const webhookNotification = getGateway().webhookNotification.parse(signature, payload);
    return webhookNotification;
  } catch (error) {
    throw error;
  }
}

export { getGateway as getBraintreeGateway };
