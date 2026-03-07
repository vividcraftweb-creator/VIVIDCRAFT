/**
 * Feature flags utility
 * Centralized feature flag management for the application
 */

export const FeatureFlags = {
  /**
   * AI-powered fraud prevention system V1
   * When enabled, automatically scans new users and flags suspicious activity
   */
  FRAUD_PREVENTION_V1: process.env.FRAUD_PREVENTION_V1 === 'true',
} as const;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[flag] === true;
}
