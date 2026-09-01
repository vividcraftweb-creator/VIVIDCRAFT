/**
 * Admin Job Moderation Router
 * Handles all job moderation operations for admins
 */

import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
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

const jobFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ALL', 'OPEN', 'PAUSED', 'CLOSED']).optional(),
  isApproved: z.enum(['ALL', 'approved', 'pending', 'rejected']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'budget', 'deadline']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminJobsRouter = router({
  // Get all jobs with filtering
  getJobs: adminProcedure
    .input(jobFilterSchema)
    .query(async ({ input, ctx }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return { jobs: [], total: 0, hasMore: false };
        }

        let query = supabase
          .from('Job')
          .select(`
            *,
            client:User!Job_clientId_fkey(id, email, Profile(*))
          `, { count: 'exact' });

        // Apply filters
        if (input.search) {
          query = query.or(`title.ilike.%${input.search}%,description.ilike.%${input.search}%`);
        }

        if (input.status && input.status !== 'ALL') {
          query = query.eq('status', input.status);
        }

        if (input.isApproved === 'approved') {
          query = query.eq('isApproved', true);
        } else if (input.isApproved === 'pending') {
          query = query.is('isApproved', null);
        } else if (input.isApproved === 'rejected') {
          query = query.eq('isApproved', false);
        }

        // Sorting
        query = query.order(input.sortBy, { ascending: input.sortOrder === 'asc' });

        // Pagination
        query = query.range(input.offset, input.offset + input.limit - 1);

        let { data, error, count } = await query;

        if (error) {
          console.error('getJobs join query error, trying plain select:', error);
          const fallbackRes = await supabase
            .from('Job')
            .select('*', { count: 'exact' })
            .order(input.sortBy, { ascending: input.sortOrder === 'asc' })
            .range(input.offset, input.offset + input.limit - 1);

          data = fallbackRes.data as any;
          count = fallbackRes.count;
        }

        return {
          jobs: data || [],
          total: count || 0,
          hasMore: (count || 0) > input.offset + input.limit,
        };
      } catch (err) {
        console.error('getJobs exception:', err);
        return { jobs: [], total: 0, hasMore: false };
      }
    }),

  // Get pending jobs for approval
  getPendingJobs: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      let { data, error } = await supabase
        .from('Job')
        .select(`
          *,
          client:User!Job_clientId_fkey(id, email, Profile(*))
        `)
        .is('isApproved', null)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('getPendingJobs join error, trying plain select:', error);
        const fallbackRes = await supabase
          .from('Job')
          .select('*')
          .is('isApproved', null)
          .order('createdAt', { ascending: false });
        data = fallbackRes.data as any;
      }

      return data || [];
    } catch (err) {
      console.error('getPendingJobs exception:', err);
      return [];
    }
  }),

  // Approve job
  approveJob: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await supabase
        .from('Job')
        .update({
          isApproved: true,
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.jobId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve job.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'APPROVE_JOB',
        entityType: 'Job',
        entityId: input.jobId,
      });

      return data;
    }),

  // Reject job
  rejectJob: adminProcedure
    .input(z.object({ jobId: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data, error } = await supabase
        .from('Job')
        .update({
          isApproved: false,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.jobId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject job.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'REJECT_JOB',
        entityType: 'Job',
        entityId: input.jobId,
        metadata: { reason: input.reason },
      });

      // Create notification for client
      const { data: job } = await supabase
        .from('Job')
        .select('clientId, title')
        .eq('id', input.jobId)
        .single();

      if (job) {
      await supabase
        .from('Notification')
        .insert({
          id: crypto.randomUUID(),
          userId: job.clientId,
          type: 'PROPOSAL_RECEIVED', // We can add a new type later
          message: `Your job "${job.title}" was not approved. Reason: ${input.reason}`,
          link: `/jobs/${input.jobId}`,
        });
      }

      return data;
    }),

  // Update job
  updateJob: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        budget: z.number().optional(),
        status: z.enum(['OPEN', 'PAUSED', 'CLOSED']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { jobId, ...updates } = input;

      const { data, error } = await supabase
        .from('Job')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update job.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'UPDATE_JOB',
        entityType: 'Job',
        entityId: jobId,
        metadata: updates,
      });

      return data;
    }),

  // Delete job
  deleteJob: adminProcedure
    .input(z.object({ jobId: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get job details before deletion
      const { data: job } = await supabase
        .from('Job')
        .select('title, clientId')
        .eq('id', input.jobId)
        .single();

      // Log the deletion
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'DELETE_JOB',
        entityType: 'Job',
        entityId: input.jobId,
        metadata: { reason: input.reason, title: job?.title },
      });

      // Delete the job
      const { error } = await supabase
        .from('Job')
        .delete()
        .eq('id', input.jobId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete job.',
        });
      }

      return { success: true, message: 'Job deleted successfully' };
    }),

  // Feature job
  featureJob: adminProcedure
    .input(z.object({ jobId: z.string(), featured: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Note: You might need to add a 'featured' column to the Job table
      // For now, we'll just log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: input.featured ? 'FEATURE_JOB' : 'UNFEATURE_JOB',
        entityType: 'Job',
        entityId: input.jobId,
      });

      return { success: true, message: input.featured ? 'Job featured' : 'Job unfeatured' };
    }),

  // Extend job expiration
  extendExpiration: adminProcedure
    .input(z.object({ jobId: z.string(), days: z.number().min(1).max(90) }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get current expiration
      const { data: job } = await supabase
        .from('Job')
        .select('expiresAt')
        .eq('id', input.jobId)
        .single();

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      const currentExpiration = job.expiresAt ? new Date(job.expiresAt) : new Date();
      const newExpiration = new Date(currentExpiration.getTime() + input.days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('Job')
        .update({
          expiresAt: newExpiration.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.jobId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to extend job expiration.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        userId: ctx.session.user.id,
        action: 'EXTEND_JOB_EXPIRATION',
        entityType: 'Job',
        entityId: input.jobId,
        metadata: { days: input.days, newExpiration: newExpiration.toISOString() },
      });

      return { success: true, message: `Job expiration extended by ${input.days} days` };
    }),

  // Get job statistics
  getJobStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return {
          totalJobs: 0,
          openJobs: 0,
          closedJobs: 0,
          pendingApproval: 0,
          approvedJobs: 0,
          rejectedJobs: 0,
        };
      }

      const [
        { count: totalJobs },
        { count: openJobs },
        { count: closedJobs },
        { count: pendingApproval },
        { count: approvedJobs },
        { count: rejectedJobs },
      ] = await Promise.all([
        supabase.from('Job').select('*', { count: 'exact', head: true }),
        supabase.from('Job').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
        supabase.from('Job').select('*', { count: 'exact', head: true }).eq('status', 'CLOSED'),
        supabase.from('Job').select('*', { count: 'exact', head: true }).is('isApproved', null),
        supabase.from('Job').select('*', { count: 'exact', head: true }).eq('isApproved', true),
        supabase.from('Job').select('*', { count: 'exact', head: true }).eq('isApproved', false),
      ]);

      return {
        totalJobs: totalJobs || 0,
        openJobs: openJobs || 0,
        closedJobs: closedJobs || 0,
        pendingApproval: pendingApproval || 0,
        approvedJobs: approvedJobs || 0,
        rejectedJobs: rejectedJobs || 0,
      };
    } catch (err) {
      return {
        totalJobs: 0,
        openJobs: 0,
        closedJobs: 0,
        pendingApproval: 0,
        approvedJobs: 0,
        rejectedJobs: 0,
      };
    }
  }),
});
