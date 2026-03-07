/**
 * Admin Proposals Router
 * Handles proposal management and monitoring
 */

import crypto from 'crypto';
import { router, adminProcedure } from '../../trpc';
import type { Context } from '../../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

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

export const adminProposalsRouter = router({
  /**
   * Get all proposals with pagination and filtering
   */
  getProposals: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);
      const { page, limit, status, search } = input;

      const offset = (page - 1) * limit;

      // Build query - fetch all proposal fields including AI analysis and screening
      let query = supabase
        .from('Proposal')
        .select(
          `
          id,
          freelancerId,
          jobId,
          status,
          proposedRate,
          tokenBid,
          coverLetter,
          aiScore,
          aiAnalysis,
          screeningAnswers,
          createdAt,
          updatedAt,
          freelancer:User!Proposal_freelancerId_fkey(
            id,
            email,
            Profile(firstName, lastName, title)
          ),
          job:Job!Proposal_jobId_fkey(
            id,
            title,
            budget,
            client:User!Job_clientId_fkey(
              id,
              email,
              Profile(firstName, lastName, companyName)
            )
          )
        `,
          { count: 'exact' }
        )
        .order('createdAt', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: proposals, error, count } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch proposals.',
        });
      }

      return {
        proposals: proposals || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    }),

  /**
   * Get proposal statistics
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const supabase = requireAdminSupabase(ctx);

    const [
      { count: totalProposals },
      { count: pendingProposals },
      { count: acceptedProposals },
      { count: rejectedProposals },
    ] = await Promise.all([
      supabase.from('Proposal').select('*', { count: 'exact', head: true }),
      supabase
        .from('Proposal')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      supabase
        .from('Proposal')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACCEPTED'),
      supabase
        .from('Proposal')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'REJECTED'),
    ]);

    return {
      totalProposals: totalProposals || 0,
      pendingProposals: pendingProposals || 0,
      acceptedProposals: acceptedProposals || 0,
      rejectedProposals: rejectedProposals || 0,
    };
  }),

  /**
   * Get proposal by ID
   */
  getProposalById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data: proposal, error } = await supabase
        .from('Proposal')
        .select(
          `
          *,
          freelancer:User!Proposal_freelancerId_fkey(
            id,
            email,
            Profile(*)
          ),
          job:Job!Proposal_jobId_fkey(
            *,
            client:User!Job_clientId_fkey(
              id,
              email,
              Profile(*)
            )
          )
        `
        )
        .eq('id', input.id)
        .single();

      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found.',
        });
      }

      return proposal;
    }),

  /**
   * Delete proposal (admin override)
   */
  deleteProposal: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // First get the proposal to log the deletion
      const { data: proposal } = await supabase
        .from('Proposal')
        .select('*, freelancer:User!Proposal_freelancerId_fkey(email)')
        .eq('id', input.id)
        .single();

      // Delete the proposal
      const { error } = await supabase
        .from('Proposal')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete proposal.',
        });
      }

      // Log the deletion
      if (proposal) {
        await supabase.from('AuditLog').insert({
          id: crypto.randomUUID(),
          action: 'DELETE_PROPOSAL',
          entityType: 'PROPOSAL',
          entityId: input.id,
          userId: ctx.session?.user?.id || null,
          metadata: {
            reason: input.reason,
            freelancerId: proposal.freelancerId,
            jobId: proposal.jobId,
          },
          createdAt: new Date().toISOString(),
        });
      }

      return { success: true };
    }),

  /**
   * Get proposals by freelancer
   */
  getProposalsByFreelancer: adminProcedure
    .input(z.object({ freelancerId: z.string(), limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      const { data: proposals, error } = await supabase
        .from('Proposal')
        .select(
          `
          *,
          job:Job!Proposal_jobId_fkey(id, title, budget)
        `
        )
        .eq('freelancerId', input.freelancerId)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch proposals by freelancer.',
        });
      }

      return proposals || [];
    }),

  /**
   * Accept a proposal (admin action)
   */
  acceptProposal: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Update proposal status
      const { data: proposal, error } = await supabase
        .from('Proposal')
        .update({ status: 'ACCEPTED', updatedAt: new Date().toISOString() })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to accept proposal.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        id: crypto.randomUUID(),
        action: 'ACCEPT_PROPOSAL',
        entityType: 'PROPOSAL',
        entityId: input.id,
        userId: ctx.session?.user?.id || null,
        metadata: {
          proposalId: input.id,
        },
        createdAt: new Date().toISOString(),
      });

      return proposal;
    }),

  /**
   * Reject a proposal (admin action)
   */
  rejectProposal: adminProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Update proposal status
      const { data: proposal, error } = await supabase
        .from('Proposal')
        .update({ status: 'REJECTED', updatedAt: new Date().toISOString() })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject proposal.',
        });
      }

      // Log the action
      await supabase.from('AuditLog').insert({
        id: crypto.randomUUID(),
        action: 'REJECT_PROPOSAL',
        entityType: 'PROPOSAL',
        entityId: input.id,
        userId: ctx.session?.user?.id || null,
        metadata: {
          proposalId: input.id,
          reason: input.reason,
        },
        createdAt: new Date().toISOString(),
      });

      return proposal;
    }),
});
