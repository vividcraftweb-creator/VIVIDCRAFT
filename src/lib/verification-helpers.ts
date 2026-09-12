/**
 * Verification Helper Functions
 * Utilities for checking and enforcing client/freelancer verification requirements
 */

import { createAdminClient } from '@/lib/supabase/server';
import { TRPCError } from '@trpc/server';

export type VerificationStatus = 'not_started' | 'incomplete' | 'pending' | 'approved' | 'rejected';

export interface VerificationCheckResult {
  isVerified: boolean;
  status: VerificationStatus;
  message: string;
  requiredDocs: string[];
  uploadedDocs: string[];
  missingDocs: string[];
  rejectedDocs: Array<{ type: string; reason: string }>;
}

/**
 * Check if a user has completed verification and been approved
 * @param userId - The user ID to check
 * @param requireClientRole - If true, only CLIENTs need verification (default: true for backward compatibility)
 */
export async function checkUserVerification(
  userId: string,
  requireClientRole = true
): Promise<VerificationCheckResult> {
  const supabase = createAdminClient();

  let user: any = null;
  try {
    const { data, error } = await supabase
      .from('User')
      .select('clientType, role, isVerified')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (!error && data) user = data;
  } catch {}

  // Fallback to profiles table if User table doesn't have the record
  if (!user) {
    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, is_verified, verified')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (profile) {
        user = {
          clientType: 'INDIVIDUAL',
          role: profile.role || 'FREELANCER',
          isVerified: Boolean(profile.is_verified || profile.verified),
        } as any;
      }
    } catch {}
  }

  // Verification is strictly for role === 'ARTIST' / 'FREELANCER'. CLIENTs are completely exempt.
  const userRole = (user?.role || '').toUpperCase();
  if (userRole === 'CLIENT' || userRole === 'BUYER' || userRole === 'CUSTOMER') {
    return {
      isVerified: true,
      status: 'approved',
      message: 'Client accounts do not require verification',
      requiredDocs: [],
      uploadedDocs: [],
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  const clientType = user?.clientType || 'INDIVIDUAL';

  // Get user's verification documents safely from verifications or Verification table
  let documents: any[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from('verifications')
      .select('*')
      .eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length > 0) {
      documents = data.map((d: any) => ({
        verificationType: d.document_type || d.verification_type || 'ID_FRONT',
        status: (d.status || '').toUpperCase(),
        rejectionReason: d.rejection_reason || d.rejectionReason,
      }));
    }
  } catch {}

  if (documents.length === 0) {
    try {
      const { data, error } = await supabase
        .from('Verification')
        .select('*')
        .eq('userId', userId);
      if (!error && data) documents = data;
    } catch {}
  }

  const docs = documents || [];
  const uploadedTypes = docs.map(d => d.verificationType).filter(Boolean);

  const requiredDocs = ['ID_FRONT', 'ID_BACK', 'SELFIE'];
  const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));
  const rejectedDocs = docs
    .filter(d => (d.status || '').toUpperCase() === 'REJECTED')
    .map(d => ({ type: d.verificationType, reason: d.rejectionReason || 'Document could not be verified' }));

  // Strict Overall Status logic:
  // If ANY doc is rejected -> Show Badge: Rejected (Red).
  // If ALL required docs are approved -> Show Badge: Verified (Green).
  // Otherwise -> Show Badge: Pending (Yellow).
  // DO NOT display Verified green badge if any submitted document status is rejected or pending.

  if (rejectedDocs.length > 0 || docs.some(d => (d.status || '').toUpperCase() === 'REJECTED')) {
    return {
      isVerified: false,
      status: 'rejected',
      message: 'Some documents were rejected. Please review the feedback and re-upload them.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs,
      rejectedDocs,
    };
  }

  if (docs.length === 0) {
    return {
      isVerified: Boolean(user?.isVerified),
      status: user?.isVerified ? 'approved' : 'not_started',
      message: user?.isVerified
        ? 'Account verified'
        : 'Upload a government-issued ID to fully activate your account.',
      requiredDocs,
      uploadedDocs: [],
      missingDocs: user?.isVerified ? [] : requiredDocs,
      rejectedDocs: [],
    };
  }

  const hasPendingSubmission = docs.some(d => (d.status || '').toUpperCase() === 'PENDING');
  const allApproved = docs.length > 0 && docs.every(d => (d.status || '').toUpperCase() === 'APPROVED');

  if (allApproved && (user?.isVerified ?? true)) {
    return {
      isVerified: true,
      status: 'approved',
      message: 'Identity verification approved',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  if (hasPendingSubmission || missingDocs.length > 0) {
    return {
      isVerified: false,
      status: 'pending',
      message: 'Your verification is under review. Our team will review your ID shortly.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs,
      rejectedDocs: [],
    };
  }

  return {
    isVerified: false,
    status: 'pending',
    message: 'Your verification is under review.',
    requiredDocs,
    uploadedDocs: uploadedTypes,
    missingDocs: [],
    rejectedDocs: [],
  };
}

/**
 * Require verification for an action (throws if not verified)
 */
export async function requireVerification(userId: string): Promise<void> {
  const result = await checkUserVerification(userId);

  if (!result.isVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: result.message,
    });
  }
}

/**
 * Get verification progress percentage
 */
export function getVerificationProgress(result: VerificationCheckResult): number {
  if (result.status === 'approved') return 100;
  if (result.requiredDocs.length === 0) return 0;

  const uploadedRequired = result.uploadedDocs.filter(doc =>
    result.requiredDocs.includes(doc)
  ).length;

  return Math.round((uploadedRequired / result.requiredDocs.length) * 100);
}
