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
  const supabase = ctx.adminSupabase || createAdminClient();

  if (!supabase) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unable to initialize admin Supabase client.',
    });
  }

  return supabase;
};

export const verificationDocumentPayloadSchema = z.object({
  // Slot-based identifiers
  verificationType: z
    .enum([
      'ID_FRONT',
      'ID_BACK',
      'SELFIE',
      'BUSINESS_REGISTRATION',
      'PROOF_OF_ADDRESS',
      'TAX_DOCUMENT',
      'BUSINESS_LICENSE',
    ])
    .optional()
    .nullable(),
  fileUrl: z.string().optional().nullable(),
  files: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),

  // Document type
  documentType: z.string().optional().nullable(),
  document_type: z.string().optional().nullable(),
  idType: z.string().optional().nullable(),

  // Front URL variants
  id_front_url: z.string().optional().nullable(),
  front_url: z.string().optional().nullable(),
  idFrontUrl: z.string().optional().nullable(),

  // Back URL variants (accepts optional or nullable string so single file uploads do not crash)
  id_back_url: z.string().optional().nullable(),
  back_url: z.string().optional().nullable(),
  idBackUrl: z.string().optional().nullable(),

  // Selfie URL variants (accepts optional or nullable string so single file uploads do not crash)
  selfie_url: z.string().optional().nullable(),
  selfieUrl: z.string().optional().nullable(),

  // Status & User
  status: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  details: z.string().optional().nullable(),
});

