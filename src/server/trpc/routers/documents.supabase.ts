/**
 * Documents Router - Migrated to Supabase
 * Handles all document operations using Supabase database
 * Note: File system operations remain unchanged
 */

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { createNotification } from '@/lib/notifications/create-notification';

export const documentsRouter = router({
  uploadDocument: protectedProcedure
    .input(
      z.object({
        type: z.enum(['ID_VERIFICATION', 'BUSINESS_REGISTRATION', 'COMPANY_DOCUMENTS', 'PORTFOLIO_ITEM']),
        fileName: z.string().min(1),
        fileData: z.string(), // Base64 encoded file data
        fileSize: z.number().min(1).max(10 * 1024 * 1024), // Max 10MB
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // Validate fileName exists
        if (!input.fileName || typeof input.fileName !== 'string' || input.fileName.trim() === '') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid or missing file name',
          });
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads', 'documents', userId);
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = join(uploadsDir, uniqueFileName);
        const relativeFilePath = `uploads/documents/${userId}/${uniqueFileName}`;

        // Convert base64 to buffer and save file
        const fileBuffer = Buffer.from(input.fileData, 'base64');
        await writeFile(filePath, fileBuffer);

        // Use regular client which should have user context from cookies
        const supabase = await createClient();

        // Save document record to database
        const { data: document, error } = await supabase
          .from('Document')
          .insert({
            id: crypto.randomUUID(),
            userId,
            type: input.type,
            fileName: uniqueFileName, // Store the actual filename with timestamp that exists on disk
            filePath: relativeFilePath,
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            uploadedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (error || !document) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save document record',
          });
        }

        return {
          id: document.id,
          fileName: uniqueFileName, // Return the actual filename with timestamp
          filePath: relativeFilePath, // Return full path for easy access
          type: document.type,
          status: 'uploaded',
        };
      } catch (error) {
      }
    }),

  getUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const supabase = await createClient();

    const { data: documents, error } = await supabase
      .from('Document')
      .select('id, type, fileName, fileSize, mimeType, isApproved, rejectionReason, uploadedAt, reviewedAt')
      .eq('userId', userId)
      .order('uploadedAt', { ascending: false });

    if (error) {
    }

    return documents || [];
  }),

  deleteDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const supabase = await createClient();

      // Find the document and verify ownership
      const { data: document, error: fetchError } = await supabase
        .from('Document')
        .select('*')
        .eq('id', input.documentId)
        .single();

      if (fetchError || !document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      if (document.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own documents',
        });
      }

      // Delete the file from filesystem
      try {
        const fs = await import('fs/promises');
        const fullPath = join(process.cwd(), document.filePath);
        if (existsSync(fullPath)) {
          await fs.unlink(fullPath);
        }
      } catch (error) {
        // Continue even if file deletion fails
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('Document')
        .delete()
        .eq('id', input.documentId);

      if (deleteError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete document from database.',
        });
      }

      return { success: true };
    }),

  getDocumentsByType: protectedProcedure
    .input(
      z.object({
        type: z.enum(['ID_VERIFICATION', 'BUSINESS_REGISTRATION', 'COMPANY_DOCUMENTS', 'PORTFOLIO_ITEM']),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const supabase = await createClient();

      const { data: documents, error } = await supabase
        .from('Document')
        .select('*')
        .eq('userId', userId)
        .eq('type', input.type)
        .order('uploadedAt', { ascending: false });

      if (error) {
      }

      return documents || [];
    }),

  // Admin routes for document review
  getPendingDocuments: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admins
    if (ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      });
    }

    const supabase = await createClient();

    const { data: documents, error } = await supabase
      .from('Document')
      .select(`
        *,
        user:User!Document_userId_fkey(
          id,
          email,
          role,
          Profile!inner(
            firstName,
            lastName,
            companyName
          )
        )
      `)
      .is('isApproved', null)
      .order('uploadedAt', { ascending: true });

    if (error) {
    }

    return documents || [];
  }),

  reviewDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow admins
      if (ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      const supabase = await createClient();

      // Get document
      const { data: document, error: fetchError } = await supabase
        .from('Document')
        .select('*, user:User!Document_userId_fkey(*)')
        .eq('id', input.documentId)
        .single();

      if (fetchError || !document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Update document status
      const { data: updatedDocument, error: updateError } = await supabase
        .from('Document')
        .update({
          isApproved: input.approved,
          rejectionReason: input.approved ? null : input.rejectionReason,
          reviewedAt: new Date().toISOString(),
        })
        .eq('id', input.documentId)
        .select()
        .single();

      if (updateError || !updatedDocument) {
      }

      // Create notification for the user
      await createNotification(supabase, {
        userId: document.userId,
        type: 'PAYMENT_RECEIVED', // Using existing enum value
        message: input.approved
          ? `Your ${document.type.toLowerCase().replace('_', ' ')} document has been approved.`
          : `Your ${document.type.toLowerCase().replace('_', ' ')} document was rejected. ${input.rejectionReason || ''}`,
        link: '/dashboard',
        read: false,
      });

      return updatedDocument;
    }),
});
