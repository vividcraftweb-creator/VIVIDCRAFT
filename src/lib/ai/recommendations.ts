/**
 * AI-powered freelancer recommendation system
 * Scores and ranks freelancers based on multiple factors
 */

import { createClient } from '@/lib/supabase/server';

export interface FreelancerScore {
  freelancerId: string;
  freelancer: FreelancerDetails;
  score: number;
  breakdown: {
    skills: number;
    budget: number;
    rating: number;
    history: number;
    availability: number;
  };
  matchPercentage: number;
}

export interface FreelancerDetails {
  id: string;
  name: string | null;
  email?: string | null;
  subscriptionTier?: string | null;
  profile: FreelancerProfileDetails;
}

export interface FreelancerProfileDetails {
  slug?: string | null;
  title?: string | null;
  skills?: string | null;
  hourlyRate?: number | null;
  rating?: number | null;
  avatar?: string | null;
  availability?: string | null;
}

interface FreelancerRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  subscriptionTier?: string | null;
  Profile?: unknown;
}

const isFreelancerRecord = (value: unknown): value is FreelancerRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string';
};

const extractProfileDetails = (profileData: unknown): FreelancerProfileDetails => {
  if (!profileData || typeof profileData !== 'object') {
    return {};
  }

  const record = profileData as Record<string, unknown>;
  const avatar =
    typeof record.avatar === 'string'
      ? record.avatar
      : typeof record.profilePicture === 'string'
        ? record.profilePicture
        : undefined;

  return {
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    title: typeof record.title === 'string' ? record.title : undefined,
    skills: typeof record.skills === 'string' ? record.skills : undefined,
    hourlyRate: typeof record.hourlyRate === 'number'
      ? record.hourlyRate
      : typeof record.rate === 'number'
        ? record.rate
        : undefined,
    rating: typeof record.rating === 'number' ? record.rating : undefined,
    avatar,
    availability: typeof record.availability === 'string' ? record.availability : undefined,
  };
};

/**
 * Calculate Jaccard similarity between two arrays
 */
function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 0;

  const s1 = new Set(set1.map(s => s.toLowerCase().trim()));
  const s2 = new Set(set2.map(s => s.toLowerCase().trim()));

  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Parse skills from comma/space separated string
 */
function parseSkills(skillsString: string | null | undefined): string[] {
  if (!skillsString) return [];
  return skillsString.split(/[,\s]+/).filter(s => s.length > 0);
}

/**
 * Score freelancers for a specific job
 */
