const INVALID_SLUG_CHARS_REGEX = /[^a-z0-9]+/g;
const TRIM_HYPHENS_REGEX = /^-+|-+$/g;
const RANDOM_SUFFIX = () => Math.random().toString(36).slice(2, 8);

/**
 * Convert an arbitrary string into a URL-safe slug.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(INVALID_SLUG_CHARS_REGEX, '-')
    .replace(TRIM_HYPHENS_REGEX, '');
}

/**
 * Compose a slug from a first and last name, returning an empty string when no meaningful data exists.
 */
export function slugFromName(firstName?: string | null, lastName?: string | null): string {
  const combined = [firstName ?? '', lastName ?? ''].join(' ').trim();
  return combined ? slugify(combined) : '';
}

/**
 * Generate a slug from input text, falling back to a random identifier when the input has no sluggable content.
 */
export function generateSlug(input: string, fallback: string = 'item'): string {
  const base = slugify(input);
  if (base) {
    return base;
  }
  const fallbackBase = slugify(fallback) || 'item';
  return `${fallbackBase}-${RANDOM_SUFFIX()}`;
}

/**
 * Given a base slug and a list of existing slugs, return a unique slug by appending an incrementing suffix.
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  const slugSet = new Set(existingSlugs);

  while (slugSet.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}
