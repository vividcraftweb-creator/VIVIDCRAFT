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

  // Get user's client type from User table
  let { data: user } = await supabase
    .from('User')
    .select('clientType, role, isVerified')
    .eq('id', userId)
    .maybeSingle();

  // Fallback to profiles table if User table doesn't have the record
  if (!user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      user = {
        clientType: 'INDIVIDUAL',
        role: profile.role || 'FREELANCER',
        isVerified: false,
      } as any;
    }
  }

  // Only skip verification check if requireClientRole is true AND user is not a CLIENT
  if (requireClientRole && (!user || user.role !== 'CLIENT')) {
    return {
      isVerified: true,
      status: 'approved',
      message: 'Verification complete',
      requiredDocs: [],
      uploadedDocs: [],
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  const clientType = user?.clientType || 'INDIVIDUAL';

  // Get user's verification documents
  const { data: documents } = await supabase
    .from('Verification')
    .select('*')
    .eq('userId', userId);

  const docs = documents || [];
  const uploadedTypes = docs.map(d => d.verificationType).filter(Boolean);

  // Determine required documents based on client type
  const requiredDocs = clientType === 'BUSINESS'
    ? ['ID_FRONT', 'ID_BACK', 'SELFIE', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS']
    : ['ID_FRONT', 'ID_BACK', 'SELFIE'];

  const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));
  const rejectedDocs = docs
    .filter(d => d.status === 'REJECTED')
    .map(d => ({ type: d.verificationType, reason: d.rejectionReason || 'Document could not be verified' }));

  // Check verification status
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

  if (rejectedDocs.length > 0) {
    return {
      isVerified: false,
      status: 'rejected',
      message: 'Some documents were rejected. Please re-upload them.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs,
      rejectedDocs,
    };
  }

  // Check if any submission is pending or approved
  const hasPendingSubmission = docs.some(d => d.status === 'PENDING');
  const hasApprovedSubmission = docs.some(d => d.status === 'APPROVED');

  if (hasApprovedSubmission || user?.isVerified) {
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

  if (hasPendingSubmission) {
    return {
      isVerified: false,
      status: 'pending',
      message: 'Your verification is under review. Our team will review your ID within 24 hours.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  if (missingDocs.length > 0) {
    return {
      isVerified: false,
      status: 'incomplete',
      message: `Please upload the remaining required documents: ${missingDocs.join(', ')}`,
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs,
      rejectedDocs,
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
