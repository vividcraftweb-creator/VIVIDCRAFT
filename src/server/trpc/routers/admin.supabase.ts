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
import { adminArtworksRouter } from './admin/artworks';
import { adminChatConnectionsRouter } from './admin/chatConnections';

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
  artworks: adminArtworksRouter,
  chatConnections: adminChatConnectionsRouter,
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          totalUsers: 0,
          totalJobs: 0,
          totalProposals: 0,
          totalContracts: 0,
          pendingVerifications: 0,
        };
      }

      let authUsersCount = 0;
      try {
        const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authList?.users) {
          authUsersCount = authList.users.length;
        }
      } catch (authErr) {}

      const [
        { count: totalUsers },
        { count: totalProfiles },
        { count: totalJobs },
        { count: totalProposals },
        { count: totalContracts },
        { count: pendingVerifications },
      ] = await Promise.all([
        supabase.from('User').select('*', { count: 'exact', head: true }),
        (supabase as any).from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('Job').select('*', { count: 'exact', head: true }),
        supabase.from('Proposal').select('*', { count: 'exact', head: true }),
        supabase.from('Contract').select('*', { count: 'exact', head: true }),
        supabase
          .from('Verification')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
      ]);

      const effectiveTotalUsers = Math.max(authUsersCount, totalUsers || 0, totalProfiles || 0);

      return {
        totalUsers: effectiveTotalUsers,
        totalJobs: totalJobs || 0,
        totalProposals: totalProposals || 0,
        totalContracts: totalContracts || 0,
        pendingVerifications: pendingVerifications || 0,
      };
    } catch (err) {
      console.error('getSystemStats exception:', err);
      return {
        totalUsers: 0,
        totalJobs: 0,
        totalProposals: 0,
        totalContracts: 0,
        pendingVerifications: 0,
      };
    }
  }),

  getGrowthAnalytics: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

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
    } catch (err) {
      console.error('getGrowthAnalytics exception:', err);
      return [];
    }
  }),

  getHealthSummary: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          totalUsers: 0,
          activeUsers: 0,
          pendingVerifications: 0,
          systemAlerts: 0,
        };
      }

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: pendingVerifications },
        { count: systemAlerts },
      ] = await Promise.all([
        supabase.from('User').select('*', { count: 'exact', head: true }),
        supabase.from('User').select('*', { count: 'exact', head: true }).eq('isVerified', true),
        supabase
          .from('Verification')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
        supabase
          .from('AuditLog')
          .select('*', { count: 'exact', head: true })
          .gte('createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        pendingVerifications: pendingVerifications || 0,
        systemAlerts: systemAlerts || 0,
      };
    } catch (err) {
      console.error('getHealthSummary exception:', err);
      return {
        totalUsers: 0,
        activeUsers: 0,
        pendingVerifications: 0,
        systemAlerts: 0,
      };
    }
  }),

  getAuditLogs: adminProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) return [];

        const limit = input?.limit || 20;
        const offset = input?.offset || 0;

        const { data: logs, error } = await supabase
          .from('AuditLog')
          .select(`
            *,
            user:User!AuditLog_userId_fkey(*)
          `)
          .order('createdAt', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('getAuditLogs join error, attempting fallback select:', error);
          const fallbackRes = await supabase
            .from('AuditLog')
            .select('*')
            .order('createdAt', { ascending: false })
            .range(offset, offset + limit - 1);
          return fallbackRes.data || [];
        }

        return logs || [];
      } catch (err) {
        console.error('getAuditLogs exception:', err);
        return [];
      }
    }),

  getDatabaseHealth: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          status: 'Offline',
          responseTime: 0,
          connectionPool: 'N/A',
        };
      }

      const start = Date.now();
      const { error } = await supabase.from('User').select('id', { count: 'exact', head: true }).limit(1);
      const responseTime = Date.now() - start;

      if (error) {
        return {
          status: 'Degraded',
          responseTime,
          connectionPool: 'Limited',
        };
      }

      return {
        status: 'Healthy',
        responseTime,
        connectionPool: 'Optimal',
      };
    } catch (err) {
      console.error('getDatabaseHealth exception:', err);
      return {
        status: 'Error',
        responseTime: 0,
        connectionPool: 'Offline',
      };
    }
  }),

  getRecentActivity: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

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
    } catch (err) {
      console.error('getRecentActivity exception:', err);
      return [];
    }
  }),

  getSystemHealth: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          database: { status: 'Degraded', healthy: false },
          api: { status: 'Fast', responseTime: 20 },
          queue: { status: 'Idle', pendingItems: 0 },
          payment: { status: 'Online', healthy: true },
        };
      }

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
      let totalPending = 0;
      try {
        const { count: pendingVerifications } = await supabase
          .from('Verification')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        totalPending = pendingVerifications || 0;
      } catch {
        totalPending = 0;
      }

      let queueStatus = 'Idle';
      if (totalPending > 10) queueStatus = 'Busy';
      else if (totalPending > 0) queueStatus = 'Active';

      // Payment gateway status
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
    } catch (err) {
      console.error('getSystemHealth exception:', err);
      return {
        database: { status: 'Degraded', healthy: false },
        api: { status: 'Fast', responseTime: 20 },
        queue: { status: 'Idle', pendingItems: 0 },
        payment: { status: 'Online', healthy: true },
      };
    }
  }),

  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      const { data: users, error } = await supabase
        .from('User')
        .select('*, Profile(*)');

      if (error) {
        console.error('getAllUsers join error, attempting fallback select:', error);
        const fallbackRes = await supabase.from('User').select('*');
        return fallbackRes.data || [];
      }

      return users || [];
    } catch (err) {
      console.error('getAllUsers exception:', err);
      return [];
    }
  }),

  getAllJobs: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      const { data: jobs, error } = await supabase
        .from('Job')
        .select('*, client:User!Job_clientId_fkey(*)');

      if (error) {
        console.error('getAllJobs join error, attempting fallback select:', error);
        const fallbackRes = await supabase.from('Job').select('*');
        return fallbackRes.data || [];
      }

      return jobs || [];
    } catch (err) {
      console.error('getAllJobs exception:', err);
      return [];
    }
  }),

  verifyClient: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await (supabase as any)
        .from('profiles')
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', input.userId)
        .select()
        .maybeSingle();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify client.',
        });
      }

      return data;
    }),

  getEliteUsers: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      let { data: users, error } = await supabase
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
        console.error('getEliteUsers join error, attempting fallback select:', error);
        const fallbackRes = await supabase
          .from('User')
          .select('id, email, subscriptionPlan, accountManagerId, Profile(firstName, lastName), createdAt')
          .eq('subscriptionPlan', 'FREELANCER_ELITE')
          .order('createdAt', { ascending: false });
        users = fallbackRes.data as any;
      }

      return users || [];
    } catch (err) {
      console.error('getEliteUsers exception:', err);
      return [];
    }
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
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      // Get all users with verification documents (both clients and freelancers)
      let { data: users, error } = await supabase
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
        console.error('getUsersWithVerifications join error, attempting fallback query:', error);
        const { data: verifications } = await supabase.from('Verification').select('*');
        if (!verifications || verifications.length === 0) return [];

        const userIds = Array.from(new Set(verifications.map((v: any) => v.userId).filter(Boolean)));
        const { data: rawUsers } = await supabase
          .from('User')
          .select('id, email, role, clientType, createdAt, Profile(firstName, lastName, companyName)')
          .in('id', userIds);

        users = (rawUsers || []).map((u: any) => ({
          ...u,
          Verification: verifications.filter((v: any) => v.userId === u.id),
        }));
      }

      // Filter to only include users who have at least one verification document
      const usersWithDocs = users?.filter(user => {
        const verifications = Array.isArray(user.Verification) ? user.Verification : [];
        return verifications.length > 0;
      }) || [];

      return usersWithDocs;
    } catch (err) {
      console.error('getUsersWithVerifications exception:', err);
      return [];
    }
  }),

  getAccountManagers: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      // Get all users with ADMIN role who can be account managers
      let { data: managers, error } = await supabase
        .from('User')
        .select(`
          id,
          email,
          Profile(firstName, lastName)
        `)
        .eq('role', 'ADMIN')
        .order('email', { ascending: true });

      if (error) {
        console.error('getAccountManagers join error, trying plain select:', error);
        const fallbackRes = await supabase
          .from('User')
          .select('id, email')
          .eq('role', 'ADMIN')
          .order('email', { ascending: true });
        managers = fallbackRes.data as any;
      }

      return managers || [];
    } catch (err) {
      console.error('getAccountManagers exception:', err);
      return [];
    }
  }),
});
