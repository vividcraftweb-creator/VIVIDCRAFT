/**
 * Verifications Router - Migrated to Supabase
 * Handles all identity verification operations using Supabase database
 */

import { router, protectedProcedure, adminProcedure } from '../trpc';
import type { Context } from '../context';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkUserVerification } from '@/lib/verification-helpers';
import crypto from 'crypto';
import { sendEmail, emailTemplates } from '@/lib/email';
import { createNotification } from '@/lib/notifications/create-notification';


const requireAdminSupabase = (ctx: Context) => {
  const supabase = ctx.adminSupabase;

  if (!supabase) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to initialize admin Supabase client.',
    });
  }

  return supabase;
};

export const verificationsRouter = router({
  submitVerification: protectedProcedure
    .input(
      z.object({
        idType: z.string(),
        files: z.string(), // Comma-separated list of file URLs
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      // Check for existing verification
      const { data: existingVerification } = await supabase
        .from('Verification')
        .select('id')
        .eq('userId', ctx.session.user.id)
        .single();

      if (existingVerification) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You have already submitted a verification request.',
        });
      }

      // Create verification
      const { data: verification, error: createError } = await supabase
        .from('Verification')
        .insert({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          idType: input.idType,
          files: input.files,
          details: input.details || null,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !verification) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create verification',
        });
      }

      return verification;
    }),

  getVerificationStatus: protectedProcedure
    .input(z.union([z.object({}).passthrough(), z.string(), z.undefined(), z.null()]).optional().nullable())
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        return null;
      }

      try {
        const supabase = await createClient();

        // Only get the overall verification submission (where verificationType is NULL)
        // Not individual document uploads (which have verificationType set)
        const { data: verification, error } = await supabase
          .from('Verification')
          .select('*')
          .eq('userId', ctx.session.user.id)
          .is('verificationType', null)
          .limit(1)
          .maybeSingle();

        if (error) {
          return null;
        }

        return verification || null;
      } catch (err) {
        return null;
      }
    }),

  getPendingVerifications: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) return [];

      let { data: verifications, error } = await supabase
        .from('Verification')
        .select(`
          *,
          user:User!Verification_userId_fkey(*)
        `)
        .eq('status', 'PENDING');

      if (error) {
        console.error('getPendingVerifications join error, trying plain select:', error);
        const fallbackRes = await supabase
          .from('Verification')
          .select('*')
          .eq('status', 'PENDING');
        verifications = fallbackRes.data as any;
      }

      return verifications || [];
    } catch (err) {
      console.error('getPendingVerifications exception:', err);
      return [];
    }
  }),

  updateVerificationStatus: adminProcedure
    .input(
      z.object({
        verificationId: z.string(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get verification
      const { data: verification, error: verificationError } = await supabase
        .from('Verification')
        .select('userId')
        .eq('id', input.verificationId)
        .single();

      if (verificationError || !verification) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Update verification status
      await supabase
        .from('Verification')
        .update({
          status: input.status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

      // Also update the user's profile to be verified if approved
      if (input.status === 'APPROVED') {
        await (supabase as any)
          .from('profiles')
          .update({
            verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', verification.userId);
      }

      return true;
    }),

  getVerifications: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase;
      if (!supabase) {
        return [];
      }

      const { data: verifications, error } = await supabase
        .from('Verification')
        .select(`
          *,
          user:User!Verification_userId_fkey(*),
          reviewer:User!Verification_reviewedBy_fkey(*)
        `)
        .order('createdAt', { ascending: false });

      if (error) {
        return [];
      }

      return verifications || [];
    } catch (err) {
      return [];
    }
  }),

  approveVerification: adminProcedure
    .input(z.object({ verificationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get verification with user info
      const { data: verification, error: verificationError } = await supabase
        .from('Verification')
        .select('userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
        .eq('id', input.verificationId)
        .single();

      if (verificationError || !verification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification not found' });
      }

      // Update verification status
      await supabase
        .from('Verification')
        .update({
          status: 'APPROVED',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

      // Update user's profile to be verified
      await (supabase as any)
        .from('profiles')
        .update({
          verified: true,
          is_verified: true,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', verification.userId);

      // Update user verified status
      await supabase
        .from('User')
        .update({
          isVerified: true,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', verification.userId);

      // Create notification
      await createNotification(supabase, {
        userId: verification.userId,
        type: 'VERIFICATION_APPROVED',
        message: 'Your identity verification has been approved!',
        link: '/dashboard?tab=verification',
      });

      // Send email notification
      const userObj = verification.user as any;
      const userEmail = Array.isArray(userObj)
        ? userObj[0]?.email
        : userObj?.email;

      if (userEmail) {
        const profile = Array.isArray(userObj)
          ? userObj[0]?.Profile
          : userObj?.Profile;
        const firstName = Array.isArray(profile) ? profile[0]?.firstName : profile?.firstName;

        await emailTemplates.verificationApprovedEmail(userEmail, firstName);
      }

      return true;
    }),

  rejectVerification: adminProcedure
    .input(z.object({ verificationId: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);

      // Get verification with user info
      const { data: verification, error: verificationError } = await supabase
        .from('Verification')
        .select('userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
        .eq('id', input.verificationId)
        .single();

      if (verificationError || !verification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification not found' });
      }

      // Update verification status
      await supabase
        .from('Verification')
        .update({
          status: 'REJECTED',
          details: input.reason,
          rejectionReason: input.reason,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

      // Update user's profile to not be verified
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            verified: false,
            is_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', verification.userId);
      } catch {}

      // Create notification
      await createNotification(supabase, {
        userId: verification.userId,
        type: 'VERIFICATION_REJECTED',
        message: `Your identity verification was rejected. Reason: ${input.reason}`,
        link: '/dashboard?tab=verification',
      });

      // Send email notification
      const userObj = verification.user as any;
      const userEmail = Array.isArray(userObj)
        ? userObj[0]?.email
        : userObj?.email;

      if (userEmail) {
        const profile = Array.isArray(userObj)
          ? userObj[0]?.Profile
          : userObj?.Profile;
        const firstName = Array.isArray(profile) ? profile[0]?.firstName : profile?.firstName;

        await emailTemplates.verificationRejectedEmail(userEmail, firstName, input.reason);
      }

      return true;
    }),

  /**
   * Upload a verification document
   */
  uploadDocument: protectedProcedure
    .input(
      z.object({
        verificationType: z.enum([
          'ID_FRONT',
          'ID_BACK',
          'SELFIE',
          'BUSINESS_REGISTRATION',
          'PROOF_OF_ADDRESS',
          'TAX_DOCUMENT',
          'BUSINESS_LICENSE',
        ]),
        documentType: z.string().optional(), // e.g., "Passport", "Driver's License"
        fileUrl: z.string(), // URL to uploaded file in Supabase Storage
        expiryDate: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const userId = ctx.session.user.id;

      // Check if document of this type already exists for user
      const { data: existing } = await supabase
        .from('Verification')
        .select('id')
        .eq('userId', userId)
        .eq('verificationType', input.verificationType)
        .maybeSingle();

      const docData = {
        userId,
        verificationType: input.verificationType,
        documentType: input.documentType || null,
        files: input.fileUrl,
        expiryDate: input.expiryDate ? new Date(input.expiryDate).toISOString() : null,
        status: 'PENDING' as const,
        updatedAt: new Date().toISOString(),
      };

      if (existing) {
        // Update existing document
        const { data, error } = await supabase
          .from('Verification')
          .update(docData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update verification document',
          });
        }

        return data;
      } else {
        // Create new document
        const { data, error } = await supabase
          .from('Verification')
          .insert({
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            ...docData,
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create verification document',
          });
        }

        return data;
      }
    }),

  /**
   * Get all verification documents for current user
   */
  getUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient();
    const userId = ctx.session.user.id;

    // Only get individual document records (not the overall submission)
    // Overall submission has verificationType = NULL
    const { data: documents, error } = await supabase
      .from('Verification')
      .select('*')
      .eq('userId', userId)
      .not('verificationType', 'is', null)
      .order('createdAt', { ascending: false });

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user documents',
      });
    }

    return documents || [];
  }),

  /**
   * Delete a verification document
   */
  deleteDocument: protectedProcedure
    .input(z.object({ verificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();
      const adminSupabase = createAdminClient();
      const userId = ctx.session.user.id;

      // Verify ownership
      const { data: verification } = await supabase
        .from('Verification')
        .select('userId, files')
        .eq('id', input.verificationId)
        .single();

      if (!verification || verification.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this document',
        });
      }

      // Delete the document record using admin client (no DELETE RLS policy)
      const { error } = await adminSupabase
        .from('Verification')
        .delete()
        .eq('id', input.verificationId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete document',
        });
      }

      return true;
    }),

  /**
   * Submit all documents for review
   */
  submitForReview: protectedProcedure.mutation(async ({ ctx }) => {
    const supabase = await createClient();
    // Use admin client for User table queries
    const adminSupabase = createAdminClient();
    const userId = ctx.session.user.id;

    // Check for existing verification submission
    const { data: existingSubmission } = await supabase
      .from('Verification')
      .select('id, status')
      .eq('userId', userId)
      .is('verificationType', null)
      .maybeSingle();

    if (existingSubmission) {
      // If rejected, delete the old submission so they can resubmit
      if (existingSubmission.status === 'REJECTED') {
        await adminSupabase
          .from('Verification')
          .delete()
          .eq('id', existingSubmission.id);
      } else {
        // PENDING or APPROVED - don't allow resubmission
        const statusMessage = existingSubmission.status === 'APPROVED'
          ? 'Your verification has already been approved.'
          : 'You have already submitted for verification. Please wait for review.';
        throw new TRPCError({
          code: 'CONFLICT',
          message: statusMessage,
        });
      }
    }

    // Get user info using admin client - separate queries to avoid schema issues
    let { data: userData, error: userError } = await adminSupabase
      .from('User')
      .select('id, clientType, email, role')
      .eq('id', userId)
      .single();

    // Get profile separately to avoid join issues
    let profileData: any = null;
    try {
      const { data } = await (adminSupabase as any)
        .from('profiles')
        .select('firstName, lastName, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      profileData = data;
    } catch {}

    // Combine the results
    let resolvedUser: { id: string; clientType: string | null; email: string; role: string | null; Profile: Array<{ firstName: string | null; lastName: string | null }> } | null = userData ? {
      ...userData,
      Profile: profileData ? [{
        firstName: profileData.firstName || profileData.first_name || '',
        lastName: profileData.lastName || profileData.last_name || '',
      }] : []
    } : null;

    if (userError) {
      // Check if user exists in auth but not in User table
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId);
      if (authUser?.user) {
        // Create User record if it doesn't exist
        const { error: createError } = await adminSupabase
          .from('User')
          .insert({
            id: userId,
            email: authUser.user.email || '',
            role: 'FREELANCER',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (createError) {
          // If it's a duplicate key error, the user exists - just refetch
          if (createError.code !== '23505') {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to initialize user record. Please try again.',
            });
          }
        }

        // Also create Profile if missing
        const { error: profileError } = await (adminSupabase as any)
          .from('profiles')
          .insert({
            id: userId,
            updated_at: new Date().toISOString(),
          });

        if (profileError && profileError.code !== '23505') {
          // Profile creation failed, but continue
        }

        // Refetch user data
        const { data: freshUserData } = await adminSupabase
          .from('User')
          .select('id, clientType, email, role')
          .eq('id', userId)
          .single();

        let freshProfileData: any = null;
        try {
          const { data } = await (adminSupabase as any)
            .from('profiles')
            .select('firstName, lastName, first_name, last_name')
            .eq('id', userId)
            .maybeSingle();
          freshProfileData = data;
        } catch {}

        if (!freshUserData) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to retrieve user record after creation.',
          });
        }

        resolvedUser = {
          ...freshUserData,
          Profile: freshProfileData ? [freshProfileData] : []
        };
      } else {
        // Fallback to profiles table
        const { data: profile } = await (adminSupabase as any)
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        resolvedUser = {
          id: userId,
          clientType: 'INDIVIDUAL',
          email: profile?.email || ctx.session.user.email || '',
          role: profile?.role || ctx.session.user.role || 'FREELANCER',
          Profile: profile ? [{ firstName: profile.first_name || profile.firstName, lastName: profile.last_name || profile.lastName }] : []
        };
      }
    }

    const user = resolvedUser || {
      id: userId,
      clientType: 'INDIVIDUAL',
      email: ctx.session.user.email || '',
      role: ctx.session.user.role || 'FREELANCER',
      Profile: []
    };

    // Get all user documents
    const { data: documents } = await supabase
      .from('Verification')
      .select('verificationType')
      .eq('userId', userId);

    const docTypes = new Set(documents?.map(d => d.verificationType) || []);

    // Validate required documents based on client type
    // ID front, back, and selfie are always required (prevents fraud)
    const requiredDocs = ['ID_FRONT', 'ID_BACK', 'SELFIE'];
    if (user.clientType === 'BUSINESS') {
      requiredDocs.push('BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS');
    }

    const missingDocs = requiredDocs.filter(type => !docTypes.has(type));

    if (missingDocs.length > 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Missing required documents: ${missingDocs.join(', ')}. Please upload all required documents before submitting.`,
      });
    }

    // Mark user as having submitted for review
    const { error: updateError } = await adminSupabase
      .from('User')
      .update({ verificationSubmittedAt: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      // Failed to update user verification status
    }

    // Create verification submission record
    const { error: verificationError } = await supabase
      .from('Verification')
      .insert({
        id: crypto.randomUUID(),
        userId,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    if (verificationError) {
      // Failed to create verification submission
    }

    // Send email notification to user
    // (Note: verificationSubmittedEmail function not yet implemented)

    // Send admin notification email via Supabase edge function
    try {
      const profile: any = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
      const userName = profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : profile?.firstName || user.email || 'Unknown User';

      // Admin notification (not yet implemented)
    } catch (emailError) {
      // Don't throw error - user submission was successful even if admin notification fails
    }

    return {
      success: true,
      message: 'Documents submitted successfully! We will review them within 24-48 hours.',
    };
  }),

  /**
   * Admin: Get all documents for a specific user
   */
  getDocumentsByUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const supabase = ctx.adminSupabase;
        if (!supabase) {
          return [];
        }

        const { data: documents, error } = await supabase
          .from('Verification')
          .select('*')
          .eq('userId', input.userId)
          .order('createdAt', { ascending: false });

        if (error) {
          return [];
        }

        return documents || [];
      } catch (err) {
        return [];
      }
    }),

  /**
   * Admin: Approve specific document
   */
  approveDocument: adminProcedure
    .input(z.object({
      verificationId: z.string(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);
      const adminUserId = ctx.session.user.id;

      const { error } = await supabase
        .from('Verification')
        .update({
          status: 'APPROVED',
          reviewedBy: adminUserId,
          reviewedAt: new Date().toISOString(),
          adminNotes: input.adminNotes || null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve document',
        });
      }

      return true;
    }),

  /**
   * Admin: Reject specific document
   */
  rejectDocument: adminProcedure
    .input(z.object({
      verificationId: z.string(),
      rejectionReason: z.string(),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = requireAdminSupabase(ctx);
      const adminUserId = ctx.session.user.id;

      const { error } = await supabase
        .from('Verification')
        .update({
          status: 'REJECTED',
          rejectionReason: input.rejectionReason,
          reviewedBy: adminUserId,
          reviewedAt: new Date().toISOString(),
          adminNotes: input.adminNotes || null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', input.verificationId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject document',
        });
      }

      return true;
    }),

  /**
   * Check user's verification status
   */
  checkVerificationStatus: protectedProcedure
    .input(z.union([z.object({}).passthrough(), z.string(), z.undefined(), z.null()]).optional().nullable())
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        return await checkUserVerification(userId, false); // Allow all roles to verify
      } catch (e) {
        return {
          isVerified: false,
          status: 'not_started' as const,
          message: 'Upload a government-issued ID to fully activate your account.',
          requiredDocs: ['ID_FRONT', 'ID_BACK', 'SELFIE'],
          uploadedDocs: [],
          missingDocs: ['ID_FRONT', 'ID_BACK', 'SELFIE'],
          rejectedDocs: [],
        };
      }
    }),
});
