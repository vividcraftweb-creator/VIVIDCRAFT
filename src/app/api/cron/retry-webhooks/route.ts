import { NextRequest, NextResponse } from 'next/server';
import { retryFailedWebhooks } from '@/lib/webhooks/delivery';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Retry Cron Job
 *
 * This endpoint should be called every 5 minutes to retry failed webhook deliveries.
 * The retry logic uses exponential backoff:
 * - 1st retry: 1 minute after failure
 * - 2nd retry: 5 minutes after first retry
 * - 3rd retry: 30 minutes after second retry
 * - 4th retry: 2 hours after third retry
 * - 5th retry: 12 hours after fourth retry
 * - After 5 attempts, webhook is marked as permanently failed
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Should be called by a cron service (cron-job.org, GitHub Actions, or external service)
 *
 * Setup (using external cron service like cron-job.org):
 *    Schedule: Every 5 minutes (cron: star-slash-5 star star star star)
 *    URL: $APP_URL/api/cron/retry-webhooks
 *    Header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
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
    }

    const startTime = Date.now();

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      message: 'Webhook retry job completed successfully',
    };

  } catch (error) {
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
