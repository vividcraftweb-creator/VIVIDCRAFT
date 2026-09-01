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

  // 1. Profile picture / Avatar (20%)
  if (profile.profilePicture || (profile as any).avatar_url || (profile as any).avatarUrl || (profile as any).profile_picture) {
    score += 20;
  }

  // 2. Full name (20%)
  if (profile.firstName || profile.lastName || (profile as any).first_name || (profile as any).last_name || (profile as any).full_name) {
    score += 20;
  }

  // 3. Professional title (20%)
  if (profile.title) {
    score += 20;
  }

  // 4. Address / Location (20%)
  if (profile.location || (profile as any).address) {
    score += 20;
  }

  // 5. Skills (20%)
  if (profile.skills) {
    const rawSkills = profile.skills;
    const skillsArray = Array.isArray(rawSkills) ? rawSkills : (typeof rawSkills === 'string' ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    if (skillsArray.length > 0) {
      score += 20;
    }
  }

  const percentage = Math.min(100, Math.round(score));

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Experience section
 */
export function calculateExperienceStrength(
  experienceItems: Array<{ position?: string; company?: string; description?: string | null }> | undefined
): SectionStrength {
  if (!experienceItems || experienceItems.length === 0 || !experienceItems[0]?.description) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  const descLength = (experienceItems[0].description || '').length;
  const percentage = descLength >= 20 ? 100 : 70;

  return getSectionStrengthLabel(percentage);
}

/**
 * Calculate the strength/completeness of the Education section
 */
export function calculateEducationStrength(
  educationItems: Array<{ institution?: string; degree?: string | null; description?: string | null }> | undefined
): SectionStrength {
  if (!educationItems || educationItems.length === 0 || (!educationItems[0]?.description && !educationItems[0]?.institution)) {
    return {
      percentage: 0,
      label: 'Needs Work',
      color: 'text-muted-foreground',
      badge: 'default',
    };
  }

  const descLength = (educationItems[0].description || educationItems[0].institution || '').length;
  const percentage = descLength >= 20 ? 100 : 70;

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
