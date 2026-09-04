/**
 * Proposals Router - Migrated to Supabase
 * Handles all proposal-related operations using Supabase database
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { canUserPerformAction, consumeApplicationToken } from '@/lib/feature-enforcement';
import { createClient } from '@/lib/supabase/server';
import { sendWebhook } from '@/lib/webhooks/delivery';
import { SecureId } from '@/lib/security';
import { emailTemplates } from '@/lib/email-edge';
import { createNotification, createNotificationBatch } from '@/lib/notifications/create-notification';
import { sortProposalsByRank } from '@/lib/proposal-ranking';
import { scanContentForScams } from '@/lib/fraud-detection';
import { createAdminClient } from '@/lib/supabase/server';

export const proposalsRouter = router({
  createProposal: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        coverLetter: z.string(),
        proposedRate: z.number(),
        tokenBid: z.number().int().min(1, 'Token bid must be at least 1'),
        screeningAnswers: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'FREELANCER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only freelancers can submit proposals.',
        });
      }

      const supabase = await createClient();

      // Check if user is verified
      const { data: verification, error: verificationError } = await supabase
        .from('Verification')
        .select('status')
        .eq('userId', ctx.session.user.id)
        .single();

      if (verificationError || !verification || verification.status !== 'APPROVED') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must complete identity verification before applying for jobs. Please visit the Verification page to upload your ID.',
        });
      }

      // Get job details first to check autoScreening
      const { data: job } = await supabase
        .from('Job')
        .select(`
          *,
          client:User!Job_clientId_fkey(
            email,
            Profile(
              firstName,
              lastName,
              companyName
            )
          )
        `)
        .eq('id', input.jobId)
        .single();

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      const jobSlug = job.slug || SecureId.encode(job.id);

      // Prevent duplicate proposals
      const { data: existingProposals, error: existingError } = await supabase
        .from('Proposal')
        .select('id')
        .eq('jobId', input.jobId)
        .eq('freelancerId', ctx.session.user.id)
        .limit(1);

      if (existingError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check for existing proposals',
        });
      }

      if (existingProposals && existingProposals.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You have already applied to this job.',
        });
      }

      // Check subscription limits and permissions
      const canApply = await canUserPerformAction(ctx.session.user.id, 'apply_to_job');
      if (!canApply.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: canApply.reason || 'Cannot apply to job due to subscription limits.',
        });
      }

      // Consume application token using new enforcement system
      const tokenResult = await consumeApplicationToken(ctx.session.user.id, input.tokenBid);
      if (!tokenResult.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient application tokens for this bid. Tokens reset weekly based on your subscription plan.',
        });
      }

      // Create proposal
      const { data: proposal, error: createError} = await supabase
        .from('Proposal')
        .insert({
          id: crypto.randomUUID(),
          jobId: input.jobId,
          coverLetter: input.coverLetter,
          proposedRate: input.proposedRate,
          freelancerId: ctx.session.user.id,
          status: 'PENDING',
          tokenBid: input.tokenBid,
          screeningAnswers: input.screeningAnswers || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !proposal) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create proposal',
        });
      }

      // Scan proposal content for scam patterns
      try {
        const scamCheck = await scanContentForScams(input.coverLetter);
        if (scamCheck.isFlagged) {
          const adminClient = createAdminClient();

          // Create fraud flag for this user
          await adminClient
            .from('FraudFlag')
            .insert({
              userId: ctx.session.user.id,
              flagType: 'SCAM_CONTENT',
              severity: scamCheck.severity,
              reason: scamCheck.reason,
              metadata: JSON.stringify({
                matches: scamCheck.matches,
                proposalId: proposal.id,
                jobId: input.jobId,
              }),
              riskScore: scamCheck.severity,
              status: 'PENDING',
            });

          // Update user trust score
          const { data: user } = await adminClient
            .from('User')
            .select('trustScore')
            .eq('id', ctx.session.user.id)
            .single();

          if (user) {
            const penaltyPoints = scamCheck.severity >= 7 ? 35 : scamCheck.severity >= 5 ? 20 : 10;
            const newTrustScore = Math.max(0, (user.trustScore || 100) - penaltyPoints);

            await adminClient
              .from('User')
              .update({
                trustScore: newTrustScore,
                lastFlaggedAt: new Date().toISOString(),
              })
              .eq('id', ctx.session.user.id);

            // Auto-suspend if trust score drops too low
            if (newTrustScore < 40) {
              await adminClient
                .from('User')
                .update({ isSoftSuspended: true })
                .eq('id', ctx.session.user.id);
            }
          }
        }
      } catch (scanError) {
        // Silent fail for fraud scanning - don't block proposal submission
      }

      // Trigger AI analysis if autoScreening is enabled
      if (job?.autoScreening && input.screeningAnswers && input.screeningAnswers.length > 0) {
        // Import and run AI analysis asynchronously (don't await to avoid blocking)
        import('@/lib/ai/screening-analyzer').then(({ analyzeProposal }) => {
          analyzeProposal(proposal.id, {
            jobTitle: job.title,
            jobDescription: job.description,
            requiredSkills: job.skills || [],
            screeningQuestions: job.screeningQuestions || [],
            coverLetter: proposal.coverLetter,
            screeningAnswers: input.screeningAnswers || [],
          }).catch(error => {
            // Failed to analyze proposal
          });
        }).catch(error => {
          // Failed to load screening analyzer
        });
      }

      // Send webhook notification to client
      if (job) {
        await sendWebhook(job.clientId, 'proposal.submitted', {
          proposal_id: proposal.id,
          freelancer_id: ctx.session.user.id,
          freelancer_name: ctx.session.user.name,
          job: {
            id: job.id,
            title: job.title,
            slug: job.slug,
          },
          proposed_rate: proposal.proposedRate,
          cover_letter: proposal.coverLetter.substring(0, 200),
          created_at: proposal.createdAt,
        });
      }

      // Notify client via in-app notification
      try {
        await createNotification(supabase, {
          userId: job.clientId,
          type: 'PROPOSAL_RECEIVED',
          message: `New proposal submitted for ${job.title}`,
          link: `/jobs/${jobSlug}`,
          read: false,
        });
      } catch (notificationError) {
        // Failed to create notification
      }

      // Send email notification to client
      try {
        const { data: client } = await supabase
          .from('User')
          .select('email, notificationPreferences')
          .eq('id', job.clientId)
          .single();

        if (client) {
          const notificationPrefs = client.notificationPreferences as any;
          const emailNotificationsEnabled = notificationPrefs?.emailNotifications ?? true;
          const newProposalsEnabled = notificationPrefs?.newProposals ?? true;

          // Only send email if client has email notifications enabled for new proposals
          if (emailNotificationsEnabled && newProposalsEnabled) {
            const profileRecord = Array.isArray(job.client?.Profile) ? job.client?.Profile[0] : undefined;
            const freelancerName = ctx.session.user?.name || ctx.session.user.email || 'A freelancer';
            const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://vividcraft.vercel.app';
            await emailTemplates.sendProposalReceivedEmail(
              client.email,
              job.title,
              freelancerName,
              `${appBaseUrl}/jobs/${jobSlug}`
            );
          }
        }
      } catch (emailError) {
        // Failed to send email notification
      }

      return proposal;
    }),

  getProposalsForJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Check if user is the job owner
      const { data: job, error: jobError } = await supabase
        .from('Job')
        .select('clientId')
        .eq('id', input.jobId)
        .single();

      if (jobError || job?.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to view proposals for this job.',
        });
      }

      // Get proposals with freelancer info
      const { data: proposals, error } = await supabase
        .from('Proposal')
        .select(`
          *,
          freelancer:User!Proposal_freelancerId_fkey(
            *,
            Profile(*)
          )
        `)
        .eq('jobId', input.jobId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch proposals',
        });
      }

      // Sort proposals using shared ranking algorithm
      // Priority: Subscription Plan > Token Bid > Submission Time
      return sortProposalsByRank(proposals || []);
    }),

  getProposalsForFreelancer: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== 'FREELANCER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only freelancers can view their proposals.',
      });
    }

    const supabase = await createClient();

    const { data: proposals, error } = await supabase
      .from('Proposal')
      .select(`
        *,
        job:Job!Proposal_jobId_fkey(
          title,
          budget,
          slug
        )
      `)
      .eq('freelancerId', ctx.session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
    }

    return proposals || [];
  }),

  withdrawProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Check if proposal exists and belongs to user
      const { data: proposal, error: fetchError } = await supabase
        .from('Proposal')
        .select('*')
        .eq('id', input.proposalId)
        .single();

      if (fetchError || !proposal || proposal.freelancerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found or you do not have permission to withdraw it.',
        });
      }

      if (proposal.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending proposals can be withdrawn.',
        });
      }

      // Update proposal status
      const { data: updatedProposal, error: updateError } = await supabase
        .from('Proposal')
        .update({
          status: 'WITHDRAWN',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.proposalId)
        .select()
        .single();

      if (updateError || !updatedProposal) {
      }

      return updatedProposal;
    }),

  editProposal: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        coverLetter: z.string().optional(),
        proposedRate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Check if proposal exists and belongs to user
      const { data: proposal, error: fetchError } = await supabase
        .from('Proposal')
        .select('*')
        .eq('id', input.proposalId)
        .single();

      if (fetchError || !proposal || proposal.freelancerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found or you do not have permission to edit it.',
        });
      }

      if (proposal.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending proposals can be edited.',
        });
      }

      // Update proposal
      const updateData: {
        updatedAt: string;
        coverLetter?: string;
        proposedRate?: number;
      } = {
        updatedAt: new Date().toISOString(),
      };

      if (input.coverLetter !== undefined) {
        updateData.coverLetter = input.coverLetter;
      }

      if (input.proposedRate !== undefined) {
        updateData.proposedRate = input.proposedRate;
      }

      const { data: updatedProposal, error: updateError } = await supabase
        .from('Proposal')
        .update(updateData)
        .eq('id', input.proposalId)
        .select()
        .single();

      if (updateError || !updatedProposal) {
      }

      return updatedProposal;
    }),

  acceptProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Get proposal with job and freelancer info
      const { data: proposal, error: fetchError } = await supabase
        .from('Proposal')
        .select(`
          *,
          job:Job!Proposal_jobId_fkey(
            id,
            title,
            clientId,
            slug
          ),
          freelancer:User!Proposal_freelancerId_fkey(
            email,
            Profile(
              firstName,
              lastName
            )
          )
        `)
        .eq('id', input.proposalId)
        .single();

      if (fetchError || !proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found.',
        });
      }

      // Check authorization - must be job owner
      const job = Array.isArray(proposal.job) ? proposal.job[0] : proposal.job;
      if (!job || job.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to accept this proposal.',
        });
      }

      if (proposal.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This proposal is not pending and cannot be accepted.',
        });
      }

      // Update proposal status
      const { data: updatedProposal, error: updateError } = await supabase
        .from('Proposal')
        .update({
          status: 'ACCEPTED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.proposalId)
        .select()
        .single();

      if (updateError || !updatedProposal) {
      }

      // Automatically close the job since a candidate has been accepted
      const { error: jobUpdateError } = await supabase
        .from('Job')
        .update({
          status: 'CLOSED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (jobUpdateError) {
      }

      // Create contract when proposal is accepted
      try {
        const { data: contract, error: contractError } = await supabase
          .from('Contract')
          .insert({
            id: crypto.randomUUID(),
            jobId: job.id,
            clientId: ctx.session.user.id,
            freelancerId: updatedProposal.freelancerId,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (contractError) {
          // Failed to create contract
        } else if (contract) {
          await sendWebhook(updatedProposal.freelancerId, 'contract.signed', {
            contract_id: contract.id,
            job_id: job.id,
            job_title: job.title,
            client: {
              id: ctx.session.user.id,
              name: ctx.session.user.name || ctx.session.user.email || 'Client',
            },
            signed_at: contract.createdAt,
            status: contract.status,
          });

          // Send in-app notifications for contract
          await createNotificationBatch(supabase, [
            {
              userId: updatedProposal.freelancerId,
              type: 'CONTRACT_STARTED',
              message: `Contract signed for "${job.title}"`,
              read: false,
            },
            {
              userId: ctx.session.user.id,
              type: 'CONTRACT_STARTED',
              message: `Contract signed for "${job.title}"`,
              read: false,
            },
          ]);
        }
      } catch (error) {
        // Failed to create contract
      }

      // Send in-app notification to freelancer
      try {
        await createNotification(supabase, {
          userId: updatedProposal.freelancerId,
          type: 'CONTRACT_STARTED', // Using CONTRACT_STARTED since proposal accepted leads to contract
          message: `Your proposal for "${job.title}" has been accepted!`,
          link: `/jobs/${job.slug || SecureId.encode(job.id)}`,
          read: false,
        });
      } catch (notificationError) {
        // Failed to create notification
      }

      // Send email notification to freelancer
      try {
        const { data: freelancer } = await supabase
          .from('User')
          .select('email, notificationPreferences, Profile(firstName)')
          .eq('id', updatedProposal.freelancerId)
          .single();

        if (freelancer) {
          const notificationPrefs = freelancer.notificationPreferences as any;
          const emailNotificationsEnabled = notificationPrefs?.emailNotifications ?? true;
          const proposalUpdatesEnabled = notificationPrefs?.proposalUpdates ?? true;

          // Only send email if freelancer has email notifications enabled for proposal updates
          if (emailNotificationsEnabled && proposalUpdatesEnabled) {
            const profileRecord = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
            const clientName = ctx.session.user?.name || ctx.session.user.email || 'A client';
            const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://vividcraft.vercel.app';
            await emailTemplates.sendProposalAcceptedEmail(
              freelancer.email,
              job.title,
              clientName,
              `${appBaseUrl}/jobs/${job.slug || SecureId.encode(job.id)}`
            );
          }
        }
      } catch (emailError) {
        // Failed to send email notification
      }

      return updatedProposal;
    }),

  declineProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Get proposal with job info
      const { data: proposal, error: fetchError } = await supabase
        .from('Proposal')
        .select(`
          *,
          job:Job!Proposal_jobId_fkey(
            id,
            title,
            clientId
          )
        `)
        .eq('id', input.proposalId)
        .single();

      if (fetchError || !proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found.',
        });
      }

      // Check authorization - must be job owner
      const job = Array.isArray(proposal.job) ? proposal.job[0] : proposal.job;
      if (!job || job.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to decline this proposal.',
        });
      }

      if (proposal.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This proposal is not pending and cannot be declined.',
        });
      }

      // Update proposal status
      const { data: updatedProposal, error: updateError } = await supabase
        .from('Proposal')
        .update({
          status: 'REJECTED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.proposalId)
        .select()
        .single();

      if (updateError || !updatedProposal) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to decline proposal',
        });
      }

      // Send webhook notification to freelancer
      await sendWebhook(updatedProposal.freelancerId, 'proposal.rejected', {
        proposal_id: updatedProposal.id,
        job: {
          id: job.id,
          title: job.title,
        },
        rejected_at: updatedProposal.updatedAt,
      });

      return updatedProposal;
    }),
});