async function handleVerificationDocumentMutation(
  ctx: Context,
  input: z.infer<typeof verificationDocumentPayloadSchema>
) {
  const userId = ctx.session?.user?.id || input.user_id || input.userId;
  if (!userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required to submit verification documents.',
    });
  }

  // Use admin client to bypass RLS failures on document creation
  const adminSupabase = ctx.adminSupabase || createAdminClient() || (await createClient());

  const documentType =
    input.document_type ||
    input.documentType ||
    input.idType ||
    (input.verificationType ? input.verificationType.replace(/_/g, ' ') : 'Government ID') ||
    'Government ID';

  const frontUrl =
    input.id_front_url ||
    input.front_url ||
    input.idFrontUrl ||
    ((!input.verificationType || input.verificationType === 'ID_FRONT') ? (input.fileUrl || input.files) : null) ||
    null;

  const backUrl =
    input.id_back_url !== undefined
      ? input.id_back_url
      : input.back_url !== undefined
      ? input.back_url
      : input.idBackUrl !== undefined
      ? input.idBackUrl
      : input.verificationType === 'ID_BACK'
      ? (input.fileUrl || input.files)
      : null;

  const selfieUrl =
    input.selfie_url !== undefined
      ? input.selfie_url
      : input.selfieUrl !== undefined
      ? input.selfieUrl
      : input.verificationType === 'SELFIE'
      ? (input.fileUrl || input.files)
      : null;

  console.log('[Verification Submit Router] Received submission payload for user:', userId, {
    documentType,
    frontUrl,
    backUrl,
    selfieUrl,
    status: input.status || 'pending',
  });

  let savedRecord: any = null;

  // 1. Check existing record in `verifications` table (lowercase)
  // Payload: { user_id, document_type, id_front_url, id_back_url, selfie_url, status: 'pending' }
  try {
    const { data: existingV } = await (adminSupabase as any)
      .from('verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingV) {
      const updatePayload: Record<string, any> = {
        document_type: documentType,
        status: input.status || 'pending',
        updated_at: new Date().toISOString(),
      };

      const isSingleSlot = Boolean(
        input.verificationType &&
        ['ID_FRONT', 'ID_BACK', 'SELFIE', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS', 'TAX_DOCUMENT', 'BUSINESS_LICENSE'].includes(input.verificationType) &&
        !input.id_front_url &&
        !input.front_url
      );

      if (isSingleSlot) {
        if (input.verificationType === 'ID_FRONT' && frontUrl) {
          updatePayload.id_front_url = frontUrl;
        } else if (input.verificationType === 'ID_BACK' && backUrl) {
          updatePayload.id_back_url = backUrl;
        } else if (input.verificationType === 'SELFIE' && selfieUrl) {
          updatePayload.selfie_url = selfieUrl;
        }
      } else {
        // Full submission or explicit multi-field payload:
        if (frontUrl !== undefined && frontUrl !== null) {
          updatePayload.id_front_url = frontUrl;
        } else if (existingV.id_front_url) {
          updatePayload.id_front_url = existingV.id_front_url;
        }

        if (input.id_back_url !== undefined) {
          updatePayload.id_back_url = input.id_back_url;
        } else if (input.back_url !== undefined) {
          updatePayload.id_back_url = input.back_url;
        } else if (backUrl !== null) {
          updatePayload.id_back_url = backUrl;
        } else {
          updatePayload.id_back_url = existingV.id_back_url ?? null;
        }

        if (input.selfie_url !== undefined) {
          updatePayload.selfie_url = input.selfie_url;
        } else if (input.selfieUrl !== undefined) {
          updatePayload.selfie_url = input.selfieUrl;
        } else if (selfieUrl !== null) {
          updatePayload.selfie_url = selfieUrl;
        } else {
          updatePayload.selfie_url = existingV.selfie_url ?? null;
        }
      }

      const { data: updated, error: uErr } = await (adminSupabase as any)
        .from('verifications')
        .update(updatePayload)
        .eq('id', existingV.id)
        .select()
        .single();

      if (!uErr && updated) {
        savedRecord = updated;
        console.log('[Verification Submit Router] Successfully updated public.verifications record:', updated);
      } else if (uErr) {
        console.warn('[Verification Submit Router] verifications table update notice:', uErr);
      }
    } else {
      const insertPayload = {
        user_id: userId,
        document_type: documentType,
        id_front_url: frontUrl,
        id_back_url: backUrl ?? null,
        selfie_url: selfieUrl ?? null,
        status: input.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: iErr } = await (adminSupabase as any)
        .from('verifications')
        .insert(insertPayload)
        .select()
        .single();

      if (!iErr && inserted) {
        savedRecord = inserted;
        console.log('[Verification Submit Router] Successfully inserted public.verifications record:', inserted);
      } else if (iErr) {
        console.warn('[Verification Submit Router] verifications table insert notice:', iErr);
      }
    }
  } catch (vErr) {
    console.error('[Verification Submit Router] verifications table operation exception:', vErr);
  }

  // 2. Mirror into `Verification` table (PascalCase) using admin client
  try {
    const vType =
      input.verificationType ||
      (frontUrl ? 'ID_FRONT' : backUrl ? 'ID_BACK' : selfieUrl ? 'SELFIE' : 'ID_FRONT');
    const primaryFile = input.fileUrl || input.files || frontUrl || backUrl || selfieUrl || '';

    const { data: existingDoc } = await adminSupabase
      .from('Verification')
      .select('id')
      .eq('userId', userId)
      .eq('verificationType', vType)
      .maybeSingle();

    const docData = {
      userId,
      verificationType: vType,
      documentType,
      files: primaryFile,
      expiryDate: input.expiryDate ? new Date(input.expiryDate).toISOString() : null,
      status: 'PENDING' as const,
      updatedAt: new Date().toISOString(),
    };

    if (existingDoc) {
      const { data: updatedDoc } = await adminSupabase
        .from('Verification')
        .update(docData)
        .eq('id', existingDoc.id)
        .select()
        .single();

      if (!savedRecord && updatedDoc) {
        savedRecord = updatedDoc;
      }
    } else {
      const { data: insertedDoc } = await adminSupabase
        .from('Verification')
        .insert({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...docData,
        })
        .select()
        .single();

      if (!savedRecord && insertedDoc) {
        savedRecord = insertedDoc;
      }
    }
  } catch (verErr) {
    console.warn('Verification table mirror notice:', verErr);
  }

  return savedRecord || {
    id: `v-${Date.now()}`,
    user_id: userId,
    document_type: documentType,
    id_front_url: frontUrl,
    id_back_url: backUrl ?? null,
    selfie_url: selfieUrl ?? null,
    status: 'pending',
  };
export async function fetchAllVerificationsList(supabase: any) {
  try {
    if (!supabase) {
      return [];
    }

    console.log('[Admin getVerifications Router] Fetching verifications from public.verifications...');

    // 1. Fetch strictly from public.verifications
    let vList: any[] = [];
    try {
      const { data, error } = await (supabase as any)
        .from('verifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        vList = data;
      } else if (error) {
        console.warn('[Admin getVerifications Router] public.verifications query error:', error);
      }
    } catch (e) {
      console.warn('[Admin getVerifications Router] Exception querying public.verifications:', e);
    }

    // Fallback with user client if admin client returned empty
    if (vList.length === 0) {
      try {
        const userSupabase = await createClient();
        const { data: fallbackData } = await (userSupabase as any)
          .from('verifications')
          .select('*')
          .order('created_at', { ascending: false });
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          vList = fallbackData;
        }
      } catch {}
    }

    console.log(`[Admin getVerifications Router] Retrieved ${vList.length} records from public.verifications`);

    // 2. Fetch profiles for user_ids
    const userIds = Array.from(new Set(vList.map((v) => v.user_id).filter(Boolean)));
    const profilesMap = new Map<string, any>();

    if (userIds.length > 0) {
      try {
        const { data: pList, error: pErr } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, first_name, last_name, email, role, client_type, is_verified, company_name')
          .in('id', userIds);

        if (Array.isArray(pList)) {
          pList.forEach((p) => profilesMap.set(p.id, p));
        }
        if (pErr) {
          console.warn('[Admin getVerifications Router] profiles join notice:', pErr);
        }
      } catch (pErr) {
        console.warn('[Admin getVerifications Router] profiles lookup exception:', pErr);
      }
    }

    // Supabase Auth fallback for missing emails
    const authUsersMap = new Map<string, any>();
    const missingEmailIds = userIds.filter((uid) => !profilesMap.get(uid)?.email);
    if (missingEmailIds.length > 0) {
      await Promise.all(
        missingEmailIds.map(async (uid) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(uid);
            if (authData?.user) authUsersMap.set(uid, authData.user);
          } catch {}
        })
      );
    }

    // 3. Map to normalized records
    const normalizedRecords = vList.map((v) => {
      const prof = profilesMap.get(v.user_id);
      const authUser = authUsersMap.get(v.user_id);

      const email = prof?.email || authUser?.email || 'User';
      const rawRole = (prof?.role || authUser?.user_metadata?.role || 'ARTIST').toUpperCase();
      const role = rawRole === 'FREELANCER' || rawRole === 'ARTIST' ? 'ARTIST' : rawRole;
      const fullName =
        prof?.full_name ||
        `${prof?.first_name || authUser?.user_metadata?.firstName || ''} ${prof?.last_name || authUser?.user_metadata?.lastName || ''}`.trim() ||
        email.split('@')[0] ||
        'Artist';
      const firstName = prof?.first_name || authUser?.user_metadata?.firstName || fullName.split(' ')[0] || '';
      const lastName = prof?.last_name || authUser?.user_metadata?.lastName || fullName.split(' ').slice(1).join(' ') || '';

      const frontUrl = v.id_front_url || v.front_url || v.document_url || v.documentUrl || v.files || null;
      const backUrl = v.id_back_url || v.back_url || null;
      const selfieUrl = v.selfie_url || null;

      const statusLower = (v.status || 'pending').toLowerCase();
      const statusUpper = statusLower.toUpperCase();

      return {
        id: v.id,
        user_id: v.user_id,
        userId: v.user_id,
        document_type: v.document_type || 'ID Document',
        documentType: v.document_type || 'ID Document',
        id_front_url: frontUrl,
        front_url: frontUrl,
        id_back_url: backUrl,
        back_url: backUrl,
        selfie_url: selfieUrl,
        status: statusUpper,
        statusLower,
        statusUpper,
        created_at: v.created_at,
        createdAt: v.created_at,
        updated_at: v.updated_at,
        updatedAt: v.updated_at,
        rejection_reason: v.rejection_reason || null,
        rejectionReason: v.rejection_reason || null,
        files: [frontUrl, backUrl, selfieUrl].filter(Boolean).join(','),
        documentUrl: frontUrl || selfieUrl || backUrl || null,
        user: {
          id: v.user_id,
          email,
          role,
          full_name: fullName,
          fullName,
          firstName,
          lastName,
          Profile: [{ firstName, lastName, full_name: fullName, companyName: prof?.company_name || null }],
        },
        profiles: {
          id: v.user_id,
          email,
          role,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          client_type: prof?.client_type || null,
          is_verified: prof?.is_verified ?? false,
        },
        User: {
          id: v.user_id,
          email,
          role,
          Profile: [{ firstName, lastName, full_name: fullName }],
        },
      };
    });

    console.log(`[Admin getVerifications Router] Returning ${normalizedRecords.length} records to client`);
    return normalizedRecords;
  } catch (err) {
    console.error('[Admin getVerifications Router] Unexpected exception:', err);
    return [];
  }
}

