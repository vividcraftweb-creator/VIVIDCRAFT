export interface ArtistCategories {
  art_styles?: string[];
  art_specialties?: string[];
  services_offered?: string[];
  mediums: string[];
  specialties: string[];
  services: string[];
  other_categories: string[];
}

export const ARTIST_MEDIUMS = [
  'Oil Painting',
  'Acrylic Painting',
  'Watercolor Painting',
  'Digital Art & Illustration',
  'Pencil & Charcoal Sketching',
  'Mixed Media & Collage',
  'Ink & Line Art',
  'Pastel & Chalk',
  '3D Art & CGI',
  'Sculptures & Ceramics',
  'Fabric & Textile Art',
  'Gouache Painting',
] as const;

export const ARTIST_SPECIALTIES = [
  'Portrait Art',
  'Landscape & Nature',
  'Abstract & Modern',
  'Wall Murals & Street Art',
  'Traditional & Cultural Art',
  'Concept Art & Character Design',
  'Anime & Manga Art',
  'Calligraphy & Typography',
  'Miniature & Fine Detail',
  'Wildlife & Botanical',
  'Fantasy & Sci-Fi Art',
] as const;

export const ARTIST_SERVICES = [
  'Custom Commission Work',
  'Original Art Sales',
  'Art Prints & Merchandise',
  'Live Painting & Event Art',
  'Wall Mural Painting',
  'Commercial & Brand Illustration',
  'Digital Character / Concept Commissions',
  'Art Restoration & Framing Consultation',
  'Album & Book Cover Design',
  'Art Tutoring & Workshops',
] as const;

export const ART_STYLES_OPTIONS = ARTIST_MEDIUMS;
export const ART_SPECIALTIES_OPTIONS = ARTIST_SPECIALTIES;
export const SERVICES_OFFERED_OPTIONS = ARTIST_SERVICES;

/**
 * Validates that all 3 required categories have at least 1 selection or custom input
 */
export function validateArtistCategories(
  mediums: string[],
  otherMedium: string,
  specialties: string[],
  otherSpecialty: string,
  services: string[],
  otherService: string
): { isValid: boolean; error: string | null } {
  const hasMedium = mediums.length > 0 || otherMedium.trim().length > 0;
  if (!hasMedium) {
    return {
      isValid: false,
      error: 'Please select at least one Medium / Art Style.',
    };
  }

  const hasSpecialty = specialties.length > 0 || otherSpecialty.trim().length > 0;
  if (!hasSpecialty) {
    return {
      isValid: false,
      error: 'Please select at least one Specialty / Art Type.',
    };
  }

  const hasService = services.length > 0 || otherService.trim().length > 0;
  if (!hasService) {
    return {
      isValid: false,
      error: 'Please select at least one Service Offered.',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Safe parser helper for tags that handles null, undefined, raw arrays, or PostgreSQL array literal formats safely
 */
export const normalizeTags = (tags: any): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .flatMap((t) => {
        if (typeof t === 'string' && (t.includes('{') || t.includes('['))) {
          return t.replace(/[\{\}\"\[\]]/g, '').split(',');
        }
        return [String(t)];
      })
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean);
  }
  if (typeof tags === 'string') {
    // Clean PostgreSQL array literal format e.g. '{"Oil Painting","Acrylic Painting"}'
    return tags
      .replace(/[\{\}\"\[\]]/g, '')
      .split(',')
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean);
  }
  return [];
};

export const parseTags = normalizeTags;

