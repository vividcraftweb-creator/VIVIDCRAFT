import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';
import { getPlanWeight } from '@/lib/proposal-ranking';
import crypto from 'crypto';

// Helper function to check if user has access to proposal tracking (Business/Enterprise only)
async function requireProposalTrackingAccess(userId: string) {
  const permissions = await getUserFeaturePermissions(userId);
  // CRM is available to Business and Enterprise plans (both have team collaboration)
  if (!permissions.hasTeamCollaboration) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Proposal Tracking CRM requires Business or Enterprise plan',
    });
  }
  return permissions;
}

export const proposalTrackingRouter = router({
  // List all tracked proposals for the current client
  list: protectedProcedure
    .input(
      z.object({
        jobId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      let query = supabase
        .from('ProposalTracking')
        .select(`
          *,
          proposal:Proposal(*),
          freelancer:User!ProposalTracking_freelancerId_fkey(
            id,
            email,
            subscriptionPlan,
            profile:Profile(*)
          ),
          job:Job(id, title, slug)
        `)
        .eq('clientId', ctx.session.user.id)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (input.jobId) {
        query = query.eq('jobId', input.jobId);
      }

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data: tracked, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch proposal tracking data',
        });
      }

      // Sort tracked proposals using shared ranking algorithm
      // Priority: Subscription Plan > Token Bid > Submission Time
      // Note: ProposalTracking has nested proposal/freelancer structure
      return (tracked || []).sort((a, b) => {
        const premiumDiff =
          getPlanWeight(b.freelancer?.subscriptionPlan) - getPlanWeight(a.freelancer?.subscriptionPlan);
        if (premiumDiff !== 0) {
          return premiumDiff;
        }
        const bidA = a.proposal?.tokenBid ?? 0;
        const bidB = b.proposal?.tokenBid ?? 0;
        if (bidB !== bidA) {
          return bidB - bidA;
        }
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    }),

  // Get a single tracked proposal by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: tracked, error } = await supabase
        .from('ProposalTracking')
        .select(`
          *,
          proposal:Proposal(*),
          freelancer:User!ProposalTracking_freelancerId_fkey(
            id,
            email,
            subscriptionPlan,
            profile:Profile(*)
          ),
          job:Job(id, title, slug)
        `)
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (error || !tracked) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tracked proposal not found',
        });
      }

      return tracked;
    }),

  // Create or update tracking for a proposal
  upsert: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        status: z.enum([
          'new',
          'contacted',
          'interview_scheduled',
          'interview_completed',
          'offer_sent',
          'accepted',
          'rejected',
          'withdrawn',
        ]).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        rating: z.number().min(1).max(5).optional(),
        contactedAt: z.string().optional(),
        interviewScheduledFor: z.string().optional(),
        interviewCompletedAt: z.string().optional(),
        offerSentAt: z.string().optional(),
        responseDeadline: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      // First, get the proposal to verify ownership and get details
      const { data: proposal, error: proposalError } = await supabase
        .from('Proposal')
        .select('*, job:Job(*)')
        .eq('id', input.proposalId)
        .single();

      if (proposalError || !proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      // Verify the client owns the job
      if (proposal.job.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to track this proposal',
        });
      }

      // Check if tracking already exists
      const { data: existing } = await supabase
        .from('ProposalTracking')
        .select('*')
        .eq('proposalId', input.proposalId)
        .single();

      const trackingData = {
        clientId: ctx.session.user.id,
        proposalId: input.proposalId,
        freelancerId: proposal.freelancerId,
        jobId: proposal.jobId,
        status: input.status,
        notes: input.notes,
        tags: input.tags,
        rating: input.rating,
        contactedAt: input.contactedAt,
        interviewScheduledFor: input.interviewScheduledFor,
        interviewCompletedAt: input.interviewCompletedAt,
        offerSentAt: input.offerSentAt,
        responseDeadline: input.responseDeadline,
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        // Update existing tracking
        const { data: updated, error: updateError } = await supabase
          .from('ProposalTracking')
          .update(trackingData)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
        }

        // Log activity if status changed
        if (input.status && input.status !== existing.status) {
          await supabase.from('ProposalTrackingActivity').insert({
            id: crypto.randomUUID(),
            trackingId: existing.id,
            action: 'status_changed',
            description: `Status changed from ${existing.status} to ${input.status}`,
            metadata: { oldStatus: existing.status, newStatus: input.status },
            createdBy: ctx.session.user.id,
            createdAt: new Date().toISOString(),
          });
        }

        return updated;
      } else {
        // Create new tracking
        const { data: created, error: createError } = await supabase
          .from('ProposalTracking')
          .insert({
            id: crypto.randomUUID(),
            ...trackingData,
            createdAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
        }

        // Log activity
        await supabase.from('ProposalTrackingActivity').insert({
          id: crypto.randomUUID(),
          trackingId: created.id,
          action: 'tracking_created',
          description: 'Started tracking this proposal',
          metadata: { status: trackingData.status || 'new' },
          createdBy: ctx.session.user.id,
          createdAt: new Date().toISOString(),
        });

        return created;
      }
    }),

  // Update status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          'new',
          'contacted',
          'interview_scheduled',
          'interview_completed',
          'offer_sent',
          'accepted',
          'rejected',
          'withdrawn',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('ProposalTracking')
        .select('*')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tracked proposal not found',
        });
      }

      // Update status
      const { data: updated, error: updateError } = await supabase
        .from('ProposalTracking')
        .update({
          status: input.status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update status',
        });
      }

      // Log activity
      await supabase.from('ProposalTrackingActivity').insert({
        id: crypto.randomUUID(),
        trackingId: input.id,
        action: 'status_changed',
        description: `Status changed from ${existing.status} to ${input.status}`,
        metadata: { oldStatus: existing.status, newStatus: input.status },
        createdBy: ctx.session.user.id,
        createdAt: new Date().toISOString(),
      });

      return updated;
    }),

  // Add note
  addNote: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('ProposalTracking')
        .select('*')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tracked proposal not found',
        });
      }

      // Update notes
      const currentNotes = existing.notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${input.note}`;
      const updatedNotes = currentNotes
        ? `${currentNotes}\n\n${newNote}`
        : newNote;

      const { error: updateError } = await supabase
        .from('ProposalTracking')
        .update({
          notes: updatedNotes,
          updatedAt: timestamp,
        })
        .eq('id', input.id);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add note',
        });
      }

      // Log activity
      await supabase.from('ProposalTrackingActivity').insert({
        id: crypto.randomUUID(),
        trackingId: input.id,
        action: 'note_added',
        description: `Added note: ${input.note.substring(0, 100)}${input.note.length > 100 ? '...' : ''}`,
        metadata: { note: input.note },
        createdBy: ctx.session.user.id,
        createdAt: timestamp,
      });

      return { success: true };
    }),

  // Update tags
  updateTags: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('ProposalTracking')
        .select('*')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tracked proposal not found',
        });
      }

      const { error: updateError } = await supabase
        .from('ProposalTracking')
        .update({
          tags: input.tags,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update tags',
        });
      }

      return { success: true };
    }),

  // Get activity log
  getActivity: protectedProcedure
    .input(
      z.object({
        trackingId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProposalTrackingAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership of the tracking record
      const { data: tracking, error: trackingError } = await supabase
        .from('ProposalTracking')
        .select('id')
        .eq('id', input.trackingId)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (trackingError || !tracking) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tracked proposal not found',
        });
      }

      const { data: activity, error } = await supabase
        .from('ProposalTrackingActivity')
        .select('*')
        .eq('trackingId', input.trackingId)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch activity',
        });
      }

      return activity || [];
    }),

  // Get statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    await requireProposalTrackingAccess(ctx.session.user.id);
    const supabase = await createClient();

    const { data: tracked, error } = await supabase
      .from('ProposalTracking')
      .select('status')
      .eq('clientId', ctx.session.user.id);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch stats',
      });
    }

    const stats = {
      total: tracked?.length || 0,
      new: tracked?.filter((t) => t.status === 'new').length || 0,
      contacted: tracked?.filter((t) => t.status === 'contacted').length || 0,
      interview_scheduled: tracked?.filter((t) => t.status === 'interview_scheduled').length || 0,
      interview_completed: tracked?.filter((t) => t.status === 'interview_completed').length || 0,
      offer_sent: tracked?.filter((t) => t.status === 'offer_sent').length || 0,
      accepted: tracked?.filter((t) => t.status === 'accepted').length || 0,
      rejected: tracked?.filter((t) => t.status === 'rejected').length || 0,
      withdrawn: tracked?.filter((t) => t.status === 'withdrawn').length || 0,
    };

    return stats;
  }),
});
