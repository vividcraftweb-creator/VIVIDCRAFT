/**
 * Admin Router - Migrated to Supabase
 * Handles all admin operations using Supabase database
 */

import { router, adminProcedure } from '../trpc';
import type { Context } from '../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminUsersRouter } from './admin/users';
import { adminJobsRouter } from './admin/jobs';
import { adminAuditLogsRouter } from './admin/auditLogs';
import { adminProposalsRouter } from './admin/proposals';
import { adminMessagesRouter } from './admin/messages';
import { adminSettingsRouter } from './admin/settings';
import { adminSupportTicketsRouter } from './admin/supportTickets';

const requireAdminSupabase = (ctx: Context) => {
  const supabase = ctx.adminSupabase;

  if (!supabase) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to initialize admin Supabase client.',
    });
  }

  return supabase;
};

export const adminRouter = router({
  users: adminUsersRouter,
  jobs: adminJobsRouter,
  auditLogs: adminAuditLogsRouter,
  proposals: adminProposalsRouter,
  messages: adminMessagesRouter,
  settings: adminSettingsRouter,
  supportTickets: adminSupportTicketsRouter,
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const [
      { count: totalUsers },
      { count: totalJobs },
      { count: totalProposals },
      { count: totalContracts },
      { count: pendingVerifications },
    ] = await Promise.all([
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('Job').select('*', { count: 'exact', head: true }),
      supabase.from('Proposal').select('*', { count: 'exact', head: true }),
      supabase.from('Contract').select('*', { count: 'exact', head: true }),
      supabase
        .from('Verification')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ]);

    return {
      totalUsers: totalUsers || 0,
      totalJobs: totalJobs || 0,
      totalProposals: totalProposals || 0,
      totalContracts: totalContracts || 0,
      pendingVerifications: pendingVerifications || 0,
    };
  }),

  getGrowthAnalytics: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const monthFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: '2-digit',
    });

    const buckets: Array<{
      key: string;
      date: Date;
      newUsers: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, date, newUsers: 0 });
    }

    const earliestBucket = buckets[0];
    const { data: users } = await supabase
      .from('User')
      .select('createdAt')
      .gte('createdAt', earliestBucket.date.toISOString());

    users?.forEach((user) => {
      const createdAt = new Date(user.createdAt);
      const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.find((entry) => entry.key === key);
      if (bucket) {
        bucket.newUsers += 1;
      }
    });

    let cumulative = 0;
    return buckets.map((bucket) => {
      cumulative += bucket.newUsers;
      return {
        month: monthFormatter.format(bucket.date),
        users: cumulative,
        newUsers: bucket.newUsers,
      };
    });
  }),

  getRecentActivity: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    // Get recent user registrations
    const { data: recentUsers } = await supabase
      .from('User')
      .select('id, email, createdAt')
      .order('createdAt', { ascending: false })
      .limit(5);

    // Get recent verifications
    const { data: recentVerifications } = await supabase
      .from('Verification')
      .select('id, userId, status, updatedAt, User!Verification_userId_fkey(email)')
      .order('updatedAt', { ascending: false })
      .limit(5);

    // Combine and sort activities
    const activities: Array<{
      id: string;
      type: 'user_registered' | 'verification_approved' | 'verification_pending';
      description: string;
      timestamp: Date;
    }> = [];

    recentUsers?.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_registered',
        description: `New user registered: ${user.email}`,
        timestamp: new Date(user.createdAt),
      });
    });

    recentVerifications?.forEach(verification => {
      const user = Array.isArray(verification.User) ? verification.User[0] : verification.User;
      activities.push({
        id: `verification-${verification.id}`,
        type: verification.status === 'APPROVED' ? 'verification_approved' : 'verification_pending',
        description: verification.status === 'APPROVED'
          ? `Verification approved for ${user?.email || 'user'}`
          : `Verification pending for ${user?.email || 'user'}`,
        timestamp: new Date(verification.updatedAt),
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, 10);
  }),

  getSystemHealth: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const startTime = Date.now();

    // Test database connectivity
    let databaseStatus = 'Healthy';
    let databaseHealthy = true;
    try {
      const { error } = await supabase.from('User').select('id', { count: 'exact', head: true }).limit(1);
      if (error) {
        databaseStatus = 'Degraded';
        databaseHealthy = false;
      }
    } catch {
      databaseStatus = 'Down';
      databaseHealthy = false;
    }

    // Measure API response time
    const apiResponseTime = Date.now() - startTime;
    let apiStatus = 'Fast';
    if (apiResponseTime > 1000) apiStatus = 'Slow';
    else if (apiResponseTime > 500) apiStatus = 'Moderate';

    // Check queue status based on pending items
    const [{ count: pendingVerifications }] = await Promise.all([
      supabase
        .from('Verification')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
    ]);

    const totalPending = pendingVerifications || 0;
    let queueStatus = 'Idle';
    if (totalPending > 10) queueStatus = 'Busy';
    else if (totalPending > 0) queueStatus = 'Active';

    // Payment gateway status (simulated - would connect to actual payment provider API)
    const paymentStatus = 'Online';

    return {
      database: {
        status: databaseStatus,
        healthy: databaseHealthy,
      },
      api: {
        status: apiStatus,
        responseTime: apiResponseTime,
      },
      queue: {
        status: queueStatus,
        pendingItems: totalPending,
      },
      payment: {
        status: paymentStatus,
        healthy: true,
      },
    };
  }),

  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const { data: users, error } = await supabase
      .from('User')
      .select('*, Profile(*)');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users.',
      });
    }

    return users || [];
  }),

  getAllJobs: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const { data: jobs, error } = await supabase
      .from('Job')
      .select('*, client:User!Job_clientId_fkey(*)');

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch jobs.',
      });
    }

    return jobs || [];
  }),

  verifyClient: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await supabase
        .from('Profile')
        .update({ verified: true, updatedAt: new Date().toISOString() })
        .eq('userId', input.userId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify client.',
        });
      }

      return data;
    }),

  getEliteUsers: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const { data: users, error } = await supabase
      .from('User')
      .select(`
        id,
        email,
        subscriptionPlan,
        accountManagerId,
        accountManager:User!User_accountManagerId_fkey(
          id,
          email,
          Profile!inner(firstName, lastName)
        ),
        Profile!inner(firstName, lastName),
        createdAt
      `)
      .eq('subscriptionPlan', 'FREELANCER_ELITE')
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch elite users.',
      });
    }

    return users || [];
  }),

  assignAccountManager: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        managerId: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await supabase
        .from('User')
        .update({ accountManagerId: input.managerId, updatedAt: new Date().toISOString() })
        .eq('id', input.userId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign account manager.',
        });
      }

      return data;
    }),

  getUsersWithVerifications: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    // Get all users with verification documents (both clients and freelancers)
    const { data: users, error } = await supabase
      .from('User')
      .select(`
        id,
        email,
        role,
        clientType,
        createdAt,
        Profile(firstName, lastName, companyName),
        Verification!Verification_userId_fkey(*)
      `)
      .not('Verification!Verification_userId_fkey', 'is', null);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch users with verifications.',
      });
    }

    // Filter to only include users who have at least one verification document
    const usersWithDocs = users?.filter(user => {
      const verifications = Array.isArray(user.Verification) ? user.Verification : [];
      return verifications.length > 0;
    }) || [];

    return usersWithDocs;
  }),

  getAccountManagers: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    // Get all users with ADMIN role who can be account managers
    const { data: managers, error } = await supabase
      .from('User')
      .select(`
        id,
        email,
        Profile(firstName, lastName)
      `)
      .eq('role', 'ADMIN')
      .order('email', { ascending: true });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch account managers.',
      });
    }

    return managers || [];
  }),
});
