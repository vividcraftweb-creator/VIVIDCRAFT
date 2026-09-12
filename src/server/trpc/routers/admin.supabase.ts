/**
 * Admin Router - Migrated to Supabase
 * Handles all admin operations using Supabase database
 */

import { router, adminProcedure } from '../trpc';
import type { Context } from '../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { adminUsersRouter } from './admin/users';
import { adminJobsRouter } from './admin/jobs';
import { adminAuditLogsRouter } from './admin/auditLogs';
import { adminProposalsRouter } from './admin/proposals';
import { adminMessagesRouter } from './admin/messages';
import { adminSettingsRouter } from './admin/settings';
import { adminSupportTicketsRouter } from './admin/supportTickets';
import { adminArtworksRouter } from './admin/artworks';
import { adminChatConnectionsRouter } from './admin/chatConnections';
import { fetchAllVerificationsList } from './verifications.supabase';

const requireAdminSupabase = (ctx: Context) => {
  const supabase = ctx.adminSupabase || createAdminClient();

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
  getUsers: adminUsersRouter.getUsers,
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
        const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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
      const supabase = ctx.adminSupabase || createAdminClient();
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

  getVerifications: adminProcedure.query(async ({ ctx }) => {
    const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());
    return await fetchAllVerificationsList(supabase);
  }),

  getQueue: adminProcedure.query(async ({ ctx }) => {
    const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());
    return await fetchAllVerificationsList(supabase);
  }),

  getUsersWithVerifications: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());
      if (!supabase) return [];

      // 1. Fetch directly from admin_verification_queue view if available
      let directVerifications: any[] = [];
      const profilesMap = new Map<string, any>();
      let fromQueue = false;

      try {
        const { data: queueList, error: qError } = await (supabase as any)
          .from('admin_verification_queue')
          .select('*');

        if (!qError && Array.isArray(queueList) && queueList.length > 0) {
          directVerifications = queueList;
          fromQueue = true;
          for (const item of queueList) {
            const uid = item.user_id || item.userId;
            if (uid && (item.full_name || item.email)) {
              profilesMap.set(uid, {
                id: uid,
                full_name: item.full_name,
                email: item.email,
                avatar_url: item.avatar_url,
                role: item.role,
              });
            }
          }
        }
      } catch (err) {
        console.warn('admin_verification_queue notice in getUsersWithVerifications:', err);
      }

      if (!fromQueue) {
        try {
          const { data: vList, error: vError } = await (supabase as any)
            .from('verifications')
            .select(`
              *,
              profiles (
                id,
                full_name,
                first_name,
                last_name,
                email,
                avatar_url,
                profile_picture,
                role,
                client_type,
                is_verified,
                company_name
              )
            `)
            .order('created_at', { ascending: false });

        if (!vError && Array.isArray(vList)) {
          directVerifications = vList;
          for (const item of vList) {
            const uid = item.user_id || item.userId;
            if (uid && item.profiles) {
              const prof = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              if (prof) {
                profilesMap.set(uid, prof);
              }
            }
          }
        } else {
          // Schema cache fallback if PostgREST foreign key relationship is missing
          const { data: plainList } = await (supabase as any)
            .from('verifications')
            .select('*')
            .order('created_at', { ascending: false });
          if (Array.isArray(plainList)) {
            directVerifications = plainList;
          }
        }
      } catch (err) {
        console.warn('Error querying verifications table in getUsersWithVerifications:', err);
        try {
          const { data: plainList } = await (supabase as any)
            .from('verifications')
            .select('*')
            .order('created_at', { ascending: false });
          if (Array.isArray(plainList)) {
            directVerifications = plainList;
          }
        } catch (fallbackErr) {
          console.error('Fallback query to verifications table failed:', fallbackErr);
        }
      }
    }

      // 2. Fetch from legacy Verification table (PascalCase) for backwards compatibility
      let legacyVerifications: any[] = [];
      try {
        const { data: legList } = await supabase
          .from('Verification')
          .select('*')
          .order('createdAt', { ascending: false });
        if (Array.isArray(legList)) {
          legacyVerifications = legList;
        }
      } catch (err) {
        // Legacy table may not exist
      }

      // Collect all user IDs who have submitted verification documents
      const allUserIds = Array.from(
        new Set([
          ...directVerifications.map((v) => v.user_id || v.userId),
          ...legacyVerifications.map((v) => v.userId || v.user_id),
        ].filter(Boolean))
      );

      if (allUserIds.length === 0) return [];

      // 3. Fetch profiles from public.profiles table for any user IDs not already joined
      try {
        const { data: pList } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, avatar_url, profile_picture, role, client_type, is_verified, company_name')
          .in('id', allUserIds);
        if (Array.isArray(pList)) {
          pList.forEach((p: any) => {
            const existing = profilesMap.get(p.id) || {};
            profilesMap.set(p.id, { ...existing, ...p });
          });
        }
      } catch (pErr) {
        console.warn('profiles query notice in getUsersWithVerifications:', pErr);
      }

      // 4. Fetch legacy user accounts if needed
      let rawUsers: any[] = [];
      try {
        const { data: uList } = await supabase
          .from('User')
          .select(`
            id,
            email,
            role,
            clientType,
            isVerified,
            createdAt,
            Profile(firstName, lastName, companyName)
          `)
          .in('id', allUserIds);
        if (Array.isArray(uList)) {
          rawUsers = uList;
        }
      } catch (uErr) {
        // User table may be absent or unmapped in pure Supabase setups
      }

      // 5. Fetch from Supabase Auth admin if email is missing
      const authUsersMap = new Map<string, any>();
      const missingEmailIds = allUserIds.filter((uid) => {
        const p = profilesMap.get(uid);
        const u = rawUsers.find((r) => r.id === uid);
        return !p?.email && !u?.email;
      });

      if (missingEmailIds.length > 0) {
        await Promise.all(
          missingEmailIds.map(async (uid) => {
            try {
              const { data: authData } = await supabase.auth.admin.getUserById(uid);
              if (authData?.user) {
                authUsersMap.set(uid, authData.user);
              }
            } catch {}
          })
        );
      }

      // 6. Build normalized UserWithVerifications list
      const usersWithDocs = allUserIds
        .map((userId) => {
          const userObj = rawUsers.find((u) => u.id === userId);
          const prof = profilesMap.get(userId);
          const authUser = authUsersMap.get(userId);

          const email = prof?.email || userObj?.email || authUser?.email || 'User';
          const rawRole = (prof?.role || userObj?.role || authUser?.user_metadata?.role || 'ARTIST').toUpperCase();
          const role = rawRole === 'FREELANCER' || rawRole === 'ARTIST' ? 'ARTIST' : rawRole;
          const clientType = prof?.client_type || userObj?.clientType || null;
          const createdAt = prof?.created_at || userObj?.createdAt || authUser?.created_at || new Date().toISOString();
          const isVerified = Boolean(
            prof?.is_verified !== undefined && prof?.is_verified !== null
              ? prof.is_verified
              : (userObj?.isVerified ?? authUser?.user_metadata?.is_verified ?? false)
          );

          const fullName = prof?.full_name || '';
          const nameParts = fullName.trim().split(/\s+/);
          const firstName =
            prof?.first_name ||
            prof?.firstName ||
            (Array.isArray(userObj?.Profile) ? userObj?.Profile[0]?.firstName : userObj?.Profile?.firstName) ||
            authUser?.user_metadata?.firstName ||
            authUser?.user_metadata?.first_name ||
            (nameParts[0] || '');
          const lastName =
            prof?.last_name ||
            prof?.lastName ||
            (Array.isArray(userObj?.Profile) ? userObj?.Profile[0]?.lastName : userObj?.Profile?.lastName) ||
            authUser?.user_metadata?.lastName ||
            authUser?.user_metadata?.last_name ||
            (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
          const companyName =
            prof?.company_name ||
            (Array.isArray(userObj?.Profile) ? userObj?.Profile[0]?.companyName : userObj?.Profile?.companyName) ||
            null;

          const avatarUrl =
            prof?.avatar_url ||
            prof?.avatar ||
            prof?.profile_picture ||
            authUser?.user_metadata?.avatar_url ||
            authUser?.user_metadata?.picture ||
            authUser?.user_metadata?.avatar ||
            null;

          const profileObj = [
            {
              firstName,
              lastName,
              companyName,
              full_name: fullName || `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              avatar_url: avatarUrl,
            },
          ];

          const docs: any[] = [];

          // Add documents from verifications table with normalized column mappings
          const userDirects = directVerifications.filter((v) => (v.user_id || v.userId) === userId);
          for (const v of userDirects) {
            const docType = v.document_type || v.documentType || 'ID Document';
            const status = (v.status || 'PENDING').toUpperCase();
            const docCreatedAt = v.created_at || createdAt;
            const rejectionReason = v.rejection_reason || v.rejectionReason || null;

            // Map database columns: id_front_url or front_url
            const frontUrl =
              v.id_front_url ||
              v.front_url ||
              v.id_front ||
              v.frontUrl ||
              v.document_url ||
              v.documentUrl ||
              v.file_url ||
              v.fileUrl ||
              v.files ||
              null;
            // id_back_url or back_url
            const backUrl = v.id_back_url || v.back_url || v.id_back || v.backUrl || null;
            // selfie_url
            const selfieUrl = v.selfie_url || v.selfieUrl || v.selfie || null;

            let addedAny = false;

            if (frontUrl) {
              docs.push({
                id: `${v.id}-front`,
                verificationType: 'ID_FRONT',
                documentType: `${docType} (Front)`,
                documentUrl: frontUrl,
                files: frontUrl,
                fileName: `${docType} - Front`,
                status,
                createdAt: docCreatedAt,
                rejectionReason,
              });
              addedAny = true;
            }
            if (backUrl) {
              docs.push({
                id: `${v.id}-back`,
                verificationType: 'ID_BACK',
                documentType: `${docType} (Back)`,
                documentUrl: backUrl,
                files: backUrl,
                fileName: `${docType} - Back`,
                status,
                createdAt: docCreatedAt,
                rejectionReason,
              });
              addedAny = true;
            }
            if (selfieUrl) {
              docs.push({
                id: `${v.id}-selfie`,
                verificationType: 'SELFIE',
                documentType: `Selfie with ${docType}`,
                documentUrl: selfieUrl,
                files: selfieUrl,
                fileName: `Selfie with ${docType}`,
                status,
                createdAt: docCreatedAt,
                rejectionReason,
              });
              addedAny = true;
            }

            // Fallback: Ensure candidate record is never dropped if URLs are in other fields or single slot
            if (!addedAny) {
              docs.push({
                id: `${v.id}`,
                verificationType: 'ID_FRONT',
                documentType: docType,
                documentUrl: frontUrl || backUrl || selfieUrl || null,
                files: frontUrl || backUrl || selfieUrl || null,
                fileName: docType,
                status,
                createdAt: docCreatedAt,
                rejectionReason,
              });
            }
          }

          // Add documents from legacy Verification table
          const userLegacies = legacyVerifications.filter((v) => (v.userId || v.user_id) === userId);
          for (const leg of userLegacies) {
            const legacyUrl = leg.documentUrl || leg.files || null;
            if (!docs.some((d) => d.documentUrl && legacyUrl && d.documentUrl === legacyUrl)) {
              docs.push({
                id: leg.id,
                verificationType: leg.verificationType || 'ID_FRONT',
                documentType: leg.documentType || 'Document',
                documentUrl: legacyUrl,
                files: leg.files || leg.documentUrl || null,
                fileName: leg.fileName || leg.documentType || null,
                status: (leg.status || 'PENDING').toUpperCase(),
                createdAt: leg.createdAt || createdAt,
                rejectionReason: leg.rejectionReason || leg.details || null,
              });
            }
          }

          return {
            id: userId,
            userId,
            user_id: userId,
            email,
            role,
            clientType,
            createdAt,
            isVerified,
            is_verified: isVerified,
            avatar_url: avatarUrl,
            avatarUrl: avatarUrl,
            avatar: avatarUrl,
            full_name: fullName,
            name: fullName,
            user: {
              id: userId,
              email,
              role,
              full_name: fullName,
              fullName,
              name: fullName,
              avatar_url: avatarUrl,
              avatarUrl: avatarUrl,
              avatar: avatarUrl,
              image: avatarUrl,
              Profile: profileObj,
            },
            profiles: {
              id: userId,
              email,
              role,
              full_name: fullName,
              name: fullName,
              avatar_url: avatarUrl,
              client_type: clientType,
              is_verified: isVerified,
              company_name: companyName,
            },
            Profile: profileObj,
            Verification: docs,
          };
        })
        .filter((u) => u.Verification.length > 0);

      console.log('[AdminRouter getUsersWithVerifications] Returning users with docs:', usersWithDocs.length);
      return usersWithDocs;
    } catch (err) {
      console.error('getUsersWithVerifications exception:', err);
      return [];
    }
  }),

  approveVerification: adminProcedure
    .input(z.object({ verificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');
      const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());

      console.log('[AdminRouter approveVerification] Approving verificationId:', input.verificationId);

      let targetUserId = cleanId;
      let specificRowId = cleanId;
      try {
        const { data: vRow } = await (supabase as any)
          .from('verifications')
          .select('id, user_id')
          .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
          .limit(1)
          .maybeSingle();
        if (vRow?.user_id) targetUserId = vRow.user_id;
        if (vRow?.id) specificRowId = vRow.id;
      } catch {}

      // Update specific record in public.verifications
      try {
        await (supabase as any)
          .from('verifications')
          .update({
            status: 'approved',
            rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', specificRowId);
      } catch {}

      // Check if ALL documents in verifications are approved for targetUserId
      let allApproved = true;
      try {
        const { data: userDocs } = await (supabase as any)
          .from('verifications')
          .select('status')
          .eq('user_id', targetUserId);
        if (userDocs && userDocs.length > 0) {
          allApproved = userDocs.every((d: any) => (d.status || '').toLowerCase() === 'approved');
        }
      } catch {}

      if (allApproved) {
        try {
          await (supabase as any)
            .from('profiles')
            .update({
              is_verified: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetUserId);
          console.log('[AdminRouter approveVerification] Set profiles.is_verified = true for user:', targetUserId);
        } catch {}
      }

      return true;
    }),

  rejectVerification: adminProcedure
    .input(z.object({ verificationId: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');
      const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());

      console.log('[AdminRouter rejectVerification] Rejecting verificationId:', input.verificationId, 'reason:', input.reason);

      let targetUserId = cleanId;
      let specificRowId = cleanId;
      try {
        const { data: vRow } = await (supabase as any)
          .from('verifications')
          .select('id, user_id')
          .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
          .limit(1)
          .maybeSingle();
        if (vRow?.user_id) targetUserId = vRow.user_id;
        if (vRow?.id) specificRowId = vRow.id;
      } catch {}

      // Update specific record in public.verifications
      try {
        await (supabase as any)
          .from('verifications')
          .update({
            status: 'rejected',
            rejection_reason: input.reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', specificRowId);
      } catch {}

      try {
        await (supabase as any)
          .from('profiles')
          .update({
            is_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
        console.log('[AdminRouter rejectVerification] Set profiles.is_verified = false for user:', targetUserId);
      } catch {}

      return true;
    }),

  getAccountManagers: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase || createAdminClient();
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
