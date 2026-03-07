import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { loggers } from '@/lib/logger';
import { runSubscriptionChecks } from './operations/subscription-checks';
import { runFraudMonitoring } from './operations/fraud-monitoring';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily Tasks Cron Job (Consolidated)
 *
 * This endpoint consolidates two daily operations:
 * 1. Subscription checks (renewal reminders, grace periods, downgrades)
 * 2. Fraud monitoring (user scanning, auto-suspend/unsuspend)
 *
 * Schedule: Every day at 00:00 UTC (cron: 0 0 * * *)
 *
 * Security:
 * - Protected by CRON_SECRET environment variable
 * - Should be called by Vercel Cron or external cron service
 *
 * Error Handling:
 * - Each operation runs in isolation with try-catch
 * - If one operation fails, the other still completes
 * - All results are logged and returned
 */
export async function GET(req: NextRequest) {
  const logger = loggers.cron;
  const startTime = Date.now();

  try {
    // 1. Verify CRON_SECRET for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = authHeader?.replace('Bearer ', '');

    // Use timing-safe comparison to prevent timing attacks
    const isValid = providedSecret && cronSecret &&
      providedSecret.length === cronSecret.length &&
      timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(cronSecret)
      );

    if (!isValid) {
      logger.error({
        ip: req.headers.get('x-forwarded-for'),
        userAgent: req.headers.get('user-agent'),
      }, 'Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Daily tasks cron job started');

    // 2. Initialize results tracking
    const results = {
      subscriptionChecks: null as any,
      fraudMonitoring: null as any,
      overallSuccess: true,
      errors: [] as string[],
    };

    // 3. Run subscription checks operation (with error isolation)
    try {
      logger.info('Starting subscription checks operation');
      const subStartTime = Date.now();

      results.subscriptionChecks = await runSubscriptionChecks();

      const subDuration = Date.now() - subStartTime;
      logger.info({
        duration: `${subDuration}ms`,
        remindersSent: results.subscriptionChecks.remindersSent,
        subscriptionsInGracePeriod: results.subscriptionChecks.subscriptionsInGracePeriod,
        subscriptionsDowngraded: results.subscriptionChecks.subscriptionsDowngraded,
        errors: results.subscriptionChecks.errors.length,
      }, 'Subscription checks completed');

      // Track errors from subscription checks
      if (results.subscriptionChecks.errors.length > 0) {
        results.overallSuccess = false;
        results.errors.push(...results.subscriptionChecks.errors);
      }
    } catch (error) {
      logger.error({ error }, 'Subscription checks failed catastrophically');
      results.overallSuccess = false;
      results.errors.push('Subscription checks failed to complete');
      results.subscriptionChecks = {
        error: 'Failed to complete',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 4. Run fraud monitoring operation (with error isolation)
    try {
      logger.info('Starting fraud monitoring operation');
      const fraudStartTime = Date.now();

      results.fraudMonitoring = await runFraudMonitoring();

      const fraudDuration = Date.now() - fraudStartTime;
      logger.info({
        duration: `${fraudDuration}ms`,
        usersScanned: results.fraudMonitoring.usersScanned,
        newFlagsCreated: results.fraudMonitoring.newFlagsCreated,
        usersSuspended: results.fraudMonitoring.usersSuspended,
        errors: results.fraudMonitoring.errors.length,
      }, 'Fraud monitoring completed');

      // Track errors from fraud monitoring
      if (results.fraudMonitoring.errors.length > 0) {
        results.overallSuccess = false;
        results.errors.push(...results.fraudMonitoring.errors);
      }
    } catch (error) {
      logger.error({ error }, 'Fraud monitoring failed catastrophically');
      results.overallSuccess = false;
      results.errors.push('Fraud monitoring failed to complete');
      results.fraudMonitoring = {
        error: 'Failed to complete',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 5. Return consolidated results
    const totalDuration = Date.now() - startTime;
    logger.info({
      duration: `${totalDuration}ms`,
      overallSuccess: results.overallSuccess,
      totalErrors: results.errors.length,
    }, 'Daily tasks cron job completed');

    return NextResponse.json({
      success: results.overallSuccess,
      message: 'Daily tasks completed',
      timestamp: new Date().toISOString(),
      duration: `${totalDuration}ms`,
      results: {
        subscriptionChecks: results.subscriptionChecks,
        fraudMonitoring: results.fraudMonitoring,
        errors: results.errors,
      },
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error({
      error,
      duration: `${totalDuration}ms`,
    }, 'Daily tasks cron job failed catastrophically');
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
