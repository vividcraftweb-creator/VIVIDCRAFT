import type { Profile } from '@/types/database.types';
import { FIELD_LIMITS, type SectionStrength } from '@/types/profile-editor.types';

/**
 * Calculate the strength/completeness of the Basic Info section
 */
export function calculateBasicInfoStrength(profile: Profile | null | undefined): SectionStrength {
  if (!profile) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  let score = 0;
  let maxScore = 8;

  // Profile picture (10 points)
  if (profile.profilePicture) score += 10;

  // First and last name (10 points each)
  if (profile.firstName) score += 10;
  if (profile.lastName) score += 10;

  // Professional title (15 points, with quality check)
  if (profile.title) {
    const titleLength = profile.title.length;
    if (titleLength >= FIELD_LIMITS.TITLE.min) {
      score += titleLength >= FIELD_LIMITS.TITLE.ideal ? 15 : 10;
    }
  }

  // Bio (20 points, with quality check)
  if (profile.bio) {
    const bioLength = profile.bio.length;
    if (bioLength >= FIELD_LIMITS.BIO.min) {
      score += bioLength >= FIELD_LIMITS.BIO.ideal ? 20 : 12;
    }
  }

  // Skills (15 points, with quality check)
  if (profile.skills) {
    const skillsArray = profile.skills.split(',').map(s => s.trim()).filter(Boolean);
    if (skillsArray.length >= FIELD_LIMITS.SKILLS.min) {
      score += skillsArray.length >= 3 && skillsArray.length <= 6 ? 15 : 10;
    }
  }

  // Rate (10 points)
  if (profile.rate && profile.rate > 0) score += 10;

  // Location (10 points)
  if (profile.location) score += 10;

  const percentage = Math.round((score / 100) * 100);

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Experience section
 */
export function calculateExperienceStrength(
  experienceItems: Array<{ position?: string; company?: string; description?: string | null }> | undefined
): SectionStrength {
  if (!experienceItems || experienceItems.length === 0) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  let score = 0;
  const hasItems = experienceItems.length > 0;

  // At least one experience (40 points)
  if (hasItems) score += 40;

  // Multiple experiences (20 points)
  if (experienceItems.length >= 2) score += 20;

  // Quality of experiences (40 points)
  const experiencesWithDescriptions = experienceItems.filter(
    exp => exp.description && exp.description.length >= 50
  ).length;

  score += Math.min(40, experiencesWithDescriptions * 20);

  const percentage = Math.min(100, score);

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Education section
 */
export function calculateEducationStrength(
  educationItems: Array<{ institution?: string; degree?: string | null }> | undefined
): SectionStrength {
  if (!educationItems || educationItems.length === 0) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  let score = 0;

  // At least one education (50 points)
  if (educationItems.length > 0) score += 50;

  // Multiple education entries (25 points)
  if (educationItems.length >= 2) score += 25;

  // Quality of entries (25 points)
  const qualityEntries = educationItems.filter(
    edu => edu.degree && edu.degree.length > 0
  ).length;

  score += Math.min(25, qualityEntries * 12);

  const percentage = Math.min(100, score);

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Portfolio section
 */
export function calculatePortfolioStrength(
  portfolioItems: Array<{ title?: string; description?: string | null; imageUrl?: string | null }> | undefined
): SectionStrength {
  if (!portfolioItems || portfolioItems.length === 0) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  let score = 0;

  // At least 2 portfolio items (40 points)
  if (portfolioItems.length >= 2) score += 40;
  else if (portfolioItems.length === 1) score += 20;

  // Multiple portfolio items (20 points)
  if (portfolioItems.length >= 3) score += 20;

  // Quality of portfolio items (40 points)
  const qualityItems = portfolioItems.filter(
    item => item.description && item.description.length >= 50 && item.imageUrl
  ).length;

  score += Math.min(40, qualityItems * 15);

  const percentage = Math.min(100, score);

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Certifications section
 */
export function calculateCertificationStrength(
  certificationItems: Array<{ name?: string; issuer?: string }> | undefined
): SectionStrength {
  if (!certificationItems || certificationItems.length === 0) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  let score = 0;

  // At least one certification (60 points)
  if (certificationItems.length > 0) score += 60;

  // Multiple certifications (40 points)
  score += Math.min(40, (certificationItems.length - 1) * 20);

  const percentage = Math.min(100, score);

  return getSectionStrengthLabel(percentage);
}

/**
 * Convert percentage to strength label
 */
function getSectionStrengthLabel(percentage: number): SectionStrength {
  if (percentage >= 80) {
    return {
      percentage,
      label: 'Strong',
      color: 'text-chart-2',
      badge: 'success',
    };
  }

  if (percentage >= 50) {
    return {
      percentage,
      label: 'Good',
      color: 'text-amber-500',
      badge: 'warning',
    };
  }

  return {
    percentage,
    label: 'Needs Work',
    color: 'text-muted-foreground',
    badge: 'default',
  };
}

/**
 * Format time ago string
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
