/**
 * Verification Helper Functions
 * Utilities for checking and enforcing client verification requirements
 */

import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

  // Get user's client type
  const { data: user } = await supabase
    .from('User')
    .select('clientType, role')
    .eq('id', userId)
    .single();

  // Only skip verification check if requireClientRole is true AND user is not a CLIENT
  if (requireClientRole && (!user || user.role !== 'CLIENT')) {
    return {
      isVerified: true, // Non-clients don't need verification when role checking is enabled
      status: 'approved',
      message: 'Verification not required for this user type',
      requiredDocs: [],
      uploadedDocs: [],
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  // If user is null at this point, return not started status
  if (!user) {
    return {
      isVerified: false,
      status: 'not_started',
      message: 'User not found',
      requiredDocs: [],
      uploadedDocs: [],
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  // Get user's verification documents
  const { data: documents } = await supabase
    .from('Verification')
    .select('*')
    .eq('userId', userId);

  const docs = documents || [];
  const uploadedTypes = docs.map(d => d.verificationType);

  // Determine required documents based on client type
  // ID_FRONT, ID_BACK, and SELFIE are required for all users (prevents fraud)
  const requiredDocs = user.clientType === 'BUSINESS'
    ? ['ID_FRONT', 'ID_BACK', 'SELFIE', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS']
    : ['ID_FRONT', 'ID_BACK', 'SELFIE'];

  const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));
  const rejectedDocs = docs
    .filter(d => d.status === 'REJECTED')
    .map(d => ({ type: d.verificationType, reason: d.rejectionReason || 'No reason provided' }));

  // Check verification status
  if (docs.length === 0) {
    return {
      isVerified: false,
      status: 'not_started',
      message: 'Verification not started. Please complete verification to post jobs.',
      requiredDocs,
      uploadedDocs: [],
      missingDocs: requiredDocs,
      rejectedDocs: [],
    };
  }

  if (missingDocs.length > 0) {
    return {
      isVerified: false,
      status: 'incomplete',
      message: `Please upload the following documents: ${missingDocs.join(', ')}`,
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs,
      rejectedDocs,
    };
  }

  if (rejectedDocs.length > 0) {
    return {
      isVerified: false,
      status: 'rejected',
      message: 'Some documents were rejected. Please re-upload them.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs: [],
      rejectedDocs,
    };
  }

  // Check if all required documents are approved
  const requiredDocsStatuses = docs
    .filter(d => requiredDocs.includes(d.verificationType))
    .map(d => d.status);

  const allApproved = requiredDocsStatuses.every(status => status === 'APPROVED');
  const anyPending = requiredDocsStatuses.some(status => status === 'PENDING');

  if (allApproved) {
    return {
      isVerified: true,
      status: 'approved',
      message: 'Verification complete',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  if (anyPending) {
    return {
      isVerified: false,
      status: 'pending',
      message: 'Your verification is under review. You can post jobs once approved.',
      requiredDocs,
      uploadedDocs: uploadedTypes,
      missingDocs: [],
      rejectedDocs: [],
    };
  }

  return {
    isVerified: false,
    status: 'incomplete',
    message: 'Verification incomplete',
    requiredDocs,
    uploadedDocs: uploadedTypes,
    missingDocs,
    rejectedDocs,
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
