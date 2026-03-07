/**
 * Interviews Router - Supabase
 * Handles interview scheduling and management
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';
import { sendInterviewInvitation } from '@/lib/email-edge';
import { createNotification } from '@/lib/notifications/create-notification';

export const interviewsRouter = router({
  scheduleInterview: protectedProcedure
    .input(
      z.object({
        freelancerId: z.string(),
        jobId: z.string(),
        proposalId: z.string(),
        platform: z.enum(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'OTHER']),
        scheduledAt: z.string(), // ISO datetime string
        meetingLink: z.string().url(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      // Use admin client for User table queries
      const adminSupabase = createAdminClient();
      const clientId = ctx.session.user.id;

      // Verify the job belongs to the client
      const { data: job, error: jobError } = await supabase
        .from('Job')
        .select('id, title, clientId')
        .eq('id', input.jobId)
        .eq('clientId', clientId)
        .single();

      if (jobError || !job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found or unauthorized',
        });
      }

      // Verify the proposal exists
      const { data: proposal, error: proposalError } = await supabase
        .from('Proposal')
        .select('id, freelancerId, coverLetter')
        .eq('id', input.proposalId)
        .eq('jobId', input.jobId)
        .eq('freelancerId', input.freelancerId)
        .single();

      if (proposalError || !proposal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Proposal not found',
        });
      }

      // Get freelancer details using admin client
      const { data: freelancer, error: freelancerError } = await adminSupabase
        .from('User')
        .select(`
          id,
          email,
          Profile(firstName, lastName)
        `)
        .eq('id', input.freelancerId)
        .single();

      if (freelancerError || !freelancer) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Freelancer not found',
        });
      }

      // Get client details using admin client
      const { data: client, error: clientError } = await adminSupabase
        .from('User')
        .select(`
          id,
          email,
          Profile(firstName, lastName)
        `)
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Create the interview record
      const { data: interview, error: interviewError } = await supabase
        .from('VideoInterview')
        .insert({
          id: crypto.randomUUID(),
          jobId: input.jobId,
          proposalId: input.proposalId,
          clientId,
          freelancerId: input.freelancerId,
          roomUrl: input.meetingLink,
          scheduledAt: input.scheduledAt,
          platform: input.platform,
          notes: input.notes || null,
          status: 'scheduled',
          duration: 30, // Default 30 minutes
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (interviewError || !interview) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create interview',
        });
      }

      // Create notification for freelancer
      await createNotification(supabase, {
        userId: input.freelancerId,
        type: 'INTERVIEW_SCHEDULED',
        message: `Interview scheduled for ${job.title} on ${new Date(input.scheduledAt).toLocaleDateString()}`,
        link: `/dashboard?tab=proposals`,
        read: false,
      });

      // Prepare data for email
      const freelancerProfile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
      const clientProfile = Array.isArray(client.Profile) ? client.Profile[0] : client.Profile;

      const freelancerName = freelancerProfile
        ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
        : freelancer.email;

      const clientName = clientProfile
        ? `${clientProfile.firstName} ${clientProfile.lastName}`
        : client.email;

      // Send interview invitation email with .ics attachment
      try {
        await sendInterviewInvitation(
          freelancer.email,
          job.title,
          input.scheduledAt,
          30,
          input.meetingLink,
          input.platform,
          input.notes
        );
      } catch (emailError) {
        // Don't throw - interview was created successfully
      }

      return interview;
    }),

  getInterviews: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();
    const userId = ctx.session.user.id;

    const { data: interviews, error } = await supabase
      .from('VideoInterview')
      .select(`
        *,
        job:Job(id, title),
        freelancer:User!VideoInterview_freelancerId_fkey(
          id,
          email,
          Profile(firstName, lastName)
        ),
        client:User!VideoInterview_clientId_fkey(
          id,
          email,
          Profile(firstName, lastName)
        )
      `)
      .or(`clientId.eq.${userId},freelancerId.eq.${userId}`)
      .order('scheduledAt', { ascending: true });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch interviews',
      });
    }

    return interviews || [];
  }),

  cancelInterview: protectedProcedure
    .input(z.object({ interviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const userId = ctx.session.user.id;

      // Verify user has access to this interview
      const { data: interview, error: fetchError } = await supabase
        .from('VideoInterview')
        .select('id, clientId, freelancerId, status')
        .eq('id', input.interviewId)
        .single();

      if (fetchError || !interview) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Interview not found',
        });
      }

      if (interview.clientId !== userId && interview.freelancerId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to cancel this interview',
        });
      }

      // Update status to cancelled
      const { data: updated, error: updateError } = await supabase
        .from('VideoInterview')
        .update({ status: 'cancelled' })
        .eq('id', input.interviewId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel interview',
        });
      }

      return updated;
    }),
});
