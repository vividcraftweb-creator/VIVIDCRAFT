import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient } from '@/lib/supabase/server';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';
import crypto from 'crypto';

type ProjectMilestoneUpdate = {
  title?: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedTo?: string | null;
  progress?: number;
  tags?: string[];
  completedAt?: string | null;
  updatedAt: string;
};

// Helper function to check if user has access to project management (Business/Enterprise only)
async function requireProjectManagementAccess(userId: string) {
  const permissions = await getUserFeaturePermissions(userId);
  if (!permissions.hasEnhancedProjectManagement) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Enhanced Project Management requires Business or Enterprise plan',
    });
  }
}

export const projectMilestonesRouter = router({
  // List all project milestones for the client
  list: protectedProcedure
    .input(
      z.object({
        contractId: z.string().optional(),
        status: z.enum(['pending', 'in-progress', 'completed', 'overdue']).optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      let query = supabase
        .from('ProjectMilestone')
        .select(`
          *,
          contract:Contract(
            id,
            job:Job(id, title, slug),
            freelancer:User!Contract_freelancerId_fkey(
              id,
              email,
              profile:Profile(firstName, lastName, profilePicture)
            )
          ),
          assignedToUser:User!ProjectMilestone_assignedTo_fkey(
            id,
            email,
            profile:Profile(firstName, lastName)
          )
        `)
        .eq('clientId', ctx.session.user.id)
        .order('dueDate', { ascending: true })
        .limit(input.limit);

      if (input.contractId) {
        query = query.eq('contractId', input.contractId);
      }

      if (input.status) {
        query = query.eq('status', input.status);
      }

      const { data: milestones, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project milestones',
        });
      }

      return milestones || [];
    }),

  // Get a single milestone
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: milestone, error } = await supabase
        .from('ProjectMilestone')
        .select(`
          *,
          contract:Contract(
            id,
            job:Job(id, title),
            freelancer:User!Contract_freelancerId_fkey(
              id,
              profile:Profile(firstName, lastName)
            )
          ),
          assignedToUser:User!ProjectMilestone_assignedTo_fkey(
            id,
            profile:Profile(firstName, lastName)
          )
        `)
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (error || !milestone) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        });
      }

      return milestone;
    }),

  // Create a new milestone
  create: protectedProcedure
    .input(
      z.object({
        contractId: z.string().optional(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
        dueDate: z.string(),
        assignedTo: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // If contractId provided, verify the client owns the contract
      if (input.contractId) {
        const { data: contract } = await supabase
          .from('Contract')
          .select('clientId')
          .eq('id', input.contractId)
          .single();

        if (!contract || contract.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to create milestones for this contract',
          });
        }
      }

      const { data: milestone, error } = await supabase
        .from('ProjectMilestone')
        .insert({
          id: crypto.randomUUID(),
          clientId: ctx.session.user.id,
          contractId: input.contractId || null,
          title: input.title,
          description: input.description || '',
          priority: input.priority,
          dueDate: input.dueDate,
          assignedTo: input.assignedTo || null,
          tags: input.tags || [],
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
      }

      // Log activity
      await supabase.from('ProjectActivity').insert({
        id: crypto.randomUUID(),
        clientId: ctx.session.user.id,
        projectMilestoneId: milestone.id,
        action: 'milestone_created',
        description: `Created milestone: ${input.title}`,
        metadata: { title: input.title, priority: input.priority },
        createdBy: ctx.session.user.id,
        createdAt: new Date().toISOString(),
      });

      return milestone;
    }),

  // Update a milestone
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'in-progress', 'completed', 'overdue']).optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        dueDate: z.string().optional(),
        assignedTo: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('ProjectMilestone')
        .select('*')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        });
      }

      const updateData: ProjectMilestoneUpdate = {
        updatedAt: new Date().toISOString(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === 'completed' && !existing.completedAt) {
          updateData.completedAt = new Date().toISOString();
          updateData.progress = 100;
        }
      }
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo || null;
      if (input.progress !== undefined) updateData.progress = input.progress;
      if (input.tags !== undefined) updateData.tags = input.tags;

      const { data: updated, error: updateError } = await supabase
        .from('ProjectMilestone')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update milestone',
        });
      }

      // Log activity for status changes
      if (input.status && input.status !== existing.status) {
        await supabase.from('ProjectActivity').insert({
          id: crypto.randomUUID(),
          clientId: ctx.session.user.id,
          projectMilestoneId: input.id,
          action: 'status_changed',
          description: `Status changed from ${existing.status} to ${input.status}`,
          metadata: { oldStatus: existing.status, newStatus: input.status },
          createdBy: ctx.session.user.id,
          createdAt: new Date().toISOString(),
        });
      }

      return updated;
    }),

  // Delete a milestone
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing } = await supabase
        .from('ProjectMilestone')
        .select('title')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        });
      }

      const { error } = await supabase
        .from('ProjectMilestone')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete milestone',
        });
      }

      // Log activity
      await supabase.from('ProjectActivity').insert({
        id: crypto.randomUUID(),
        clientId: ctx.session.user.id,
        projectMilestoneId: null,
        action: 'milestone_deleted',
        description: `Deleted milestone: ${existing.title}`,
        metadata: { title: existing.title },
        createdBy: ctx.session.user.id,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  // Get statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    await requireProjectManagementAccess(ctx.session.user.id);
    const supabase = await createClient();

    const { data: milestones, error } = await supabase
      .from('ProjectMilestone')
      .select('status, dueDate')
      .eq('clientId', ctx.session.user.id);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch stats',
      });
    }

    const now = new Date();
    const stats = {
      total: milestones?.length || 0,
      pending: milestones?.filter((m) => m.status === 'pending').length || 0,
      inProgress: milestones?.filter((m) => m.status === 'in-progress').length || 0,
      completed: milestones?.filter((m) => m.status === 'completed').length || 0,
      overdue: milestones?.filter((m) =>
        m.status !== 'completed' && new Date(m.dueDate) < now
      ).length || 0,
    };

    return stats;
  }),

  // Get recent activity
  getActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: activity, error } = await supabase
        .from('ProjectActivity')
        .select('*')
        .eq('clientId', ctx.session.user.id)
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
});
