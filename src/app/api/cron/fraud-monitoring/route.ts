import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runFraudDetection, autoSuspendIfNeeded } from '@/lib/fraud-detection';
import { createNotification } from '@/lib/notifications/create-notification';
import { timingSafeEqual } from 'crypto';

// This endpoint should be called daily by a cron service (e.g., cron-job.org, GitHub Actions, Vercel Cron)
// Recommended schedule: Daily at 2 AM UTC
export async function GET(req: NextRequest) {
  // DEPRECATION WARNING: This route is deprecated. Please migrate to /api/cron/daily-tasks

  try {
    // Verify cron secret to prevent unauthorized access
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const results = {
      usersScanned: 0,
      newFlagsCreated: 0,
      usersSuspended: 0,
      errors: [] as string[],
    };

    // 1. Re-scan users with low trust scores (< 70)
    const { data: lowTrustUsers, error: lowTrustError } = await supabase
      .from('User')
      .select('id, email, signupIp, trustScore')
      .lt('trustScore', 70)
      .eq('isSoftSuspended', false)
      .limit(100); // Process in batches to avoid timeouts

    if (lowTrustError) {
      results.errors.push('Failed to fetch low trust score users');
    }

    for (const user of lowTrustUsers || []) {
      try {
        const fraudResult = await runFraudDetection(user.id, user.signupIp || undefined);

        if (fraudResult.isFlagged) {
          results.newFlagsCreated += fraudResult.flags.length;

          // Auto-suspend if needed
          const wasSuspended = await autoSuspendIfNeeded(user.id, fraudResult);
          if (wasSuspended) {
            results.usersSuspended++;

            // Notify admins about auto-suspension
            try {
              // Get all admin users
              const { data: admins } = await supabase
                .from('User')
                .select('id')
                .eq('role', 'ADMIN')
                .limit(10);

              if (admins) {
                await createNotification(supabase, {
                  userId: admins[0]?.id || '',
                  type: 'VERIFICATION_REJECTED',
                  message: `FRAUD ALERT: User ${user.email} was automatically suspended (Trust Score: ${fraudResult.trustScore}). Flags: ${fraudResult.flags.length}`,
                  link: `/admin/users/${user.id}`,
                });
              }
            } catch (notificationError) {
              // Silent fail for notifications
            }
          }
        }

        results.usersScanned++;
      } catch (error) {
        results.errors.push(`Failed to scan user ${user.id}`);
      }
    }

    // 2. Re-scan users with recent activity (proposals or messages in last 24 hours)
    const { data: activeUsers, error: activeError } = await supabase
      .from('User')
      .select(`
        id,
        email,
        signupIp,
        trustScore
      `)
      .eq('isSoftSuspended', false)
      .limit(50);

    if (activeError) {
      results.errors.push('Failed to fetch active users');
    }

    for (const user of activeUsers || []) {
      try {
        // Check if user has recent proposals
        const { count: proposalCount } = await supabase
          .from('Proposal')
          .select('*', { count: 'exact', head: true })
          .eq('freelancerId', user.id)
          .gte('createdAt', oneDayAgo.toISOString());

        // Check if user has recent messages
        const { count: messageCount } = await supabase
          .from('Message')
          .select('*', { count: 'exact', head: true })
          .eq('senderId', user.id)
          .gte('createdAt', oneDayAgo.toISOString());

        // If user had recent activity, re-scan
        if ((proposalCount || 0) > 0 || (messageCount || 0) > 0) {
          const fraudResult = await runFraudDetection(user.id, user.signupIp || undefined);

          if (fraudResult.isFlagged) {
            results.newFlagsCreated += fraudResult.flags.length;

            const wasSuspended = await autoSuspendIfNeeded(user.id, fraudResult);
            if (wasSuspended) {
              results.usersSuspended++;
            }
          }

          results.usersScanned++;
        }
      } catch (error) {
        results.errors.push(`Failed to scan active user ${user.id}`);
      }
    }

    // 3. Auto-unsuspend users with improved trust scores (> 75 for 30+ days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: suspendedUsers, error: suspendedError } = await supabase
      .from('User')
      .select('id, email, trustScore, lastFlaggedAt')
      .eq('isSoftSuspended', true)
      .gt('trustScore', 75)
      .lt('lastFlaggedAt', thirtyDaysAgo.toISOString())
      .limit(20);

    if (!suspendedError && suspendedUsers) {
      for (const user of suspendedUsers) {
        try {
          // Unsuspend user
          await supabase
            .from('User')
            .update({ isSoftSuspended: false })
            .eq('id', user.id);

          // Notify user
          await createNotification(supabase, {
            userId: user.id,
            type: 'VERIFICATION_APPROVED',
            message: `Your account has been restored after review (Trust Score: ${user.trustScore}). Thank you for your patience.`,
            link: '/dashboard',
          });
        } catch (error) {
          results.errors.push(`Failed to unsuspend user ${user.id}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Fraud monitoring completed',
      results,
      timestamp: now.toISOString(),
      deprecated: true,
      deprecationNotice: 'This endpoint is deprecated. Use /api/cron/daily-tasks instead. This endpoint will be archived after 30 days.',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