export async function scoreFreelancersForJob(
  jobId: string,
  clientId: string,
  limit: number = 10
): Promise<FreelancerScore[]> {
  const supabase = await createClient();

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('Job')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    throw new Error('Job not found');
  }

  // Get all verified freelancers with their profiles
  const { data: freelancers, error: freelancersError } = await supabase
    .from('User')
    .select(`
      id,
      name,
      email,
      isVerified,
      subscriptionTier,
      Profile(*)
    `)
    .eq('role', 'FREELANCER')
    .eq('isVerified', true);

  if (freelancersError || !freelancers) {
    return [];
  }

  const freelancerRecords = freelancers.filter(isFreelancerRecord);

  // Get client's contract history with freelancers
  const { data: pastContracts } = await supabase
    .from('Contract')
    .select('freelancerId, status')
    .eq('clientId', clientId);

  const freelancerHistory = new Map<string, { count: number; successful: number }>();
  pastContracts?.forEach(contract => {
    const existing = freelancerHistory.get(contract.freelancerId) || { count: 0, successful: 0 };
    existing.count++;
    if (contract.status === 'COMPLETED') {
      existing.successful++;
    }
    freelancerHistory.set(contract.freelancerId, existing);
  });

  // Parse job skills
  const jobSkills = parseSkills(job.tags);

  // Score each freelancer
  const scores: FreelancerScore[] = [];

  for (const freelancer of freelancerRecords) {
    const profileData = Array.isArray(freelancer.Profile)
      ? freelancer.Profile[0]
      : freelancer.Profile;

    if (!profileData) {
      continue;
    }

    const profileDetails = extractProfileDetails(profileData);

    const freelancerDetails: FreelancerDetails = {
      id: freelancer.id,
      name: typeof freelancer.name === 'string' ? freelancer.name : null,
      email: typeof freelancer.email === 'string' ? freelancer.email : null,
      subscriptionTier: typeof freelancer.subscriptionTier === 'string' ? freelancer.subscriptionTier : null,
      profile: profileDetails,
    };

    // Parse freelancer skills
    const freelancerSkills = parseSkills(profileDetails.skills ?? null);

    // Calculate skill match (0-25 points)
    const skillsSimilarity = jaccardSimilarity(jobSkills, freelancerSkills);
    const skillsScore = skillsSimilarity * 25;

    // Calculate budget alignment (0-20 points)
    let budgetScore = 0;
    if (profileDetails.hourlyRate && job.budget) {
      // Estimate project hours (assume budget is total project cost)
      const estimatedHours = 40; // Default assumption
      const freelancerEstimate = profileDetails.hourlyRate * estimatedHours;

      // Calculate difference percentage
      const budgetDiff = Math.abs(job.budget - freelancerEstimate);
      const diffPercentage = job.budget > 0 ? budgetDiff / job.budget : 1;

      // Give full points if within 20% of budget, scale down from there
      if (diffPercentage <= 0.2) {
        budgetScore = 20;
      } else if (diffPercentage <= 0.5) {
        budgetScore = 20 * (1 - (diffPercentage - 0.2) / 0.3);
      } else {
        budgetScore = 20 * (1 - Math.min(diffPercentage, 1));
      }
    } else {
      budgetScore = 10; // Neutral score if no rate specified
    }

    // Calculate rating score (0-15 points)
    const avgRating = profileDetails.rating || 0;
    const ratingScore = (avgRating / 5) * 15;

    // Calculate past success with this client (0-40 points)
    let historyScore = 0;
    const history = freelancerHistory.get(freelancer.id);
    if (history && history.count > 0) {
      // Heavy bonus for past successful collaborations
      const successRate = history.successful / history.count;
      historyScore = 40 * successRate;

      // Additional bonus for multiple successful projects
      if (history.successful >= 3) {
        historyScore = Math.min(40, historyScore + 5);
      }
    }

    // Calculate availability score (0-10 points) based on subscription tier
    let availabilityScore = 5; // Default neutral score
    if (freelancerDetails.subscriptionTier === 'PREMIUM') {
      availabilityScore = 10; // Premium users are more serious/available
    } else if (freelancerDetails.subscriptionTier === 'BASIC') {
      availabilityScore = 7;
    }

    // Check if freelancer is currently available
    if (profileDetails.availability === 'AVAILABLE') {
      availabilityScore += 5;
    } else if (profileDetails.availability === 'BUSY') {
      availabilityScore -= 2;
    }
    availabilityScore = Math.max(0, Math.min(10, availabilityScore));

    // Calculate total score (max 100)
    const totalScore = Math.round(
      skillsScore + budgetScore + ratingScore + historyScore + availabilityScore
    );

    scores.push({
      freelancerId: freelancerDetails.id,
      freelancer: freelancerDetails,
      score: totalScore,
      breakdown: {
        skills: Math.round(skillsScore),
        budget: Math.round(budgetScore),
        rating: Math.round(ratingScore),
        history: Math.round(historyScore),
        availability: Math.round(availabilityScore),
      },
      matchPercentage: Math.min(100, totalScore),
    });
  }

  // Sort by score descending and return top matches
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get recommended freelancers with full details
 */
export async function getRecommendedFreelancers(
  jobId: string,
  clientId: string,
  limit: number = 5
): Promise<FreelancerScore[]> {
  return scoreFreelancersForJob(jobId, clientId, limit);
}

/**
 * Calculate match percentage between job and freelancer
 */
export async function calculateMatchPercentage(
  jobId: string,
  freelancerId: string,
  clientId: string
): Promise<number> {
  const scores = await scoreFreelancersForJob(jobId, clientId, 100);
  const freelancerScore = scores.find(s => s.freelancerId === freelancerId);
  return freelancerScore?.matchPercentage || 0;
}
