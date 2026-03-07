/**
 * Contracts Router - Supabase Implementation
 * Handles contract lifecycle management with webhook notifications
 */

import crypto from 'crypto';
import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendWebhook } from '@/lib/webhooks/delivery';
import { createNotificationBatch } from '@/lib/notifications/create-notification';

export const contractsRouter = router({
  /**
   * List all contracts for the authenticated user
   * Returns contracts where user is either client or freelancer
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['ACTIVE', 'COMPLETED', 'TERMINATED']).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view contracts.',
        });
      }

      const supabase = await createClient();

      let query = supabase
        .from('Contract')
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          ),
          freelancer:User!Contract_freelancerId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          )
        `)
        .or(`clientId.eq.${ctx.session.user.id},freelancerId.eq.${ctx.session.user.id}`)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data: contracts, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch contracts.',
        });
      }

      return contracts || [];
    }),

  /**
   * Get a single contract by ID
   */
  getById: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view contract details.',
        });
      }

      const supabase = await createClient();

      const { data: contract, error } = await supabase
        .from('Contract')
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          ),
          freelancer:User!Contract_freelancerId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          )
        `)
        .eq('id', input.contractId)
        .single();

      if (error || !contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found.',
        });
      }

      // Verify user has access to this contract
      const isClient = contract.clientId === ctx.session.user.id;
      const isFreelancer = contract.freelancerId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isClient && !isFreelancer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this contract.',
        });
      }

      return contract;
    }),

  /**
   * Create a new contract
   * Triggers contract.signed webhook event
   */
  create: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        freelancerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create contracts.',
        });
      }

      const supabase = await createClient();
      // Use admin client for User table queries
      const adminSupabase = createAdminClient();

      // Verify the job belongs to the client
      const { data: job, error: jobError } = await supabase
        .from('Job')
        .select('*')
        .eq('id', input.jobId)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (jobError || !job) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Job not found or you do not have permission to create contracts for this job.',
        });
      }

      // Check if a contract already exists for this job
      const { data: existingContract } = await supabase
        .from('Contract')
        .select('id')
        .eq('jobId', input.jobId)
        .single();

      if (existingContract) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A contract already exists for this job.',
        });
      }

      // Get freelancer details using admin client
      const { data: freelancer } = await adminSupabase
        .from('User')
        .select('*, profile:Profile(*)')
        .eq('id', input.freelancerId)
        .single();

      // Create contract with ACTIVE status (signed)
      const { data: contract, error: createError } = await supabase
        .from('Contract')
        .insert({
          id: crypto.randomUUID(),
          jobId: input.jobId,
          clientId: ctx.session.user.id,
          freelancerId: input.freelancerId,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(*),
          freelancer:User!Contract_freelancerId_fkey(*)
        `)
        .single();

      if (createError || !contract) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create contract.',
        });
      }

      // Send notifications
      await createNotificationBatch(supabase, [
        {
          userId: contract.freelancerId,
          type: 'CONTRACT_STARTED',
          message: `Contract signed for "${job.title}"`,
          read: false,
        },
        {
          userId: contract.clientId,
          type: 'CONTRACT_STARTED',
          message: `Contract signed for "${job.title}"`,
          read: false,
        },
      ]);

      // Send webhook events to both parties
      const freelancerProfile = Array.isArray(freelancer?.profile)
        ? freelancer.profile[0]
        : freelancer?.profile;
      const clientProfile = Array.isArray(contract.client?.profile)
        ? contract.client.profile[0]
        : contract.client?.profile;

      await sendWebhook(contract.clientId, 'contract.signed', {
        contract_id: contract.id,
        job_id: contract.jobId,
        job_title: job.title,
        freelancer: {
          id: contract.freelancerId,
          name: freelancerProfile
            ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`.trim()
            : freelancer?.email || 'Freelancer',
        },
        signed_at: contract.createdAt,
        status: contract.status,
      });

      await sendWebhook(contract.freelancerId, 'contract.signed', {
        contract_id: contract.id,
        job_id: contract.jobId,
        job_title: job.title,
        client: {
          id: contract.clientId,
          name: clientProfile
            ? `${clientProfile.firstName} ${clientProfile.lastName}`.trim()
            : contract.client?.email || 'Client',
        },
        signed_at: contract.createdAt,
        status: contract.status,
      });

      return contract;
    }),

  /**
   * Update contract status (ACTIVE -> COMPLETED or TERMINATED)
   * Triggers appropriate webhook events
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        status: z.enum(['COMPLETED', 'TERMINATED']),
        reason: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to update contracts.',
        });
      }

      const supabase = await createClient();

      // Get contract with related data
      const { data: contract, error: contractError } = await supabase
        .from('Contract')
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(*, profile:Profile(*)),
          freelancer:User!Contract_freelancerId_fkey(*, profile:Profile(*))
        `)
        .eq('id', input.contractId)
        .single();

      if (contractError || !contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contract not found.',
        });
      }

      // Verify permissions
      const isClient = contract.clientId === ctx.session.user.id;
      const isFreelancer = contract.freelancerId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isClient && !isFreelancer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this contract.',
        });
      }

      // Validate status transition
      if (contract.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot change status from ${contract.status}. Only ACTIVE contracts can be updated.`,
        });
      }

      // Update contract status
      const { data: updatedContract, error: updateError } = await supabase
        .from('Contract')
        .update({
          status: input.status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.contractId)
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(*, profile:Profile(*)),
          freelancer:User!Contract_freelancerId_fkey(*, profile:Profile(*))
        `)
        .single();

      if (updateError || !updatedContract) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update contract status.',
        });
      }

      const job = Array.isArray(updatedContract.job)
        ? updatedContract.job[0]
        : updatedContract.job;
      const client = Array.isArray(updatedContract.client)
        ? updatedContract.client[0]
        : updatedContract.client;
      const freelancer = Array.isArray(updatedContract.freelancer)
        ? updatedContract.freelancer[0]
        : updatedContract.freelancer;

      const clientProfile = Array.isArray(client?.profile)
        ? client.profile[0]
        : client?.profile;
      const freelancerProfile = Array.isArray(freelancer?.profile)
        ? freelancer.profile[0]
        : freelancer?.profile;

      // Send notifications
      const notificationType = input.status === 'COMPLETED'
        ? 'MILESTONE_COMPLETED'
        : 'CONTRACT_STARTED';
      const message = input.status === 'COMPLETED'
        ? `Contract completed for "${job?.title}"`
        : `Contract terminated for "${job?.title}"${input.reason ? `: ${input.reason}` : ''}`;

      await createNotificationBatch(supabase, [
        {
          userId: updatedContract.freelancerId,
          type: notificationType,
          message,
          read: false,
        },
        {
          userId: updatedContract.clientId,
          type: notificationType,
          message,
          read: false,
        },
      ]);

      // Send appropriate webhook event
      const webhookEvent = input.status === 'COMPLETED' ? 'contract.completed' : 'contract.terminated';
      const webhookData = {
        contract_id: updatedContract.id,
        job_id: updatedContract.jobId,
        job_title: job?.title || 'Job',
        status: updatedContract.status,
        updated_at: updatedContract.updatedAt,
        ...(input.reason && { reason: input.reason }),
      };

      // Send to client
      await sendWebhook(updatedContract.clientId, webhookEvent, {
        ...webhookData,
        freelancer: {
          id: updatedContract.freelancerId,
          name: freelancerProfile
            ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`.trim()
            : freelancer?.email || 'Freelancer',
        },
      });

      // Send to freelancer
      await sendWebhook(updatedContract.freelancerId, webhookEvent, {
        ...webhookData,
        client: {
          id: updatedContract.clientId,
          name: clientProfile
            ? `${clientProfile.firstName} ${clientProfile.lastName}`.trim()
            : client?.email || 'Client',
        },
      });

      return updatedContract;
    }),

  /**
   * Get contracts by job ID
   */
  getByJobId: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to view contracts.',
        });
      }

      const supabase = await createClient();

      const { data: contract, error } = await supabase
        .from('Contract')
        .select(`
          *,
          job:Job!Contract_jobId_fkey(*),
          client:User!Contract_clientId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          ),
          freelancer:User!Contract_freelancerId_fkey(
            id,
            email,
            profile:Profile(firstName, lastName, profilePicture)
          )
        `)
        .eq('jobId', input.jobId)
        .single();

      if (error || !contract) {
        return null;
      }

      // Verify user has access
      const isClient = contract.clientId === ctx.session.user.id;
      const isFreelancer = contract.freelancerId === ctx.session.user.id;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isClient && !isFreelancer && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this contract.',
        });
      }

      return contract;
    }),
});
