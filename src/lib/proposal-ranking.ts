/**
 * Proposal Ranking Utilities
 *
 * This module provides shared utilities for ranking and sorting proposals
 * based on subscription plan tier, AI quality scores, token bids, and submission time.
 *
 * Ranking Algorithm (Four-tier system):
 * 1. Primary: Subscription Plan (Elite > Pro > Free)
 * 2. Secondary: AI Score (higher quality scores rank higher within same tier)
 * 3. Tertiary: Token Bid (higher bids rank higher within same tier)
 * 4. Quaternary: Submission Time (earlier submissions win tiebreaker)
 */

/**
 * Calculates the weight/priority of a subscription plan for proposal ranking
 *
 * @param plan - The subscription plan identifier
 * @returns Numeric weight (higher = better ranking)
 * - FREELANCER_ELITE: 2 (highest priority)
 * - FREELANCER_PRO: 1 (medium priority)
 * - Free/Other: 0 (lowest priority)
 */
export function getPlanWeight(plan?: string | null): number {
  switch (plan) {
    case 'FREELANCER_ELITE':
      return 2;
    case 'FREELANCER_PRO':
      return 1;
    default:
      return 0; // Free users and any other plan
  }
}

/**
 * Type definition for proposal data needed for sorting
 */
export interface SortableProposal {
  tokenBid?: number | null;
  createdAt?: string | Date | null;
  aiScore?: number | null;
  freelancer?: {
    subscriptionPlan?: string | null;
  } | null;
}

/**
 * Sorts proposals by rank using the three-tier algorithm
 *
 * @param proposals - Array of proposals to sort
 * @returns Sorted array (highest ranked proposals first)
 *
 * @example
 * ```typescript
 * const sorted = sortProposalsByRank(proposals);
 * // Elite users appear first, then Pro, then Free
 * // Within each tier, higher token bids appear first
 * // Within same tier and bid, earlier submissions appear first
 * ```
 */
export function sortProposalsByRank<T extends SortableProposal>(
  proposals: T[]
): T[] {
  return [...proposals].sort((a, b) => {
    // Primary sort: Subscription plan (higher weight = better rank)
    const premiumDiff =
      getPlanWeight(b.freelancer?.subscriptionPlan) -
      getPlanWeight(a.freelancer?.subscriptionPlan);

    if (premiumDiff !== 0) {
      return premiumDiff;
    }

    // Secondary sort: AI Score (higher score = better rank)
    const scoreA = a.aiScore ?? -1; // Treat null as lowest
    const scoreB = b.aiScore ?? -1;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Tertiary sort: Token bid (higher bid = better rank)
    const bidA = a.tokenBid ?? 0;
    const bidB = b.tokenBid ?? 0;

    if (bidB !== bidA) {
      return bidB - bidA;
    }

    // Quaternary sort: Submission time (earlier = better rank)
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();

    return timeA - timeB;
  });
}

/**
 * Gets a human-readable description of a plan's ranking tier
 *
 * @param plan - The subscription plan identifier
 * @returns Tier description string
 */
export function getPlanTierDescription(plan?: string | null): string {
  switch (plan) {
    case 'FREELANCER_ELITE':
      return 'Elite Tier - Highest Priority';
    case 'FREELANCER_PRO':
      return 'Pro Tier - Medium Priority';
    default:
      return 'Free Tier - Standard Priority';
  }
}
