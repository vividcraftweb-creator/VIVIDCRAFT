import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getSubscriptionPlanInfo } from '@/lib/subscription-plans';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Weekly Token Refresh Cron Job
 *
 * This endpoint should be called weekly (every Monday at 00:00 UTC) to refresh
 * application tokens for all freelancers based on their subscription plan.
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Should be called by a cron service (cron-job.org, GitHub Actions, or external service)
 *
 * Setup (using external cron service like cron-job.org):
 *    Schedule: Every Monday at 00:00 UTC (cron: 0 0 star star 1)
 *    URL: $APP_URL/api/cron/refresh-tokens
 *    Header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const providedSecret = authHeader?.replace('Bearer ', '');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = providedSecret && cronSecret &&
      providedSecret.length === cronSecret.length &&
      timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(cronSecret)
      );

    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get all freelancers
    const { data: freelancers, error: freelancersError } = await supabase
      .from('User')
      .select('id, subscriptionPlan, tokens, email')
      .eq('role', 'FREELANCER');

    if (freelancersError) {
      return NextResponse.json({ error: 'Failed to fetch freelancers' }, { status: 500 });
    }

    const now = new Date();
    let successCount = 0;
    let errorCount = 0;

    // Process each freelancer
    for (const freelancer of freelancers || []) {
      try {
        // Get token allocation based on plan
        const planInfo = getSubscriptionPlanInfo(freelancer.subscriptionPlan);
        const tokensToAdd = planInfo.tokensPerWeek || 150; // Default to 150 if not set

        // Update user tokens and reset timestamp
        await supabase
          .from('User')
          .update({
            tokens: tokensToAdd, // Set to plan amount (not increment - weekly refresh)
            tokenResetAt: now.toISOString(),
          })
          .eq('id', freelancer.id);

        // Log the token refresh
        await supabase
          .from('TokenLog')
          .insert({
            userId: freelancer.id,
            action: 'TOKEN_RESET',
            amount: tokensToAdd,
          });

        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Token refresh completed',
      successCount,
      errorCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
