import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { getRecommendedFreelancers, calculateMatchPercentage } from '@/lib/ai/recommendations';

export const recommendationsRouter = router({
  // Get recommended freelancers for a job
  getForJob: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only clients can get recommendations
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can access freelancer recommendations.',
        });
      }

      try {
        const recommendations = await getRecommendedFreelancers(
          input.jobId,
          ctx.session.user.id,
          input.limit
        );

        return {
          recommendations,
          count: recommendations.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recommendations',
        });
      }
    }),

  // Calculate match percentage for a specific freelancer
  calculateMatch: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        freelancerId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only clients can calculate matches
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can calculate match percentages.',
        });
      }

      try {
        const matchPercentage = await calculateMatchPercentage(
          input.jobId,
          input.freelancerId,
          ctx.session.user.id
        );

        return {
          matchPercentage,
          freelancerId: input.freelancerId,
          jobId: input.jobId,
        };
      } catch (error) {
      }
    }),
});
