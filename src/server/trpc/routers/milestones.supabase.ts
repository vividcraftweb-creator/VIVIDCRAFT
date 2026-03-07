/**
 * Milestones Router - Migrated to Supabase
 * Handles all milestone-related operations using Supabase database
 */

import crypto from 'crypto';
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';
import { sendWebhook } from '@/lib/webhooks/delivery';
import { createNotification } from '@/lib/notifications/create-notification';

// Define valid milestone status transitions
type MilestoneStatusType = 'PENDING' | 'FUNDED' | 'SUBMITTED' | 'APPROVED' | 'CANCELED';

export const milestonesRouter = router({
  createMilestone: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(1000),
        amount: z.number().positive(),
        deadline: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create milestones.',
        });
      }

      const supabase = await createClient();

      // Verify user is the client for this contract
      const { data: contract, error: contractError } = await supabase
        .from('Contract')
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*)
        `)
        .eq('id', input.contractId)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (contractError || !contract) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only create milestones for your own contracts.',
        });
      }

      // Validate deadline is in the future
      if (input.deadline <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Milestone deadline must be in the future.',
        });
      }

      // Create milestone
      const { data: milestone, error: createError } = await supabase
        .from('Milestone')
        .insert({
          id: crypto.randomUUID(),
          contractId: input.contractId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          deadline: input.deadline.toISOString(),
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select(`
          *,
          contract:Contract!Milestone_contractId_fkey(
            *,
            job:Job!Contract_jobId_fkey(*),
            client:User!Contract_clientId_fkey(*),
            freelancer:User!Contract_freelancerId_fkey(*)
          )
        `)
        .single();

      if (createError || !milestone) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create milestone',
        });
      }

      return milestone;
    }),

  getMilestonesForContract: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view milestones.',
        });
      }

      const supabase = await createClient();

      // Verify user is part of this contract (client or freelancer)
      const { data: contract, error: contractError } = await supabase
        .from('Contract')
        .select('*')
        .eq('id', input.contractId)
        .or(`clientId.eq.${ctx.session.user.id},freelancerId.eq.${ctx.session.user.id}`)
        .single();

      if (contractError || !contract) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only view milestones for contracts you are part of.',
        });
      }

      // Get milestones
      const { data: milestones, error } = await supabase
        .from('Milestone')
        .select('*')
        .eq('contractId', input.contractId)
        .order('createdAt', { ascending: true });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch milestones',
        });
      }

      return milestones || [];
    }),

  updateMilestoneStatus: protectedProcedure
    .input(
      z.object({
        milestoneId: z.string(),
        status: z.enum(['PENDING', 'FUNDED', 'SUBMITTED', 'APPROVED', 'CANCELED']),
        submissionNote: z.string().max(5000).optional(),
        submissionFiles: z
          .array(
            z.object({
              name: z.string().min(1),
              url: z.string().url(),
            })
          )
          .optional(),
        approvalNote: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to update milestone status.',
        });
      }

      const supabase = await createClient();

      // Get milestone with contract details
      const { data: milestone, error: milestoneError } = await supabase
        .from('Milestone')
        .select(`
          *,
          contract:Contract!Milestone_contractId_fkey(
            *,
            client:User!Contract_clientId_fkey(*),
            freelancer:User!Contract_freelancerId_fkey(*)
          )
        `)
        .eq('id', input.milestoneId)
        .single();

      if (milestoneError || !milestone) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found.',
        });
      }

      const contract = Array.isArray(milestone.contract) ? milestone.contract[0] : milestone.contract;

      // Validate permissions
      const userRole = ctx.session.user.role;
      const isClient = contract.clientId === ctx.session.user.id;
      const isFreelancer = contract.freelancerId === ctx.session.user.id;

      if (!isClient && !isFreelancer && userRole !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this milestone.',
        });
      }

      // Validate status transitions
      const currentStatus = milestone.status as MilestoneStatusType;
      const newStatus = input.status as MilestoneStatusType;

      const validTransitions: Record<MilestoneStatusType, MilestoneStatusType[]> = {
        PENDING: ['FUNDED', 'CANCELED'],
        FUNDED: ['SUBMITTED', 'CANCELED'],
        SUBMITTED: ['APPROVED', 'FUNDED'],
        APPROVED: [],
        CANCELED: [],
      };

      if (!validTransitions[currentStatus].includes(newStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid status transition from ${currentStatus} to ${newStatus}.`,
        });
      }

      // Validate role-based permissions for transitions
      if (newStatus === 'FUNDED' && !isClient && userRole !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can fund milestones.',
        });
      }

      if (newStatus === 'SUBMITTED' && !isFreelancer && userRole !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only freelancers can submit completed work.',
        });
      }

      if (newStatus === 'APPROVED' && !isClient && userRole !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can approve milestones.',
        });
      }

      const nowIso = new Date().toISOString();

      const updatePayload: Record<string, unknown> = {
        status: input.status,
        updatedAt: nowIso,
      };

      if (newStatus === 'FUNDED') {
        if (!milestone.fundedAt) {
          updatePayload.fundedAt = nowIso;
        }
        if (currentStatus === 'SUBMITTED') {
          updatePayload.submittedAt = null;
          updatePayload.submissionNote = null;
          updatePayload.submissionFiles = [];
        }
        updatePayload.approvedAt = null;
        updatePayload.approvalNote = null;
      }

      if (newStatus === 'SUBMITTED') {
        const submissionNote = input.submissionNote?.trim();
        if (!submissionNote) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Submission note is required when submitting work.',
          });
        }
        updatePayload.submittedAt = nowIso;
        updatePayload.submissionNote = submissionNote;
        updatePayload.submissionFiles = input.submissionFiles ?? [];
      }

      if (newStatus === 'APPROVED') {
        updatePayload.approvedAt = nowIso;
        updatePayload.approvalNote = input.approvalNote ?? null;
      }

      if (newStatus === 'CANCELED') {
        updatePayload.approvalNote = null;
      }

      // Update milestone status
      const { data: updatedMilestone, error: updateError } = await supabase
        .from('Milestone')
        .update(updatePayload)
        .eq('id', input.milestoneId)
        .select(`
          *,
          contract:Contract!Milestone_contractId_fkey(*)
        `)
        .single();

      if (updateError || !updatedMilestone) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update milestone status',
        });
      }

      // Notifications for key state changes
      if (newStatus === 'FUNDED') {
        await createNotification(supabase, {
          userId: contract.freelancerId,
          type: 'MILESTONE_FUNDED',
          message: `Milestone "${milestone.title}" is now in progress.`,
          read: false,
        });
      } else if (newStatus === 'SUBMITTED') {
        await createNotification(supabase, {
          userId: contract.clientId,
          type: 'MILESTONE_SUBMITTED',
          message: `Milestone "${milestone.title}" has been submitted for approval.`,
          read: false,
        });
      } else if (newStatus === 'APPROVED') {
        await createNotification(supabase, {
          userId: contract.freelancerId,
          type: 'MILESTONE_COMPLETED',
          message: `Milestone "${milestone.title}" has been approved. Coordinate payment with your client directly.`,
          read: false,
        });
      }

      // Send webhook notifications for milestone status changes
      const client = Array.isArray(contract.client) ? contract.client[0] : contract.client;
      const freelancer = Array.isArray(contract.freelancer) ? contract.freelancer[0] : contract.freelancer;

      if (newStatus === 'APPROVED') {
        // Notify both client and freelancer
        await sendWebhook(contract.clientId, 'milestone.completed', {
          milestone_id: updatedMilestone.id,
          title: updatedMilestone.title,
          amount: updatedMilestone.amount,
          contract_id: contract.id,
          freelancer: {
            id: contract.freelancerId,
            name: freelancer?.name || 'Freelancer',
          },
          approved_at: updatedMilestone.approvedAt,
          approval_note: updatedMilestone.approvalNote,
          payment_handled_externally: true,
        });

        await sendWebhook(contract.freelancerId, 'milestone.completed', {
          milestone_id: updatedMilestone.id,
          title: updatedMilestone.title,
          amount: updatedMilestone.amount,
          contract_id: contract.id,
          client: {
            id: contract.clientId,
            name: client?.name || 'Client',
          },
          approved_at: updatedMilestone.approvedAt,
          payment_handled_externally: true,
        });

        // Send payment.released webhook to both parties
        await sendWebhook(contract.clientId, 'payment.released', {
          milestone_id: updatedMilestone.id,
          milestone_title: updatedMilestone.title,
          amount: updatedMilestone.amount,
          contract_id: contract.id,
          freelancer: {
            id: contract.freelancerId,
            name: freelancer?.name || 'Freelancer',
          },
          released_at: updatedMilestone.approvedAt || new Date().toISOString(),
          payment_method: 'milestone_approval',
        });

        await sendWebhook(contract.freelancerId, 'payment.released', {
          milestone_id: updatedMilestone.id,
          milestone_title: updatedMilestone.title,
          amount: updatedMilestone.amount,
          contract_id: contract.id,
          client: {
            id: contract.clientId,
            name: client?.name || 'Client',
          },
          released_at: updatedMilestone.approvedAt || new Date().toISOString(),
          payment_method: 'milestone_approval',
        });
      }

      return updatedMilestone;
    }),

  getMilestoneById: protectedProcedure
    .input(z.object({ milestoneId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view milestone details.',
        });
      }

      const supabase = await createClient();

      const { data: milestone, error } = await supabase
        .from('Milestone')
        .select(`
          *,
          contract:Contract!Milestone_contractId_fkey(
            *,
            job:Job!Contract_jobId_fkey(*),
            client:User!Contract_clientId_fkey(*),
            freelancer:User!Contract_freelancerId_fkey(*)
          )
        `)
        .eq('id', input.milestoneId)
        .single();

      if (error || !milestone) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found.',
        });
      }

      const contract = Array.isArray(milestone.contract) ? milestone.contract[0] : milestone.contract;

      // Verify user has access to this milestone
      const isClient = contract.clientId === ctx.session.user.id;
      const isFreelancer = contract.freelancerId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isClient && !isFreelancer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this milestone.',
        });
      }

      return milestone;
    }),
});
