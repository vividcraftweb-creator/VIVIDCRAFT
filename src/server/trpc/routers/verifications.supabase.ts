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
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');

      let targetUserId: string | null = null;

      // 1. Check verifications (lowercase)
      try {
        const { data: vRow } = await (supabase as any)
          .from('verifications')
          .select('user_id')
          .eq('id', cleanId)
          .maybeSingle();
        if (vRow) targetUserId = vRow.user_id;
      } catch {}

      // 2. Check Verification (PascalCase)
      if (!targetUserId) {
        try {
          const { data: verification } = await supabase
            .from('Verification')
            .select('userId')
            .eq('id', cleanId)
            .maybeSingle();
          if (verification) targetUserId = verification.userId;
        } catch {}
      }

      if (!targetUserId) {
        targetUserId = cleanId;
      }

      const isApproved = input.status === 'APPROVED';

      // Update verifications table status
      try {
        await (supabase as any)
          .from('verifications')
          .update({
            status: isApproved ? 'approved' : input.status === 'REJECTED' ? 'rejected' : 'pending',
            updated_at: new Date().toISOString(),
          })
          .or(`id.eq.${cleanId},user_id.eq.${targetUserId}`);
      } catch {}

      // Update Verification table status
      try {
        await supabase
          .from('Verification')
          .update({
            status: input.status,
            updatedAt: new Date().toISOString(),
          })
          .or(`id.eq.${cleanId},userId.eq.${targetUserId}`);
      } catch {}

      // Update user's profile is_verified (strictly select/update is_verified)
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            is_verified: isApproved,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch {}

      // Update User table isVerified
      try {
        await supabase
          .from('User')
          .update({
            isVerified: isApproved,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch {}

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
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');

      let targetUserId: string | null = null;
      let userEmail: string | null = null;
      let firstName: string | null = null;

      // 1. Check `verifications` table (lowercase)
      try {
        const { data: vRow } = await (supabase as any)
          .from('verifications')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (vRow) {
          targetUserId = vRow.user_id;

          await (supabase as any)
            .from('verifications')
            .update({
              status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .eq('id', cleanId);
        }
      } catch (vErr) {
        console.warn('verifications table lookup notice in approveVerification:', vErr);
      }

      // 2. Check `Verification` table (PascalCase)
      try {
        const { data: verification } = await supabase
          .from('Verification')
          .select('userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
          .eq('id', cleanId)
          .maybeSingle();

        if (verification) {
          targetUserId = targetUserId || verification.userId;
          const userObj = verification.user as any;
          userEmail = Array.isArray(userObj) ? userObj[0]?.email : userObj?.email;
          const profile = Array.isArray(userObj) ? userObj[0]?.Profile : userObj?.Profile;
          firstName = Array.isArray(profile) ? profile[0]?.firstName : profile?.firstName;

          await supabase
            .from('Verification')
            .update({
              status: 'APPROVED',
              updatedAt: new Date().toISOString(),
            })
            .eq('id', cleanId);
        }
      } catch (verErr) {
        console.warn('Verification table lookup notice in approveVerification:', verErr);
      }

      // 3. Fallback: cleanId might be a userId directly
      if (!targetUserId) {
        try {
          const { data: userCheck } = await supabase
            .from('User')
            .select('id, email, Profile(firstName, lastName)')
            .eq('id', cleanId)
            .maybeSingle();
          if (userCheck) {
            targetUserId = userCheck.id;
            userEmail = userCheck.email;
            const profile = Array.isArray(userCheck.Profile) ? userCheck.Profile[0] : userCheck.Profile;
            firstName = profile?.firstName || null;
          }
        } catch {}
      }

      if (!targetUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification record or user not found' });
      }

      // 4. Update status in verifications table for this user
      try {
        await (supabase as any)
          .from('verifications')
          .update({
            status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', targetUserId);
      } catch (vUpdateErr) {
        console.warn('verifications update notice in approveVerification:', vUpdateErr);
      }

      // 5. Update status in Verification table for this user
      try {
        await supabase
          .from('Verification')
          .update({
            status: 'APPROVED',
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', targetUserId);
      } catch {}

      // 6. Update user's profile in profiles table setting is_verified = true (strictly using is_verified)
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            is_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch (profErr) {
        console.warn('Profile update notice in approveVerification:', profErr);
      }

      // 7. Update User table isVerified status
      try {
        await supabase
          .from('User')
          .update({
            isVerified: true,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch {}

      // 8. Update Supabase auth user_metadata if possible
      try {
        await supabase.auth.admin.updateUserById(targetUserId, {
          user_metadata: { is_verified: true, verified: true },
        });
      } catch {}

      // 9. Create in-app notification
      try {
        await createNotification(supabase, {
          userId: targetUserId,
          type: 'VERIFICATION_APPROVED',
          message: 'Your identity verification has been approved!',
          link: '/dashboard?tab=verification',
        });
      } catch {}

      // 10. Send email notification
      if (!userEmail) {
        try {
          const { data: u } = await supabase.from('User').select('email, Profile(firstName)').eq('id', targetUserId).maybeSingle();
          if (u) {
            userEmail = u.email;
            const prof = Array.isArray(u.Profile) ? u.Profile[0] : u.Profile;
            firstName = firstName || prof?.firstName || null;
          }
        } catch {}
      }

      if (userEmail) {
        try {
          await emailTemplates.verificationApprovedEmail(userEmail, firstName || undefined);
        } catch {}
      }

      return true;
    }),

  rejectVerification: adminProcedure
    .input(z.object({ verificationId: z.string(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = requireAdminSupabase(ctx);
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');

      let targetUserId: string | null = null;
      let userEmail: string | null = null;
      let firstName: string | null = null;

      // 1. Check `verifications` table (lowercase)
      try {
        const { data: vRow } = await (supabase as any)
          .from('verifications')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();

        if (vRow) {
          targetUserId = vRow.user_id;

          await (supabase as any)
            .from('verifications')
            .update({
              status: 'rejected',
              rejection_reason: input.reason,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cleanId);
        }
      } catch (vErr) {
        console.warn('verifications table lookup notice in reject:', vErr);
      }

      // 2. Check `Verification` table (PascalCase)
      try {
        const { data: verification } = await supabase
          .from('Verification')
          .select('userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
          .eq('id', cleanId)
          .maybeSingle();

        if (verification) {
          targetUserId = targetUserId || verification.userId;
          const userObj = verification.user as any;
          userEmail = Array.isArray(userObj) ? userObj[0]?.email : userObj?.email;
          const profile = Array.isArray(userObj) ? userObj[0]?.Profile : userObj?.Profile;
          firstName = Array.isArray(profile) ? profile[0]?.firstName : profile?.firstName;

          await supabase
            .from('Verification')
            .update({
              status: 'REJECTED',
              details: input.reason,
              rejectionReason: input.reason,
              updatedAt: new Date().toISOString(),
            })
            .eq('id', cleanId);
        }
      } catch (verErr) {
        console.warn('Verification table lookup notice in reject:', verErr);
      }

      // 3. Fallback: cleanId might be a userId directly
      if (!targetUserId) {
        try {
          const { data: userCheck } = await supabase
            .from('User')
            .select('id, email, Profile(firstName, lastName)')
            .eq('id', cleanId)
            .maybeSingle();
          if (userCheck) {
            targetUserId = userCheck.id;
            userEmail = userCheck.email;
            const profile = Array.isArray(userCheck.Profile) ? userCheck.Profile[0] : userCheck.Profile;
            firstName = profile?.firstName || null;
          }
        } catch {}
      }

      if (!targetUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification record or user not found' });
      }

      // 4. Update status in verifications table for this user
      try {
        await (supabase as any)
          .from('verifications')
          .update({
            status: 'rejected',
            rejection_reason: input.reason,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', targetUserId);
      } catch (vUpdateErr) {
        console.warn('verifications update notice in reject:', vUpdateErr);
      }

      // 5. Update status in Verification table for this user
      try {
        await supabase
          .from('Verification')
          .update({
            status: 'REJECTED',
            details: input.reason,
            rejectionReason: input.reason,
            updatedAt: new Date().toISOString(),
          })
          .eq('userId', targetUserId);
      } catch {}

      // 6. Ensure user's profile in profiles table remains is_verified = false
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            is_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch (profErr) {
        console.warn('Profile update notice in rejectVerification:', profErr);
      }

      // 7. Update User table isVerified = false
      try {
        await supabase
          .from('User')
          .update({
            isVerified: false,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch {}

      // 8. Update Supabase auth user_metadata if possible
      try {
        await supabase.auth.admin.updateUserById(targetUserId, {
          user_metadata: { is_verified: false, verified: false },
        });
      } catch {}

      // 9. Create in-app notification
      try {
        await createNotification(supabase, {
          userId: targetUserId,
          type: 'VERIFICATION_REJECTED',
          message: `Your identity verification was rejected. Reason: ${input.reason}`,
          link: '/dashboard?tab=verification',
        });
      } catch {}

      // 10. Send email notification
      if (!userEmail) {
        try {
          const { data: u } = await supabase.from('User').select('email, Profile(firstName)').eq('id', targetUserId).maybeSingle();
          if (u) {
            userEmail = u.email;
            const prof = Array.isArray(u.Profile) ? u.Profile[0] : u.Profile;
            firstName = firstName || prof?.firstName || null;
          }
        } catch {}
      }

      if (userEmail) {
        try {
          await emailTemplates.verificationRejectedEmail(userEmail, firstName || undefined, input.reason);
        } catch {}
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

    // 1. Fetch from Verification table (PascalCase)
    let legacyDocs: any[] = [];
    try {
      const { data: documents } = await supabase
        .from('Verification')
        .select('*')
        .eq('userId', userId)
        .not('verificationType', 'is', null)
        .order('createdAt', { ascending: false });
      if (documents) legacyDocs = documents;
    } catch {}

    // 2. Fetch from verifications table (lowercase)
    const synthesizedDocs: any[] = [];
    try {
      const { data: directVerifs } = await (supabase as any)
        .from('verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (directVerifs && directVerifs.length > 0) {
        for (const v of directVerifs) {
          const docType = v.document_type || 'ID Document';
          const status = (v.status || 'PENDING').toUpperCase();
          const createdAt = v.created_at || new Date().toISOString();

          if (v.id_front_url) {
            synthesizedDocs.push({
              id: `${v.id}-front`,
              userId,
              verificationType: 'ID_FRONT',
              documentType: `${docType} (Front)`,
              documentUrl: v.id_front_url,
              files: v.id_front_url,
              fileName: `${docType} (Front)`,
              status,
              createdAt,
              updatedAt: v.updated_at || createdAt,
              rejectionReason: v.rejection_reason || null,
            });
          }
          if (v.id_back_url) {
            synthesizedDocs.push({
              id: `${v.id}-back`,
              userId,
              verificationType: 'ID_BACK',
              documentType: `${docType} (Back)`,
              documentUrl: v.id_back_url,
              files: v.id_back_url,
              fileName: `${docType} (Back)`,
              status,
              createdAt,
              updatedAt: v.updated_at || createdAt,
              rejectionReason: v.rejection_reason || null,
            });
          }
          if (v.selfie_url) {
            synthesizedDocs.push({
              id: `${v.id}-selfie`,
              userId,
              verificationType: 'SELFIE',
              documentType: `Selfie with ${docType}`,
              documentUrl: v.selfie_url,
              files: v.selfie_url,
              fileName: `Selfie with ${docType}`,
              status,
              createdAt,
              updatedAt: v.updated_at || createdAt,
              rejectionReason: v.rejection_reason || null,
            });
          }
        }
      }
    } catch {}

    // Combine documents, prioritizing synthesizedDocs
    const combined = [...synthesizedDocs];
    for (const leg of legacyDocs) {
      if (!combined.some((c) => c.verificationType === leg.verificationType)) {
        combined.push(leg);
      }
    }

    return combined;
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
      const cleanId = input.verificationId.replace(/-(front|back|selfie)$/, '');

      // Try delete from verifications table
      try {
        await (adminSupabase as any)
          .from('verifications')
          .delete()
          .eq('id', cleanId)
          .eq('user_id', userId);
      } catch {}

      // Try delete from Verification table
      try {
        await adminSupabase
          .from('Verification')
          .delete()
          .eq('id', cleanId)
          .eq('userId', userId);
      } catch {}

      return true;
    }),

  /**
   * Submit all documents for review
   */
  submitForReview: protectedProcedure
    .input(z.object({ documentType: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
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

    // Get all user documents from Verification table
    const { data: documents } = await supabase
      .from('Verification')
      .select('verificationType, documentType')
      .eq('userId', userId);

    const docTypes = new Set(documents?.map((d) => d.verificationType) || []);

    // Also check verifications table
    try {
      const { data: directVerifs } = await (supabase as any)
        .from('verifications')
        .select('*')
        .eq('user_id', userId);

      if (directVerifs && directVerifs.length > 0) {
        for (const dv of directVerifs) {
          if (dv.id_front_url) docTypes.add('ID_FRONT');
          if (dv.id_back_url) docTypes.add('ID_BACK');
          if (dv.selfie_url) docTypes.add('SELFIE');
        }
      }
    } catch {}

    const isPassport =
      input?.documentType?.toLowerCase()?.includes('passport') ||
      documents?.some((d) => d.documentType?.toLowerCase()?.includes('passport'));

    // Validate required documents based on client type & document type
    // If Passport: Front and Selfie are required. Back is not required.
    // If National ID or Driving License: Front, Back, and Selfie are required.
    const requiredDocs = isPassport ? ['ID_FRONT', 'SELFIE'] : ['ID_FRONT', 'ID_BACK', 'SELFIE'];
    if (user.clientType === 'BUSINESS') {
      requiredDocs.push('BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS');
    }

    const missingDocs = requiredDocs.filter((type) => !docTypes.has(type));

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
        documentType: input?.documentType || (isPassport ? 'Passport' : 'Government ID'),
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
