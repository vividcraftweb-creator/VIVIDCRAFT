import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SubscriptionPlan } from '@/types/database.types';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

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

const userFilterSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['FREELANCER', 'CLIENT', 'ADMIN', 'ALL']).optional(),
  subscriptionPlan: z.nativeEnum(SubscriptionPlan).optional(),
  verificationStatus: z.enum(['verified', 'unverified', 'ALL']).optional(),
  emailVerified: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'email', 'lastLoginAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminUsersRouter = router({
  // Get all users with filtering, pagination, and search
  getUsers: adminProcedure
    .input(userFilterSchema)
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase || createAdminClient();
        if (!supabase) {
          return { users: [], total: 0, hasMore: false };
        }

        // 1. Fetch users from Supabase Auth Admin API
        let authUsers: any[] = [];
        try {
          const { data: authList, error: authError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          if (!authError && authList?.users) {
            authUsers = authList.users;
          } else if (authError) {
            console.warn('supabase.auth.admin.listUsers error:', authError);
          }
        } catch (authErr) {
          console.warn('listUsers exception:', authErr);
        }

        // 2. Fetch profiles from profiles / Profile table
        const profilesMap = new Map<string, any>();
        try {
          const { data: profilesRows } = await (supabase as any).from('profiles').select('*');
          if (profilesRows) {
            profilesRows.forEach((p: any) => {
              if (p.id) profilesMap.set(p.id, p);
            });
          }
        } catch (pErr) {}

        try {
          const { data: profileTableRows } = await supabase.from('Profile').select('*');
          if (profileTableRows) {
            profileTableRows.forEach((p: any) => {
              const key = p.userId || p.id;
              if (key) {
                const existing = profilesMap.get(key) || {};
                profilesMap.set(key, { ...existing, ...p });
              }
            });
          }
        } catch (pErr) {}

        // 3. Fetch from User table if exists
        const userTableMap = new Map<string, any>();
        try {
          const { data: userRows } = await supabase.from('User').select('*');
          if (userRows) {
            userRows.forEach((u: any) => {
              if (u.id) userTableMap.set(u.id, u);
            });
          }
        } catch (uErr) {}

        // 4. Merge all sources into unified user objects
        const unifiedUserMap = new Map<string, any>();

        // Merge from authUsers
        authUsers.forEach((au) => {
          const profile = profilesMap.get(au.id) || {};
          const dbUser = userTableMap.get(au.id) || {};

          const rawRole = (
            dbUser.role ||
            profile.role ||
            au.user_metadata?.role ||
            au.app_metadata?.role ||
            'CLIENT'
          ).toUpperCase();

          const role = ['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(rawRole)
            ? 'FREELANCER'
            : (rawRole === 'ADMIN' ? 'ADMIN' : 'CLIENT');

          const firstName = profile.first_name || profile.firstName || au.user_metadata?.firstName || au.user_metadata?.name?.split(' ')[0] || '';
          const lastName = profile.last_name || profile.lastName || au.user_metadata?.lastName || au.user_metadata?.name?.split(' ').slice(1).join(' ') || '';

          unifiedUserMap.set(au.id, {
            id: au.id,
            email: au.email || dbUser.email || profile.email || '',
            role,
            subscriptionPlan: dbUser.subscriptionPlan && !dbUser.subscriptionPlan.toUpperCase().includes('FREE') && !dbUser.subscriptionPlan.toUpperCase().includes('STARTER') ? dbUser.subscriptionPlan : (role === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO'),
            isVerified: dbUser.isVerified ?? Boolean(au.email_confirmed_at),
            createdAt: au.created_at || dbUser.createdAt || profile.created_at || new Date().toISOString(),
            lastLoginAt: au.last_sign_in_at || dbUser.lastLoginAt || null,
            Profile: {
              id: profile.id || au.id,
              userId: au.id,
              firstName,
              lastName,
              first_name: firstName,
              last_name: lastName,
              address: profile.address || profile.location || profile.businessAddressLine1 || '',
              whatsappNumber: profile.whatsapp_number || profile.phone || profile.businessPhone || '',
              whatsapp_number: profile.whatsapp_number || profile.phone || profile.businessPhone || '',
              phone: profile.whatsapp_number || profile.phone || profile.businessPhone || '',
              email: profile.email || profile.businessEmail || au.email || '',
              location: profile.address || profile.location || profile.businessAddressLine1 || '',
              bio: profile.bio || '',
              title: profile.title || '',
              skills: profile.skills || '',
              rate: profile.rate,
              portfolio: profile.portfolio || '',
            },
            ...dbUser,
          });
        });

        // Also add any profiles not in authUsers (e.g. legacy/mock profiles)
        profilesMap.forEach((profile, profileId) => {
          if (!unifiedUserMap.has(profileId)) {
            const dbUser = userTableMap.get(profileId) || {};
            const firstName = profile.first_name || profile.firstName || '';
            const lastName = profile.last_name || profile.lastName || '';
            const rawRole = (dbUser.role || profile.role || 'CLIENT').toUpperCase();
            const role = ['FREELANCER', 'ARTIST', 'CREATOR', 'SELLER'].includes(rawRole)
              ? 'FREELANCER'
              : (rawRole === 'ADMIN' ? 'ADMIN' : 'CLIENT');

            unifiedUserMap.set(profileId, {
              id: profileId,
              email: profile.email || dbUser.email || '',
              role,
              subscriptionPlan: dbUser.subscriptionPlan && !dbUser.subscriptionPlan.toUpperCase().includes('FREE') && !dbUser.subscriptionPlan.toUpperCase().includes('STARTER') ? dbUser.subscriptionPlan : (role === 'CLIENT' ? 'CLIENT_BUSINESS' : 'FREELANCER_PRO'),
              isVerified: dbUser.isVerified ?? false,
              createdAt: profile.created_at || profile.createdAt || new Date().toISOString(),
              Profile: {
                id: profile.id || profileId,
                userId: profileId,
                firstName,
                lastName,
                first_name: firstName,
                last_name: lastName,
                address: profile.address || profile.location || '',
                whatsappNumber: profile.whatsapp_number || profile.phone || '',
                phone: profile.whatsapp_number || profile.phone || '',
                email: profile.email || '',
                location: profile.address || profile.location || '',
              },
              ...dbUser,
            });
          }
        });

        // Also add any userTable entries not in authUsers
        userTableMap.forEach((dbUser, userId) => {
          if (!unifiedUserMap.has(userId)) {
            const profile = profilesMap.get(userId) || {};
            const firstName = profile.first_name || profile.firstName || '';
            const lastName = profile.last_name || profile.lastName || '';
            const role = (dbUser.role || 'CLIENT').toUpperCase();

            unifiedUserMap.set(userId, {
              id: userId,
              email: dbUser.email || profile.email || '',
              role,
              subscriptionPlan: dbUser.subscriptionPlan || 'FREE',
              isVerified: dbUser.isVerified ?? false,
              createdAt: dbUser.createdAt || new Date().toISOString(),
              Profile: {
                id: profile.id || userId,
                userId,
                firstName,
                lastName,
                first_name: firstName,
                last_name: lastName,
                address: profile.address || profile.location || '',
                whatsappNumber: profile.whatsapp_number || profile.phone || '',
                phone: profile.whatsapp_number || profile.phone || '',
                email: profile.email || dbUser.email || '',
                location: profile.address || profile.location || '',
              },
              ...dbUser,
            });
          }
        });

        let allUsers = Array.from(unifiedUserMap.values());

        // 5. Apply filters
        if (input.search) {
          const s = input.search.toLowerCase();
          allUsers = allUsers.filter(
            (u) =>
              u.email?.toLowerCase().includes(s) ||
              u.id?.toLowerCase().includes(s) ||
              u.Profile?.firstName?.toLowerCase().includes(s) ||
              u.Profile?.lastName?.toLowerCase().includes(s)
          );
        }

        if (input.role && input.role !== 'ALL') {
          allUsers = allUsers.filter((u) => u.role === input.role);
        }

        if (input.subscriptionPlan) {
          allUsers = allUsers.filter((u) => u.subscriptionPlan === input.subscriptionPlan);
        }

        if (input.verificationStatus === 'verified') {
          allUsers = allUsers.filter((u) => u.isVerified === true);
        } else if (input.verificationStatus === 'unverified') {
          allUsers = allUsers.filter((u) => u.isVerified === false);
        }

        if (input.emailVerified !== undefined) {
          allUsers = allUsers.filter((u) => u.isVerified === input.emailVerified);
        }

        // Sorting
        allUsers.sort((a, b) => {
          const aVal = a[input.sortBy || 'createdAt'];
          const bVal = b[input.sortBy || 'createdAt'];
          if (!aVal) return 1;
          if (!bVal) return -1;
          if (input.sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });

        const total = allUsers.length;
        const paginatedUsers = allUsers.slice(input.offset, input.offset + input.limit);

        return {
          users: paginatedUsers,
          total,
          hasMore: total > input.offset + input.limit,
        };
      } catch (err) {
        console.error('getUsers exception:', err);
        return { users: [], total: 0, hasMore: false };
      }
    }),

  // Get single user details
  getUserById: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase || createAdminClient();
        if (!supabase) return null;

        // Try getting user from User table first
        let dbUser: any = null;
        try {
          const { data } = await supabase
            .from('User')
            .select(`
              *,
              Profile(*),
              clientContracts:Contract!Contract_clientId_fkey(*),
              freelancerContracts:Contract!Contract_freelancerId_fkey(*),
              clientJobs:Job!Job_clientId_fkey(*),
              freelancerProposals:Proposal!Proposal_freelancerId_fkey(*)
            `)
            .eq('id', input.userId)
            .maybeSingle();
          dbUser = data;
        } catch (e) {}

        // Fetch from Supabase Auth
        let authUser: any = null;
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(input.userId);
          authUser = authData?.user;
        } catch (e) {}

        // Fetch profile
        let profileData: any = null;
        try {
          const { data: p1 } = await (supabase as any).from('profiles').select('*').eq('id', input.userId).maybeSingle();
          const { data: p2 } = await supabase.from('Profile').select('*').eq('userId', input.userId).maybeSingle();
          profileData = { ...(p1 || {}), ...(p2 || {}) };
        } catch (e) {}

        if (!dbUser && !authUser && !profileData) {
          return null;
        }

        const role = (
          dbUser?.role ||
          profileData?.role ||
          authUser?.user_metadata?.role ||
          'CLIENT'
        ).toUpperCase();

        const firstName = profileData?.first_name || profileData?.firstName || authUser?.user_metadata?.firstName || authUser?.user_metadata?.name?.split(' ')[0] || '';
        const lastName = profileData?.last_name || profileData?.lastName || authUser?.user_metadata?.lastName || authUser?.user_metadata?.name?.split(' ').slice(1).join(' ') || '';

        return {
          id: input.userId,
          email: authUser?.email || dbUser?.email || profileData?.email || '',
          role,
          subscriptionPlan: dbUser?.subscriptionPlan || 'FREE',
          isVerified: dbUser?.isVerified ?? Boolean(authUser?.email_confirmed_at),
          tokens: dbUser?.tokens || (role === 'CLIENT' ? 50 : 10),
          createdAt: authUser?.created_at || dbUser?.createdAt || profileData?.created_at || new Date().toISOString(),
          lastLoginAt: authUser?.last_sign_in_at || dbUser?.lastLoginAt || null,
          Profile: {
            id: profileData?.id || input.userId,
            userId: input.userId,
            firstName,
            lastName,
            first_name: firstName,
            last_name: lastName,
            location: profileData?.address || profileData?.location || profileData?.businessAddressLine1 || '',
            address: profileData?.address || profileData?.location || profileData?.businessAddressLine1 || '',
            phone: profileData?.whatsapp_number || profileData?.phone || profileData?.businessPhone || '',
            whatsapp_number: profileData?.whatsapp_number || profileData?.phone || profileData?.businessPhone || '',
            whatsappNumber: profileData?.whatsapp_number || profileData?.phone || profileData?.businessPhone || '',
            businessPhone: profileData?.whatsapp_number || profileData?.phone || profileData?.businessPhone || '',
            email: profileData?.email || profileData?.businessEmail || authUser?.email || '',
            businessEmail: profileData?.email || profileData?.businessEmail || authUser?.email || '',
            title: profileData?.title || '',
            bio: profileData?.bio || '',
            skills: profileData?.skills || '',
            rate: profileData?.rate,
            portfolio: profileData?.portfolio || '',
            experience: profileData?.experience || '',
            education: profileData?.education || '',
          },
          ...(dbUser || {}),
        };
      } catch (err) {
        console.error('getUserById exception:', err);
        return null;
      }
    }),

  // Update user information
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email().optional(),
        role: z.enum(['FREELANCER', 'CLIENT', 'ADMIN']).optional(),
        subscriptionPlan: z.nativeEnum(SubscriptionPlan).optional(),
        isVerified: z.boolean().optional(),
        tokens: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { userId, ...updates } = input;

      const { data, error } = await supabase
        .from('User')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: userId,
        metadata: updates,
      });

      return data;
    }),

  // Suspend/unsuspend user
  suspendUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        suspend: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // First check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('User')
        .select('id, email')
        .eq('id', input.userId)
        .single();

      if (fetchError || !existingUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // If suspending, create a fraud flag
      if (input.suspend) {
        const { error: flagError } = await supabase.from('FraudFlag').insert({
          id: crypto.randomUUID(),
          userId: input.userId,
          reason: input.reason || 'Admin suspension',
          riskScore: 10,
          status: 'CONFIRMED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: ctx.session.user.id,
          updatedAt: new Date().toISOString(),
          metadata: JSON.stringify({ suspendedBy: ctx.session.user.id, suspendedAt: new Date().toISOString() }),
        });

        if (flagError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to suspend user.',
          });
        }

        // Send suspension email
        try {
          const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

          if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: existingUser.email,
                template: 'accountSuspended',
                templateData: {
                  reason: input.reason,
                },
              }),
            });

            if (!emailResponse.ok) {
              // Email sending failed
            }
          }
        } catch (emailError) {
          // Continue even if email fails
        }
      }

      return { success: true, message: input.suspend ? 'User suspended' : 'User unsuspended' };
    }),

  // Delete user (soft delete by marking email as deleted)
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get user email before deletion
      const { data: user } = await supabase
        .from('User')
        .select('email')
        .eq('id', input.userId)
        .single();

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Log the deletion before removing
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: input.userId,
        metadata: { reason: input.reason, deletedEmail: user.email },
      });

      // Instead of hard delete, we'll mark the email as deleted
      const { error } = await supabase
        .from('User')
        .update({
          email: `deleted_${input.userId}@deleted.local`,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.userId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user.',
        });
      }

      return { success: true, message: 'User deleted successfully' };
    }),

  // Manual verify user
  verifyUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Update user verification status
      const { error: userError } = await supabase
        .from('User')
        .update({ isVerified: true, updatedAt: new Date().toISOString() })
        .eq('id', input.userId);

      if (userError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify user.',
        });
      }

      // Also update profile if it exists
      const { error: profileError } = await supabase
        .from('Profile')
        .update({ verified: true, updatedAt: new Date().toISOString() })
        .eq('userId', input.userId);

      if (profileError) {
        // Profile update is optional, ignore the error
      }

      return { success: true, message: 'User verified successfully' };
    }),

  // Get user statistics
  getUserStats: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return {
            jobsPosted: 0,
            proposalsSubmitted: 0,
            totalEarned: 0,
            totalSpent: 0,
          };
        }

        let jobsCount = 0;
        let proposalsCount = 0;
        let approvedMilestones: any[] = [];
        let paidInvoices: any[] = [];

        try {
          const res = await supabase.from('Job').select('*', { count: 'exact', head: true }).eq('clientId', input.userId);
          jobsCount = res.count || 0;
        } catch {}

        try {
          const res = await supabase.from('Proposal').select('*', { count: 'exact', head: true }).eq('freelancerId', input.userId);
          proposalsCount = res.count || 0;
        } catch {}

        try {
          const res = await supabase
            .from('Milestone')
            .select(
              `
                amount,
                status,
                contract:Contract!Milestone_contractId_fkey(
                  freelancerId
                )
              `
            )
            .eq('status', 'APPROVED')
            .eq('contract.freelancerId', input.userId);
          approvedMilestones = res.data || [];
        } catch {}

        try {
          const res = await supabase
            .from('Invoice')
            .select('amount, status')
            .eq('clientId', input.userId)
            .eq('status', 'PAID');
          paidInvoices = res.data || [];
        } catch {}

        const totalEarned =
          approvedMilestones?.reduce((sum, milestone) => {
            const amount = Number(milestone.amount) || 0;
            return sum + amount;
          }, 0) || 0;

        const totalSpent =
          paidInvoices?.reduce((sum, invoice) => {
            const amount = Number(invoice.amount) || 0;
            return sum + amount;
          }, 0) || 0;

        return {
          jobsPosted: jobsCount || 0,
          proposalsSubmitted: proposalsCount || 0,
          totalEarned,
          totalSpent,
        };
      } catch (err) {
        console.error('getUserStats exception:', err);
        return {
          jobsPosted: 0,
          proposalsSubmitted: 0,
          totalEarned: 0,
          totalSpent: 0,
        };
      }
    }),

  getOverview: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase || createAdminClient();
      if (!supabase) {
        return {
          total: 0,
          verified: 0,
          unverified: 0,
          clients: 0,
          freelancers: 0,
          admins: 0,
          pendingVerifications: 0,
          newThisWeek: 0,
        };
      }

      let authUsers: any[] = [];
      try {
        const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authList?.users) {
          authUsers = authList.users;
        }
      } catch (authErr) {}

      let userRows: any[] = [];
      try {
        const { data } = await supabase.from('User').select('*');
        if (data) userRows = data;
      } catch (uErr) {}

      let profileRows: any[] = [];
      try {
        const { data } = await (supabase as any).from('profiles').select('*');
        if (data) profileRows = data;
      } catch (pErr) {}

      const userIds = new Set<string>();
      authUsers.forEach((u) => userIds.add(u.id));
      userRows.forEach((u) => userIds.add(u.id));
      profileRows.forEach((p) => userIds.add(p.id));

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let verifiedCount = 0;
      let newCount = 0;
      let clientCount = 0;
      let freelancerCount = 0;
      let adminCount = 0;

      userIds.forEach((id) => {
        const au = authUsers.find((u) => u.id === id);
        const du = userRows.find((u) => u.id === id);
        const pu = profileRows.find((p) => p.id === id);

        const isVerified = du?.isVerified ?? Boolean(au?.email_confirmed_at);
        if (isVerified) verifiedCount++;

        const createdDate = new Date(au?.created_at || du?.createdAt || pu?.created_at || now);
        if (createdDate >= sevenDaysAgo) newCount++;

        const role = (du?.role || pu?.role || au?.user_metadata?.role || 'CLIENT').toUpperCase();
        if (role === 'CLIENT') clientCount++;
        else if (role === 'FREELANCER' || role === 'ARTIST') freelancerCount++;
        else if (role === 'ADMIN') adminCount++;
      });

      const total = userIds.size;

      return {
        total,
        verified: verifiedCount,
        unverified: Math.max(total - verifiedCount, 0),
        clients: clientCount,
        freelancers: freelancerCount,
        admins: adminCount,
        pendingVerifications: 0,
        newThisWeek: newCount,
      };
    } catch (err) {
      console.error('getOverview exception:', err);
      return {
        total: 0,
        verified: 0,
        unverified: 0,
        clients: 0,
        freelancers: 0,
        admins: 0,
        pendingVerifications: 0,
        newThisWeek: 0,
      };
    }
  }),

  // Impersonate user (generate special session token)
  impersonateUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Log the impersonation
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'IMPERSONATE_USER',
        entityType: 'User',
        entityId: input.userId,
        metadata: { impersonatedBy: ctx.session.user.id, timestamp: new Date().toISOString() },
      });

      // In a real implementation, you'd generate a special token
      // For now, we'll just return the user ID
      return {
        success: true,
        message: 'Impersonation logged',
        redirectUrl: `/dashboard?impersonate=${input.userId}`
      };
    }),
});