export const verificationsRouter = router({
  submit: protectedProcedure
    .input(verificationDocumentPayloadSchema)
    .mutation(async ({ ctx, input }) => {
      console.log('[Verification Submit Router (submit)] Input payload:', ctx.session.user.id, input);
      return await handleVerificationDocumentMutation(ctx, input);
    }),

  submitVerification: protectedProcedure
    .input(verificationDocumentPayloadSchema)
    .mutation(async ({ ctx, input }) => {
      return await handleVerificationDocumentMutation(ctx, input);
    }),

  createVerification: protectedProcedure
    .input(verificationDocumentPayloadSchema)
    .mutation(async ({ ctx, input }) => {
      return await handleVerificationDocumentMutation(ctx, input);
    }),

  /**
   * Reset / Cancel pending verification request
   * Allows users with premature or incomplete submissions to reset and re-upload documents
   */
  resetVerificationRequest: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const adminSupabase = ctx.adminSupabase || createAdminClient() || (await createClient());

    try {
      await (adminSupabase as any)
        .from('verifications')
        .delete()
        .eq('user_id', userId)
        .neq('status', 'approved');
    } catch (err) {
      console.warn('Error deleting from verifications table on reset:', err);
    }

    try {
      await (adminSupabase as any)
        .from('Verification')
        .delete()
        .eq('userId', userId)
        .neq('status', 'APPROVED');
    } catch (err) {
      console.warn('Error deleting from Verification table on reset:', err);
    }

    try {
      await (adminSupabase as any)
        .from('profiles')
        .update({ is_verified: false, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch {}

    return {
      success: true,
      message: 'Verification request reset. You can now re-upload your documents.',
    };
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
      const supabase = ctx.adminSupabase || createAdminClient();
      if (!supabase) return [];

      let verifications: any[] = [];
      const userIds: string[] = [];

      // 1. Fetch strictly from public.verifications table with profile joins
      try {
        const { data: vList, error: vError } = await (supabase as any)
          .from('verifications')
          .select(`
            *,
            profiles (
              id,
              full_name,
              first_name,
              last_name,
              email,
              role,
              client_type,
              is_verified
            )
          `)
          .ilike('status', 'pending')
          .order('created_at', { ascending: false });

        let rawList = vList;
        if (vError || !rawList) {
          const { data: fallbackList } = await (supabase as any)
            .from('verifications')
            .select('*')
            .ilike('status', 'pending')
            .order('created_at', { ascending: false });
          rawList = fallbackList || [];
        }

        if (Array.isArray(rawList)) {
          for (const dp of rawList) {
            const uid = dp.user_id || dp.userId;
            if (uid) userIds.push(uid);

            const frontUrl = dp.id_front_url || dp.front_url || dp.id_front || dp.frontUrl || dp.document_url || dp.documentUrl || dp.file_url || dp.fileUrl || dp.files || null;
            const backUrl = dp.id_back_url || dp.back_url || dp.id_back || dp.backUrl || null;
            const selfieUrl = dp.selfie_url || dp.selfieUrl || dp.selfie || null;
            const prof = Array.isArray(dp.profiles) ? dp.profiles[0] : dp.profiles;

            const userObj = prof ? {
              id: uid,
              email: prof.email,
              role: prof.role,
              Profile: [{
                firstName: prof.first_name || prof.full_name?.split(' ')[0] || '',
                lastName: prof.last_name || prof.full_name?.split(' ').slice(1).join(' ') || '',
                full_name: prof.full_name,
              }],
            } : undefined;

            verifications.push({
              id: dp.id,
              userId: uid,
              verificationType: 'ID_FRONT',
              documentType: dp.document_type || 'Identity Verification',
              files: frontUrl || backUrl || selfieUrl,
              id_front_url: frontUrl,
              id_back_url: backUrl,
              selfie_url: selfieUrl,
              status: 'PENDING',
              createdAt: dp.created_at,
              user: userObj,
            });
          }
        }
      } catch (err) {
        console.warn('Error querying verifications table in getPendingVerifications:', err);
      }

      // 2. Fetch from legacy Verification table
      try {
        const { data: legacyList } = await supabase
          .from('Verification')
          .select(`
            *,
            user:User!Verification_userId_fkey(*)
          `)
          .eq('status', 'PENDING');

        if (Array.isArray(legacyList)) {
          for (const leg of legacyList) {
            if (!verifications.some((v) => v.userId === leg.userId || v.id === leg.id)) {
              verifications.push(leg);
            }
          }
        }
      } catch (err) {
        // legacy table fallback
      }

      return verifications;
    } catch (err) {
      console.error('getPendingVerifications exception:', err);
      return [];
    }
  }),

  getAllPending: adminProcedure.query(async ({ ctx }) => {
    try {
      const supabase = ctx.adminSupabase || createAdminClient();
      if (!supabase) return [];

      let verifications: any[] = [];
      const userIds: string[] = [];

      // 1. Fetch strictly from public.verifications table with profile joins
      try {
        const { data: vList, error: vError } = await (supabase as any)
          .from('verifications')
          .select(`
            *,
            profiles (
              id,
              full_name,
              first_name,
              last_name,
              email,
              role,
              client_type,
              is_verified
            )
          `)
          .ilike('status', 'pending')
          .order('created_at', { ascending: false });

        let rawList = vList;
        if (vError || !rawList) {
          const { data: fallbackList } = await (supabase as any)
            .from('verifications')
            .select('*')
            .ilike('status', 'pending')
            .order('created_at', { ascending: false });
          rawList = fallbackList || [];
        }

        if (Array.isArray(rawList)) {
          for (const dp of rawList) {
            const uid = dp.user_id || dp.userId;
            if (uid) userIds.push(uid);

            const frontUrl = dp.id_front_url || dp.front_url || dp.id_front || dp.frontUrl || dp.document_url || dp.documentUrl || dp.file_url || dp.fileUrl || dp.files || null;
            const backUrl = dp.id_back_url || dp.back_url || dp.id_back || dp.backUrl || null;
            const selfieUrl = dp.selfie_url || dp.selfieUrl || dp.selfie || null;
            const prof = Array.isArray(dp.profiles) ? dp.profiles[0] : dp.profiles;

            const userObj = prof ? {
              id: uid,
              email: prof.email,
              role: prof.role,
              Profile: [{
                firstName: prof.first_name || prof.full_name?.split(' ')[0] || '',
                lastName: prof.last_name || prof.full_name?.split(' ').slice(1).join(' ') || '',
                full_name: prof.full_name,
              }],
            } : undefined;

            verifications.push({
              id: dp.id,
              userId: uid,
              verificationType: 'ID_FRONT',
              documentType: dp.document_type || 'Identity Verification',
              files: frontUrl || backUrl || selfieUrl,
              id_front_url: frontUrl,
              id_back_url: backUrl,
              selfie_url: selfieUrl,
              status: 'PENDING',
              createdAt: dp.created_at,
              user: userObj,
            });
          }
        }
      } catch (err) {
        console.warn('Error querying verifications table in getAllPending:', err);
      }

      // 2. Fetch from legacy Verification table
      try {
        const { data: legacyList } = await supabase
          .from('Verification')
          .select(`
            *,
            user:User!Verification_userId_fkey(*)
          `)
          .eq('status', 'PENDING');

        if (Array.isArray(legacyList)) {
          for (const leg of legacyList) {
            if (!verifications.some((v) => v.userId === leg.userId || v.id === leg.id)) {
              verifications.push(leg);
            }
          }
        }
      } catch {}

      return verifications;
    } catch (err) {
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
          .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
          .maybeSingle();
        if (vRow) targetUserId = vRow.user_id;
      } catch {}

      // 2. Check Verification (PascalCase)
      if (!targetUserId) {
        try {
          const { data: verification } = await supabase
            .from('Verification')
            .select('userId')
            .or(`id.eq.${cleanId},userId.eq.${cleanId}`)
            .maybeSingle();
          if (verification) targetUserId = verification.userId;
        } catch {}
      }

      // 3. Check profiles table
      if (!targetUserId) {
        try {
          const { data: prof } = await (supabase as any)
            .from('profiles')
            .select('id')
            .eq('id', cleanId)
            .maybeSingle();
          if (prof) targetUserId = prof.id;
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
      const supabase = ctx.adminSupabase || createAdminClient() || (await createClient());
      if (!supabase) {
        return [];
      }

      console.log('[Admin getVerifications Router] Fetching verifications from public.verifications...');

      // 1. Fetch strictly from public.verifications
      let vList: any[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from('verifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          vList = data;
        } else if (error) {
          console.warn('[Admin getVerifications Router] public.verifications query error:', error);
        }
      } catch (e) {
        console.warn('[Admin getVerifications Router] Exception querying public.verifications:', e);
      }

      // Fallback with user client if admin client returned empty
      if (vList.length === 0) {
        try {
          const userSupabase = await createClient();
          const { data: fallbackData } = await (userSupabase as any)
            .from('verifications')
            .select('*')
            .order('created_at', { ascending: false });
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            vList = fallbackData;
          }
        } catch {}
      }

      console.log(`[Admin getVerifications Router] Retrieved ${vList.length} records from public.verifications`);

      // 2. Fetch profiles for user_ids
      const userIds = Array.from(new Set(vList.map((v) => v.user_id).filter(Boolean)));
      const profilesMap = new Map<string, any>();

      if (userIds.length > 0) {
        try {
          const { data: pList, error: pErr } = await (supabase as any)
            .from('profiles')
            .select('id, full_name, first_name, last_name, email, role, client_type, is_verified, company_name')
            .in('id', userIds);

          if (Array.isArray(pList)) {
            pList.forEach((p) => profilesMap.set(p.id, p));
          }
          if (pErr) {
            console.warn('[Admin getVerifications Router] profiles join notice:', pErr);
          }
        } catch (pErr) {
          console.warn('[Admin getVerifications Router] profiles lookup exception:', pErr);
        }
      }

      // Supabase Auth fallback for missing emails
      const authUsersMap = new Map<string, any>();
      const missingEmailIds = userIds.filter((uid) => !profilesMap.get(uid)?.email);
      if (missingEmailIds.length > 0) {
        await Promise.all(
          missingEmailIds.map(async (uid) => {
            try {
              const { data: authData } = await supabase.auth.admin.getUserById(uid);
              if (authData?.user) authUsersMap.set(uid, authData.user);
            } catch {}
          })
        );
      }

      // 3. Map to normalized records
      const normalizedRecords = vList.map((v) => {
        const prof = profilesMap.get(v.user_id);
        const authUser = authUsersMap.get(v.user_id);

        const email = prof?.email || authUser?.email || 'User';
        const rawRole = (prof?.role || authUser?.user_metadata?.role || 'ARTIST').toUpperCase();
        const role = rawRole === 'FREELANCER' || rawRole === 'ARTIST' ? 'ARTIST' : rawRole;
        const fullName =
          prof?.full_name ||
          `${prof?.first_name || authUser?.user_metadata?.firstName || ''} ${prof?.last_name || authUser?.user_metadata?.lastName || ''}`.trim() ||
          email.split('@')[0] ||
          'Artist';
        const firstName = prof?.first_name || authUser?.user_metadata?.firstName || fullName.split(' ')[0] || '';
        const lastName = prof?.last_name || authUser?.user_metadata?.lastName || fullName.split(' ').slice(1).join(' ') || '';

        const frontUrl = v.id_front_url || v.front_url || v.document_url || v.documentUrl || v.files || null;
        const backUrl = v.id_back_url || v.back_url || null;
        const selfieUrl = v.selfie_url || null;

        const statusLower = (v.status || 'pending').toLowerCase();
        const statusUpper = statusLower.toUpperCase();

        return {
          id: v.id,
          user_id: v.user_id,
          userId: v.user_id,
          document_type: v.document_type || 'ID Document',
          documentType: v.document_type || 'ID Document',
          id_front_url: frontUrl,
          front_url: frontUrl,
          id_back_url: backUrl,
          back_url: backUrl,
          selfie_url: selfieUrl,
          status: statusUpper,
          statusLower,
          statusUpper,
          created_at: v.created_at,
          createdAt: v.created_at,
          updated_at: v.updated_at,
          updatedAt: v.updated_at,
          rejection_reason: v.rejection_reason || null,
          rejectionReason: v.rejection_reason || null,
          files: [frontUrl, backUrl, selfieUrl].filter(Boolean).join(','),
          documentUrl: frontUrl || selfieUrl || backUrl || null,
          user: {
            id: v.user_id,
            email,
            role,
            full_name: fullName,
            fullName,
            firstName,
            lastName,
            Profile: [{ firstName, lastName, full_name: fullName, companyName: prof?.company_name || null }],
          },
          profiles: {
            id: v.user_id,
            email,
            role,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            client_type: prof?.client_type || null,
            is_verified: prof?.is_verified ?? false,
          },
          User: {
            id: v.user_id,
            email,
            role,
            Profile: [{ firstName, lastName, full_name: fullName }],
          },
        };
      });

      console.log(`[Admin getVerifications Router] Returning ${normalizedRecords.length} records to client`);
      return normalizedRecords;
    } catch (err) {
      console.error('[Admin getVerifications Router] Unexpected exception:', err);
      return [];
    }
  }),

  getQueue: adminProcedure.query(async ({ ctx }) => {
    return await (verificationsRouter as any).createCaller(ctx).getVerifications();
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
          .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (vRow) {
          targetUserId = vRow.user_id;

          await (supabase as any)
            .from('verifications')
            .update({
              status: 'approved',
              updated_at: new Date().toISOString(),
            })
            .or(`id.eq.${cleanId},user_id.eq.${vRow.user_id}`);
        }
      } catch (vErr) {
        console.warn('verifications table lookup notice in approveVerification:', vErr);
      }

      // 2. Check `Verification` table (PascalCase)
      try {
        const { data: verification } = await supabase
          .from('Verification')
          .select('id, userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
          .or(`id.eq.${cleanId},userId.eq.${cleanId}`)
          .order('createdAt', { ascending: false })
          .limit(1)
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
            .or(`id.eq.${cleanId},userId.eq.${verification.userId}`);
        }
      } catch (verErr) {
        console.warn('Verification table lookup notice in approveVerification:', verErr);
      }

      // 3. Fallback: cleanId might be a userId directly in User table
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

      // 3b. Fallback: check profiles table
      if (!targetUserId) {
        try {
          const { data: profCheck } = await (supabase as any)
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('id', cleanId)
            .maybeSingle();
          if (profCheck) {
            targetUserId = profCheck.id;
            userEmail = profCheck.email;
            firstName = profCheck.first_name;
          }
        } catch {}
      }

      // 3c. Fallback: check Supabase auth admin
      if (!targetUserId) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(cleanId);
          if (authData?.user) {
            targetUserId = authData.user.id;
            userEmail = authData.user.email || null;
            firstName = authData.user.user_metadata?.firstName || authData.user.user_metadata?.first_name || null;
          }
        } catch {}
      }

      if (!targetUserId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
          targetUserId = cleanId;
        } else {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification record or user not found' });
        }
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
        console.log('[Admin approveVerification] Set verifications.status = approved and profiles.is_verified = true for user:', targetUserId);
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
          .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
          .order('created_at', { ascending: false })
          .limit(1)
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
            .or(`id.eq.${cleanId},user_id.eq.${vRow.user_id}`);
        }
      } catch (vErr) {
        console.warn('verifications table lookup notice in reject:', vErr);
      }

      // 2. Check `Verification` table (PascalCase)
      try {
        const { data: verification } = await supabase
          .from('Verification')
          .select('id, userId, user:User!Verification_userId_fkey(email, Profile(firstName, lastName))')
          .or(`id.eq.${cleanId},userId.eq.${cleanId}`)
          .order('createdAt', { ascending: false })
          .limit(1)
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
            .or(`id.eq.${cleanId},userId.eq.${verification.userId}`);
        }
      } catch (verErr) {
        console.warn('Verification table lookup notice in reject:', verErr);
      }

      // 3. Fallback: cleanId might be a userId directly in User table
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

      // 3b. Fallback: check profiles table
      if (!targetUserId) {
        try {
          const { data: profCheck } = await (supabase as any)
            .from('profiles')
            .select('id, email, first_name, last_name')
            .eq('id', cleanId)
            .maybeSingle();
          if (profCheck) {
            targetUserId = profCheck.id;
            userEmail = profCheck.email;
            firstName = profCheck.first_name;
          }
        } catch {}
      }

      // 3c. Fallback: check Supabase auth admin
      if (!targetUserId) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(cleanId);
          if (authData?.user) {
            targetUserId = authData.user.id;
            userEmail = authData.user.email || null;
            firstName = authData.user.user_metadata?.firstName || authData.user.user_metadata?.first_name || null;
          }
        } catch {}
      }

      if (!targetUserId) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
          targetUserId = cleanId;
        } else {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Verification record or user not found' });
        }
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
        console.log('[Admin rejectVerification] Set verifications.status = rejected and profiles.is_verified = false for user:', targetUserId);
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
   * Accepts optional or nullable strings for back_url / id_back_url and selfie_url so single file uploads do not crash
   */
  uploadDocument: protectedProcedure
    .input(verificationDocumentPayloadSchema)
    .mutation(async ({ ctx, input }) => {
      return await handleVerificationDocumentMutation(ctx, input);
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
