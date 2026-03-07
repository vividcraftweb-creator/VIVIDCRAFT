import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getUserFeaturePermissions } from '@/lib/feature-enforcement';
import crypto from 'crypto';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/lib/constants/file-upload';

const STORAGE_BUCKET = 'public-uploads';

type ProjectFileUpdate = {
  name?: string;
  description?: string;
  category?: 'design' | 'document' | 'code' | 'other';
  tags?: string[];
  isPublic?: boolean;
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

export const projectFilesRouter = router({
  // List all project files for the client
  list: protectedProcedure
    .input(
      z.object({
        contractId: z.string().optional(),
        projectMilestoneId: z.string().optional(),
        category: z.enum(['design', 'document', 'code', 'other']).optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      let query = supabase
        .from('ProjectFile')
        .select(`
          *,
          contract:Contract(
            id,
            job:Job(id, title)
          ),
          projectMilestone:ProjectMilestone(id, title),
          uploader:User!ProjectFile_uploadedBy_fkey(
            id,
            email,
            profile:Profile(firstName, lastName)
          )
        `)
        .eq('clientId', ctx.session.user.id)
        .order('createdAt', { ascending: false })
        .limit(input.limit);

      if (input.contractId) {
        query = query.eq('contractId', input.contractId);
      }

      if (input.projectMilestoneId) {
        query = query.eq('projectMilestoneId', input.projectMilestoneId);
      }

      if (input.category) {
        query = query.eq('category', input.category);
      }

      const { data: files, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project files',
        });
      }

      return files || [];
    }),

  // Get a single file
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      const { data: file, error } = await supabase
        .from('ProjectFile')
        .select(`
          *,
          uploader:User!ProjectFile_uploadedBy_fkey(
            id,
            profile:Profile(firstName, lastName)
          )
        `)
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (error || !file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      return file;
    }),

  // Create file metadata (actual file upload handled separately)
  create: protectedProcedure
    .input(
      z.object({
        contractId: z.string().optional(),
        projectMilestoneId: z.string().optional(),
        name: z.string().min(1),
        originalName: z.string().min(1),
        mimeType: z.string(),
        size: z.number().max(MAX_FILE_SIZE, `File size must not exceed ${MAX_FILE_SIZE_MB}MB`),
        category: z.enum(['design', 'document', 'code', 'other']).default('other'),
        filePath: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Additional file size validation
      if (input.size > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
        });
      }

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
            message: 'You do not have permission to upload files for this contract',
          });
        }
      }

      const { data: file, error } = await supabase
        .from('ProjectFile')
        .insert({
          id: crypto.randomUUID(),
          clientId: ctx.session.user.id,
          contractId: input.contractId || null,
          projectMilestoneId: input.projectMilestoneId || null,
          name: input.name,
          originalName: input.originalName,
          mimeType: input.mimeType,
          size: input.size,
          category: input.category,
          uploadedBy: ctx.session.user.id,
          filePath: input.filePath,
          description: input.description || '',
          tags: input.tags || [],
          isPublic: input.isPublic,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create project file',
        });
      }

      // Log activity
      await supabase.from('ProjectActivity').insert({
        id: crypto.randomUUID(),
        clientId: ctx.session.user.id,
        fileId: file.id,
        projectMilestoneId: input.projectMilestoneId || null,
        action: 'file_uploaded',
        description: `Uploaded file: ${input.originalName}`,
        metadata: { fileName: input.originalName, category: input.category, size: input.size },
        createdBy: ctx.session.user.id,
        createdAt: new Date().toISOString(),
      });

      return file;
    }),

  // Update file metadata
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(['design', 'document', 'code', 'other']).optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('ProjectFile')
        .select('*')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (fetchError || !existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      const updateData: ProjectFileUpdate = {
        updatedAt: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

      const { data: updated, error: updateError } = await supabase
        .from('ProjectFile')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update file',
        });
      }

      return updated;
    }),

  // Delete a file
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectManagementAccess(ctx.session.user.id);
      const supabase = await createClient();

      // Verify ownership and get file info
      const { data: existing } = await supabase
        .from('ProjectFile')
        .select('originalName, filePath')
        .eq('id', input.id)
        .eq('clientId', ctx.session.user.id)
        .single();

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      const { error } = await supabase
        .from('ProjectFile')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file',
        });
      }

      // Delete the actual file from Supabase Storage
      try {
        const adminClient = createAdminClient();
        const { error: storageError } = await adminClient.storage
          .from(STORAGE_BUCKET)
          .remove([existing.filePath]);

        if (storageError) {
          // Storage deletion failed
        }
      } catch (storageError) {
        // Non-blocking error - continue with activity logging
      }

      // Log activity
      await supabase.from('ProjectActivity').insert({
        id: crypto.randomUUID(),
        clientId: ctx.session.user.id,
        fileId: null,
        action: 'file_deleted',
        description: `Deleted file: ${existing.originalName}`,
        metadata: { fileName: existing.originalName },
        createdBy: ctx.session.user.id,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  // Get statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    await requireProjectManagementAccess(ctx.session.user.id);
    const supabase = await createClient();

    const { data: files, error } = await supabase
      .from('ProjectFile')
      .select('category, size')
      .eq('clientId', ctx.session.user.id);

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch stats',
      });
    }

    const stats = {
      total: files?.length || 0,
      design: files?.filter((f) => f.category === 'design').length || 0,
      document: files?.filter((f) => f.category === 'document').length || 0,
      code: files?.filter((f) => f.category === 'code').length || 0,
      other: files?.filter((f) => f.category === 'other').length || 0,
      totalSize: files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0,
    };

    return stats;
  }),
});
