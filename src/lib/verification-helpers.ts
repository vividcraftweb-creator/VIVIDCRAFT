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

  // Read profiles table first for primary role and verification state
  let profile: any = null;
  try {
    const { data: profileRow } = await (supabase as any)
      .from('profiles')
      .select('id, role, client_type, is_verified, verified, verification_status')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (profileRow) profile = profileRow;
  } catch {}

  // Fallback to User table if needed for legacy clientType/role
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

  // Verification is strictly for role === 'ARTIST' / 'FREELANCER'. CLIENTs are completely exempt.
  const userRole = (profile?.role || user?.role || '').toUpperCase();
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

  const profileIsVerified = Boolean(profile?.is_verified ?? profile?.verified ?? user?.isVerified ?? false);
  const profileVerificationStatus = (profile?.verification_status || '').toLowerCase();

  // Strict Overall Status logic:
  // If ANY doc is rejected or profile.verification_status is 'rejected' -> Show Badge: Rejected (Red).
  // If ALL required docs are approved or profile.verification_status is 'approved' -> Show Badge: Verified (Green).
  // Otherwise -> Show Badge: Pending (Yellow) or Not Started.
  // DO NOT display Verified green badge if any submitted document status is rejected or pending.

  if (profileVerificationStatus === 'rejected' || rejectedDocs.length > 0 || docs.some(d => (d.status || '').toUpperCase() === 'REJECTED')) {
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
    if (profileVerificationStatus === 'pending') {
      return {
        isVerified: false,
        status: 'pending',
        message: 'Your verification is under review. Our team will review your ID shortly.',
        requiredDocs,
        uploadedDocs: [],
        missingDocs: requiredDocs,
        rejectedDocs: [],
      };
    }
    const isApprovedState = profileVerificationStatus === 'approved' || profileIsVerified;
    return {
      isVerified: isApprovedState,
      status: isApprovedState ? 'approved' : 'not_started',
      message: isApprovedState
        ? 'Account verified'
        : 'Upload a government-issued ID to fully activate your account.',
      requiredDocs,
      uploadedDocs: [],
      missingDocs: isApprovedState ? [] : requiredDocs,
      rejectedDocs: [],
    };
  }

  const hasPendingSubmission = docs.some(d => (d.status || '').toUpperCase() === 'PENDING');
  const allApproved = docs.length > 0 && docs.every(d => (d.status || '').toUpperCase() === 'APPROVED');

  if (allApproved || profileVerificationStatus === 'approved' || (profileIsVerified && !hasPendingSubmission)) {
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

  if (hasPendingSubmission || missingDocs.length > 0 || profileVerificationStatus === 'pending') {
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
