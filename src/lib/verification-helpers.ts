/**
 * Verification Helper Functions
 * All verification checks bypassed — all users and artists have full access.
 */

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
 * ID verification system is removed: always returns verified with full access.
 */
export async function checkUserVerification(
  _userId: string,
  _requireClientRole = true
): Promise<VerificationCheckResult> {
  return {
    isVerified: true,
    status: 'approved',
    message: 'Account verified',
    requiredDocs: [],
    uploadedDocs: [],
    missingDocs: [],
    rejectedDocs: [],
  };
}

/**
 * Require verification for an action
 * ID verification system is removed: bypass check completely.
 */
export async function requireVerification(_userId: string): Promise<void> {
  return;
}

/**
 * Get verification progress percentage
 */
export function getVerificationProgress(_result?: VerificationCheckResult): number {
  return 100;
}
