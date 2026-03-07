/**
 * Jobs Router - Migrated to Supabase
 * Handles all job-related operations using Supabase database
 */

import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { SecureId, InputSanitizer, RateLimiter } from '@/lib/security';
import { generateSlug, ensureUniqueSlug } from '@/lib/slug';
import { canUserPerformAction, incrementJobPostCount } from '@/lib/feature-enforcement';
import { createClient } from '@/lib/supabase/server';
import { sendWebhook } from '@/lib/webhooks/delivery';
import { ALL_JOB_SKILLS, JOB_CATEGORIES } from '@/constants/job-taxonomy';
import type { Proposal } from '@/types/database.types';
import { createNotification } from '@/lib/notifications/create-notification';
import { requireVerification } from '@/lib/verification-helpers';
import { getSubscriptionPlanInfo } from '@/lib/subscription-plans';
import { sortProposalsByRank } from '@/lib/proposal-ranking';

export const jobsRouter = router({
  getJobs: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        minBudget: z.number().optional(),
        maxBudget: z.number().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Rate limiting for public endpoints
        let clientIp = 'unknown';
        try {
          if (ctx.req?.headers) {
            clientIp = ctx.req.headers.get('x-forwarded-for') || ctx.req.headers.get('x-real-ip') || 'unknown';
          }
        } catch (e) {
          // Ignore IP extraction errors
        }

        const { search, tags, categories, minBudget, maxBudget, page, limit } = input;

        // Sanitize inputs
        const sanitizedSearch = InputSanitizer.sanitizeString(search || '');
        const sanitizedTags = (tags || [])
          .map(tag => InputSanitizer.sanitizeString(tag))
          .filter((tag): tag is string => tag !== null && tag.length > 0);
        const sanitizedCategories = (categories || [])
          .map(cat => InputSanitizer.sanitizeString(cat))
          .filter((cat): cat is string => cat !== null && cat.length > 0);

        const hasMinBudget = typeof minBudget === 'number' && Number.isFinite(minBudget);
        const hasMaxBudget = typeof maxBudget === 'number' && Number.isFinite(maxBudget);
      const sanitizedMinBudget = hasMinBudget
        ? InputSanitizer.sanitizeNumber(minBudget, 0, 1000000)
        : undefined;
      const sanitizedMaxBudget = hasMaxBudget
        ? InputSanitizer.sanitizeNumber(maxBudget, 0, 1000000)
        : undefined;

      // Use createClient which handles cookies properly
      const supabase = await createClient();

      // Build query for open, approved, non-expired jobs
      let query = supabase
        .from('Job')
        .select('id, title, slug, description, budget, deadline, tags, status, createdAt, category, experienceLevel, projectDuration, jobType, paymentType, companyName, hourlyRateMin, hourlyRateMax, priorityPlacement', { count: 'exact' })
        .eq('status', 'OPEN');

      // Filter for non-expired jobs
      query = query.or(`expiresAt.is.null,expiresAt.gt.${new Date().toISOString()}`);

      // Sanitize and add search filter
      if (sanitizedSearch.length > 0) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`);
      }

      if (sanitizedTags.length > 0) {
        // For each tag, use ilike to check if it's in the tags string
        sanitizedTags.forEach(tag => {
          query = query.ilike('tags', `%${tag}%`);
        });
      }

      if (sanitizedCategories.length > 0) {
        query = query.in('category', sanitizedCategories);
      }

      // Add budget filters
      if (sanitizedMinBudget !== undefined) {
        query = query.gte('budget', sanitizedMinBudget);
      }

      if (sanitizedMaxBudget !== undefined) {
        query = query.lte('budget', sanitizedMaxBudget);
      }

      try {
        // Execute query with pagination
        // Note: We need to sort by priority weight for proper ordering (featured > priority > none)
        // For now, fetch all matching jobs and sort in-memory
        // TODO: Optimize with database-level sorting once migration is applied
        const { data: allJobs, error, count } = await query
          .order('createdAt', { ascending: false });

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch jobs',
          });
        }

        // Sort by priority weight: featured (3) > priority (2) > none (1), then by date
        const priorityWeight = (placement: string) => {
          if (placement === 'featured') return 3;
          if (placement === 'priority') return 2;
          return 1;
        };

        const sortedJobs = (allJobs || []).sort((a, b) => {
          const aPriority = (a as any).priorityPlacement || 'none';
          const bPriority = (b as any).priorityPlacement || 'none';
          const weightDiff = priorityWeight(bPriority) - priorityWeight(aPriority);
          if (weightDiff !== 0) return weightDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Apply pagination after sorting
        const jobs = sortedJobs.slice((page - 1) * limit, page * limit);

        // Use real slugs if available, fallback to encoded IDs for compatibility
        const jobsWithSlugs = (jobs || []).map(job => ({
          ...job,
          slug: job.slug || SecureId.encode(job.id),
        }));

        const totalCount = count || 0;

        return {
          jobs: jobsWithSlugs,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: page < Math.ceil(totalCount / limit),
            hasPrev: page > 1,
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch jobs',
        });
      }
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch jobs',
      });
    }
    }),

  getFilterOptions: publicProcedure.query(async () => {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('Job')
        .select('category, tags')
        .eq('status', 'OPEN');

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch filter options',
        });
      }

      const categorySet = new Set<string>();
      const skillSet = new Set<string>();

      JOB_CATEGORIES.forEach((category) => {
        const sanitizedCategory = InputSanitizer.sanitizeString(category);
        if (sanitizedCategory) categorySet.add(sanitizedCategory);
      });

      ALL_JOB_SKILLS.forEach((skill) => {
        const sanitizedSkill = InputSanitizer.sanitizeString(skill);
        if (sanitizedSkill) skillSet.add(sanitizedSkill);
      });

      (data || []).forEach((job) => {
        if (job.category) {
          const sanitizedCategory = InputSanitizer.sanitizeString(job.category);
          if (sanitizedCategory) categorySet.add(sanitizedCategory);
        }

        if (job.tags) {
          const tags: string[] = job.tags
            .split(',')
            .map((tag: string) => InputSanitizer.sanitizeString(tag.trim()))
            .filter((value: string): value is string => Boolean(value));
          tags.forEach((tag: string) => {
            if (tag) skillSet.add(tag);
          });
        }
      });

      const categories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
      const skills = Array.from(skillSet).sort((a, b) => a.localeCompare(b));

      return { categories, skills };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch filter options',
      });
    }
  }),

  getJobBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        // Rate limiting
        const clientIp = ctx.req?.headers.get('x-forwarded-for') || ctx.req?.headers.get('x-real-ip') || 'unknown';
        if (ctx.req && !RateLimiter.checkLimit(`job_${clientIp}`, 30, 60000)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Rate limit exceeded. Please try again later.',
          });
        }

        const supabase = await createClient();
        let job = null;

        // First try to find by slug
        const { data: jobBySlug, error: slugError } = await supabase
          .from('Job')
          .select(`
            *,
            client:User!Job_clientId_fkey(
              id,
              Profile!inner(
                firstName,
                lastName,
                companyName,
                verified
              )
            )
          `)
          .eq('slug', input.slug)
          .single();

        if (!slugError && jobBySlug) {
          job = jobBySlug;
        }

        // If not found by slug, try to decode as legacy encrypted ID and find by ID
        if (!job) {
          try {
            const jobId = SecureId.ensureId(input.slug);
            const { data: jobById, error: idError } = await supabase
              .from('Job')
              .select(`
                *,
                client:User!Job_clientId_fkey(
                  id,
                  Profile!inner(
                    firstName,
                    lastName,
                    companyName,
                    verified
                  )
                )
              `)
              .eq('id', jobId)
              .single();

            if (!idError && jobById) {
              job = jobById;
            }
          } catch {
            // Not a valid encrypted ID, job not found
          }
        }

        if (!job) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found',
          });
        }

        // Only show open jobs to non-owners (unless they're the client)
        const isOwner = ctx.session?.user?.id === job.clientId;
        if (job.status !== 'OPEN' && !isOwner) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found',
          });
        }

        let hasApplied = false;
        if (ctx.session?.user?.role === 'FREELANCER') {
          try {
            const { data: existingProposals, error: existingProposalError } = await supabase
              .from('Proposal')
              .select('id')
              .eq('jobId', job.id)
              .eq('freelancerId', ctx.session.user.id)
              .limit(1);

            if (!existingProposalError && existingProposals && existingProposals.length > 0) {
              hasApplied = true;
            }
          } catch (proposalCheckError) {
            // Ignore proposal check errors
          }
        }

        return {
          ...job,
          hasApplied,
        };
      } catch (error) {
        // Re-throw tRPC errors
        if (error instanceof TRPCError) {
          throw error;
        }
        // Handle other errors
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch job',
        });
      }
    }),

  getJobById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: job, error } = await supabase
        .from('Job')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return job;
    }),

  createJob: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        budget: z.number(),
        deadline: z.date(),
        tags: z.string().optional(),
        // Extended fields
        jobType: z.string().optional(),
        category: z.string().optional(),
        projectGoal: z.string().optional(),
        experienceLevel: z.string().optional(),
        projectSize: z.string().optional(),
        projectDuration: z.string().optional(),
        paymentType: z.string().optional(),
        hourlyRateMin: z.number().optional(),
        hourlyRateMax: z.number().optional(),
        milestones: z.array(z.object({ name: z.string(), amount: z.number() })).optional(),
        companyName: z.string().optional(),
        companyWebsite: z.string().optional(),
        companyLocation: z.string().optional(),
        companyLat: z.number().optional(),
        companyLng: z.number().optional(),
        locationVisibility: z.string().optional(),
        companyLogo: z.string().optional(),
        jobThumbnail: z.string().optional(),
        supportingImages: z.array(z.string()).optional(),
        projectFiles: z.array(z.string()).optional(),
        screeningQuestions: z.array(z.string()).optional(),
        autoScreening: z.boolean().optional(),
        englishLevel: z.string().optional(),
        preferredLocations: z.array(z.string()).optional(),
        projectStage: z.string().optional(),
        availabilityRequirement: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can create jobs.',
        });
      }

      const supabase = await createClient();

      // Check if user has completed verification (documents approved)
      await requireVerification(ctx.session.user.id);

      // Check subscription limits for job posting
      const canPostJob = await canUserPerformAction(ctx.session.user.id, 'post_job');
      if (!canPostJob.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: canPostJob.reason || 'Cannot post job due to subscription limits.',
        });
      }

      // Generate slug from title
      const baseSlug = generateSlug(input.title);

      // Get existing slugs to ensure uniqueness
      const { data: existingJobs } = await supabase
        .from('Job')
        .select('slug')
        .ilike('slug', `${baseSlug}%`);

      const existingSlugs = (existingJobs || []).map(job => job.slug).filter(Boolean) as string[];
      const uniqueSlug = ensureUniqueSlug(baseSlug, existingSlugs);

      // Set job expiration to 30 days from now
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Determine priority placement based on client's subscription plan
      const userSubscriptionPlan = (ctx.session.user as any).subscriptionPlan || 'CLIENT_STARTER';
      const planInfo = getSubscriptionPlanInfo(userSubscriptionPlan);
      const priorityPlacement = planInfo.clientPerks?.priorityPlacement || 'none';

      const { data: job, error: createError } = await supabase
        .from('Job')
        .insert({
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description,
          budget: input.budget,
          deadline: input.deadline.toISOString(),
          tags: input.tags || null,
          slug: uniqueSlug,
          clientId: ctx.session.user.id,
          expiresAt: expiresAt.toISOString(),
          isApproved: true,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Extended fields
          jobType: input.jobType || null,
          category: input.category || null,
          projectGoal: input.projectGoal || null,
          experienceLevel: input.experienceLevel || null,
          projectSize: input.projectSize || null,
          projectDuration: input.projectDuration || null,
          paymentType: input.paymentType || null,
          hourlyRateMin: input.hourlyRateMin || null,
          hourlyRateMax: input.hourlyRateMax || null,
          milestones: input.milestones ? JSON.stringify(input.milestones) : null,
          companyName: input.companyName || null,
          companyWebsite: input.companyWebsite || null,
          companyLocation: input.companyLocation || null,
          companyLat: input.companyLat || null,
          companyLng: input.companyLng || null,
          locationVisibility: input.locationVisibility || 'public',
          companyLogo: input.companyLogo || null,
          jobThumbnail: input.jobThumbnail || null,
          supportingImages: input.supportingImages ? JSON.stringify(input.supportingImages) : null,
          projectFiles: input.projectFiles ? JSON.stringify(input.projectFiles) : null,
          screeningQuestions: input.screeningQuestions ? JSON.stringify(input.screeningQuestions) : null,
          autoScreening: input.autoScreening !== undefined ? input.autoScreening : true,
          englishLevel: input.englishLevel || null,
          preferredLocations: input.preferredLocations ? JSON.stringify(input.preferredLocations) : null,
          projectStage: input.projectStage || null,
          availabilityRequirement: input.availabilityRequirement || null,
          priorityPlacement: priorityPlacement,
        })
        .select()
        .single();

      if (createError || !job) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create job',
        });
      }

      // Increment job post count for user
      await incrementJobPostCount(ctx.session.user.id);

      // Create notification for user
      await supabase
        .from('Notification')
        .insert({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          type: 'PROPOSAL_RECEIVED', // Using existing enum
          message: 'Your job is now live on the marketplace. Keep an eye on incoming proposals!',
          link: `/jobs/${job.slug || job.id}`,
          read: false,
          createdAt: new Date().toISOString(),
        });

      // Send webhook notification
      await sendWebhook(ctx.session.user.id, 'job.created', {
        job_id: job.id,
        title: job.title,
        slug: job.slug,
        budget: job.budget,
        deadline: job.deadline,
        tags: job.tags,
        description: job.description.substring(0, 500),
        status: job.status,
        is_approved: job.isApproved,
        created_at: job.createdAt,
      });

      return job;
    }),

  getJobsForClient: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== 'CLIENT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not authorized to view this page.',
      });
    }

    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from('Job')
      .select(`
        *,
        proposals:Proposal(
          *,
          freelancer:User!Proposal_freelancerId_fkey(
            *,
            Profile(*)
          )
        )
      `)
      .eq('clientId', ctx.session.user.id);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch jobs',
      });
    }

    type ProposalWithFreelancer = Proposal & {
      freelancer?: {
        subscriptionPlan?: string | null;
      } | null;
    };

    return (jobs || []).map((job) => {
      const proposals = (job.proposals || []) as ProposalWithFreelancer[];
      // Sort proposals using shared ranking algorithm
      // Priority: Subscription Plan > Token Bid > Submission Time
      const orderedProposals = sortProposalsByRank(proposals);

      return {
        ...job,
        proposals: orderedProposals,
      };
    });
  }),

  // Get expired jobs for renewal
  getExpiredJobs: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to view this page.',
        });
      }

      const supabase = await createClient();

      const { data: jobs, error } = await supabase
        .from('Job')
        .select('id, title, slug, expiresAt, createdAt, budget, description')
        .eq('clientId', ctx.session.user.id)
        .eq('status', 'PAUSED')
        .lte('expiresAt', new Date().toISOString())
        .order('expiresAt', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch expired jobs',
        });
      }

      return jobs || [];
    }),

  // Check if job can be renewed
  checkJobRenewal: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to perform this action.',
        });
      }

      const supabase = await createClient();

      const { data: job, error } = await supabase
        .from('Job')
        .select('id, clientId, status, expiresAt, title')
        .eq('id', input.jobId)
        .single();

      if (error || !job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found.',
        });
      }

      if (job.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only renew your own jobs.',
        });
      }

      const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
      const isExpired = expiresAt ? expiresAt <= new Date() : false;
      const canRenew = job.status === 'PAUSED' && isExpired;

      return {
        canRenew,
        isExpired,
        jobTitle: job.title,
        expiresAt: expiresAt,
        daysUntilExpiration: expiresAt
          ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      };
    }),

  // Reopen a closed job
  reopenJob: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only clients can reopen jobs.',
        });
      }

      const supabase = await createClient();

      // Get the job to verify ownership and current status
      const { data: job, error: fetchError } = await supabase
        .from('Job')
        .select('id, clientId, status, title, slug, expiresAt')
        .eq('id', input.jobId)
        .single();

      if (fetchError || !job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found.',
        });
      }

      // Check authorization
      if (job.clientId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only reopen your own jobs.',
        });
      }

      // Only allow reopening closed jobs
      if (job.status !== 'CLOSED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only closed jobs can be reopened.',
        });
      }

      // Check if job expiration needs to be extended
      const now = new Date();
      const expiresAt = job.expiresAt ? new Date(job.expiresAt) : null;
      const needsExtension = !expiresAt || expiresAt <= now;

      // Set new expiration to 30 days from now if needed
      const newExpiresAt = needsExtension
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : expiresAt;

      // Reopen the job
      const { data: updatedJob, error: updateError } = await supabase
        .from('Job')
        .update({
          status: 'OPEN',
          expiresAt: newExpiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.jobId)
        .select()
        .single();

      if (updateError || !updatedJob) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reopen job',
        });
      }

      // Send notification to client
      try {
        await createNotification(supabase, {
          userId: ctx.session.user.id,
          type: 'PROPOSAL_RECEIVED',
          message: `Your job "${job.title}" has been reopened and is now visible to freelancers.`,
          link: `/jobs/${job.slug || SecureId.encode(job.id)}`,
          read: false,
        });
      } catch (notificationError) {
        // Ignore notification errors
      }

      return updatedJob;
    }),

  // Development endpoint to generate slugs for existing jobs without slugs
  generateMissingSlugs: protectedProcedure
    .mutation(async () => {
      if (process.env.NODE_ENV !== 'development') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Development endpoint not available',
        });
      }

      const supabase = await createClient();

      // Get all jobs without slugs
      const { data: jobsWithoutSlugs, error: fetchError } = await supabase
        .from('Job')
        .select('id, title, slug')
        .or('slug.is.null,slug.eq.');

      if (fetchError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch jobs',
        });
      }

      if (!jobsWithoutSlugs || jobsWithoutSlugs.length === 0) {
        return { success: true, message: 'All jobs already have slugs', updated: 0 };
      }

      // Get all existing slugs to avoid duplicates
      const { data: existingJobs } = await supabase
        .from('Job')
        .select('slug')
        .not('slug', 'is', null)
        .neq('slug', '');

      const existingSlugs = (existingJobs || []).map(job => job.slug).filter(Boolean) as string[];

      let updated = 0;
      for (const job of jobsWithoutSlugs) {
        const baseSlug = generateSlug(job.title);
        const uniqueSlug = ensureUniqueSlug(baseSlug, [...existingSlugs, ...jobsWithoutSlugs.slice(0, updated).map(j => generateSlug(j.title))]);

        await supabase
          .from('Job')
          .update({ slug: uniqueSlug, updatedAt: new Date().toISOString() })
          .eq('id', job.id);

        updated++;
      }

      return { success: true, message: `Generated slugs for ${updated} jobs`, updated };
    }),
});
