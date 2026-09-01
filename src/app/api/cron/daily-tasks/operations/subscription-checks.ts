import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { SubscriptionPlan, Role } from '@/types/database.types';
import { getSubscriptionPlanInfo } from '@/lib/subscription-plans';

export interface SubscriptionCheckResults {
  remindersSent: number;
  subscriptionsInGracePeriod: number;
  subscriptionsDowngraded: number;
  errors: string[];
}

/**
 * Run subscription checks operation
 *
 * This function handles:
 * - Sending renewal reminders (3 days before expiry)
 * - Setting grace periods for expired subscriptions
 * - Downgrading subscriptions past grace period
 * - Sending email notifications
 */
export async function runSubscriptionChecks(): Promise<SubscriptionCheckResults> {
  const supabase = createAdminClient();
  const now = new Date();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const results: SubscriptionCheckResults = {
    remindersSent: 0,
    subscriptionsInGracePeriod: 0,
    subscriptionsDowngraded: 0,
    errors: [],
  };

  // 1. Send renewal reminders for subscriptions expiring in 3 days
  const { data: subscriptionsExpiringIn3Days, error: expiringError } = await supabase
    .from('Subscription')
    .select(`
      *,
      user:User (
        *,
        profile:Profile (*)
      )
    `)
    .eq('status', 'ACTIVE')
    .eq('cancelAtPeriodEnd', false)
    .gte('currentPeriodEnd', now.toISOString())
    .lte('currentPeriodEnd', threeDaysFromNow.toISOString())
    .is('reminderSentAt', null);

  if (expiringError) {
    results.errors.push('Failed to fetch expiring subscriptions');
  }

  for (const subscription of subscriptionsExpiringIn3Days || []) {
    try {

      const { data: planConfig } = await supabase
        .from('SubscriptionPlanConfig')
        .select('*')
        .eq('plan', subscription.plan)
        .single();

      if (planConfig) {
        await fetch(`${process.env.NEXTAUTH_URL}/api/supabase/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: subscription.user?.email,
            template: 'subscriptionExpiringReminder',
            templateData: {
              planName: planConfig.name,
              expirationDate: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
              firstName: subscription.user?.profile?.firstName || undefined,
            },
          }),
        });

        // Mark reminder as sent
        await supabase
          .from('Subscription')
          .update({ reminderSentAt: now.toISOString() })
          .eq('id', subscription.id);

        results.remindersSent++;
      }
    } catch (error) {
      results.errors.push(`Failed to send reminder for subscription ${subscription.id}`);
    }
  }

  // 2. Set grace period for expired subscriptions (not cancelled)
  const { data: expiredSubscriptions, error: expiredError } = await supabase
    .from('Subscription')
    .select(`
      *,
      user:User (
        *,
        profile:Profile (*)
      )
    `)
    .eq('status', 'ACTIVE')
    .eq('cancelAtPeriodEnd', false)
    .lt('currentPeriodEnd', now.toISOString())
    .is('gracePeriodEnd', null);

  if (expiredError) {
    results.errors.push('Failed to fetch expired subscriptions');
  }

  for (const subscription of expiredSubscriptions || []) {
    try {
      const gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days grace period

      await supabase
        .from('Subscription')
        .update({ gracePeriodEnd: gracePeriodEnd.toISOString() })
        .eq('id', subscription.id);

      results.subscriptionsInGracePeriod++;
    } catch (error) {
      results.errors.push(`Failed to set grace period for subscription ${subscription.id}`);
    }
  }

  // 3. Find subscriptions past grace period or cancelled that expired
  // We need to fetch two groups separately since Supabase doesn't support OR in the same way
  const { data: cancelledExpired } = await supabase
    .from('Subscription')
    .select(`
      *,
      user:User (
        *,
        profile:Profile (*)
      )
    `)
    .eq('status', 'ACTIVE')
    .eq('cancelAtPeriodEnd', true)
    .lt('currentPeriodEnd', now.toISOString());

  const { data: pastGracePeriod } = await supabase
    .from('Subscription')
    .select(`
      *,
      user:User (
        *,
        profile:Profile (*)
      )
    `)
    .eq('status', 'ACTIVE')
    .eq('cancelAtPeriodEnd', false)
    .not('gracePeriodEnd', 'is', null)
    .lt('gracePeriodEnd', now.toISOString());

  const expiredCancelledSubscriptions = [
    ...(cancelledExpired || []),
    ...(pastGracePeriod || [])
  ];

  // Downgrade expired subscriptions
  for (const subscription of expiredCancelledSubscriptions) {
    try {
      const userRole = (subscription.user?.role || 'FREELANCER') as Role;
      const defaultPlan =
        userRole === 'FREELANCER' ? 'FREELANCER_PRO' : 'CLIENT_BUSINESS';
      const defaultPlanInfo = getSubscriptionPlanInfo(defaultPlan as SubscriptionPlan);

      // Update subscription status
      await supabase
        .from('Subscription')
        .update({ status: 'CANCELED' })
        .eq('id', subscription.id);

      // Update user subscription plan
      await supabase
        .from('User')
        .update({
          subscriptionPlan: defaultPlan,
          tokens: userRole === 'FREELANCER' ? defaultPlanInfo.tokensPerWeek ?? 250 : undefined,
          tokenResetAt: new Date().toISOString(),
          jobPostsUsed: userRole === 'CLIENT' ? 0 : undefined,
          jobPostsResetAt: new Date().toISOString(),
        })
        .eq('id', subscription.userId);

      // Send downgrade notification
      const userName = subscription.user?.profile?.firstName || subscription.user?.email;

      await sendEmail({
        to: subscription.user?.email || '',
        subject: 'Your subscription has expired',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Your subscription has expired. Please renew or upgrade your plan to maintain full access.</p>
            <p>You can continue using Vivid Art with limited features, or upgrade anytime to regain access to premium features.</p>
            <a href="${process.env.NEXTAUTH_URL}/dashboard?tab=subscription"
               style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
              View Subscription Plans
            </a>
            <p>Thank you for using Vivid Art!</p>
          </div>
        `,
      });

      results.subscriptionsDowngraded++;
    } catch (error) {
      results.errors.push(`Failed to downgrade subscription ${subscription.id}`);
    }
  }

  return results;
}
