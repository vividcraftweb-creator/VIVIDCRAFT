/**
 * Admin User Management Router
 * Handles all user management operations for admins
 */

import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SubscriptionPlan } from '@/types/database.types';
import crypto from 'crypto';

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
      const supabase = requireAdminSupabase(ctx);

      let query = supabase
        .from('User')
        .select(`
          *,
          Profile(*)
        `, { count: 'exact' });

      // Apply filters
      if (input.search) {
        query = query.or(`email.ilike.%${input.search}%,id.ilike.%${input.search}%`);
      }

      if (input.role && input.role !== 'ALL') {
        query = query.eq('role', input.role);
      }

      if (input.subscriptionPlan) {
        query = query.eq('subscriptionPlan', input.subscriptionPlan);
      }

      if (input.verificationStatus === 'verified') {
        query = query.eq('isVerified', true);
      } else if (input.verificationStatus === 'unverified') {
        query = query.eq('isVerified', false);
      }

      if (input.emailVerified !== undefined) {
        query = query.eq('isVerified', input.emailVerified);
      }

      // Sorting
      query = query.order(input.sortBy, { ascending: input.sortOrder === 'asc' });

      // Pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users.',
        });
      }

      return {
        users: data || [],
        total: count || 0,
        hasMore: (count || 0) > input.offset + input.limit,
      };
    }),

  // Get single user details
  getUserById: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await supabase
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
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found.',
        });
      }

      return data;
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
      const supabase = requireAdminSupabase(ctx);

      const [
        { count: jobsCount },
        { count: proposalsCount },
        { data: approvedMilestones },
        { data: paidInvoices },
      ] = await Promise.all([
        supabase.from('Job').select('*', { count: 'exact', head: true }).eq('clientId', input.userId),
        supabase.from('Proposal').select('*', { count: 'exact', head: true }).eq('freelancerId', input.userId),
        supabase
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
          .eq('contract.freelancerId', input.userId),
        supabase
          .from('Invoice')
          .select('amount, status')
          .eq('clientId', input.userId)
          .eq('status', 'PAID'),
      ]);

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
    }),

  getOverview: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      { count: totalCount },
      { count: verifiedCount },
      { count: clientCount },
      { count: freelancerCount },
      { count: adminCount },
      { count: pendingVerifications },
      { count: newThisWeek },
    ] = await Promise.all([
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('User').select('*', { count: 'exact', head: true }).eq('isVerified', true),
      supabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'CLIENT'),
      supabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'FREELANCER'),
      supabase.from('User').select('*', { count: 'exact', head: true }).eq('role', 'ADMIN'),
      supabase.from('Verification').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', sevenDaysAgo.toISOString()),
    ]);

    return {
      total: totalCount || 0,
      verified: verifiedCount || 0,
      unverified: totalCount && verifiedCount ? Math.max(totalCount - verifiedCount, 0) : 0,
      clients: clientCount || 0,
      freelancers: freelancerCount || 0,
      admins: adminCount || 0,
      pendingVerifications: pendingVerifications || 0,
      newThisWeek: newThisWeek || 0,
    };
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
