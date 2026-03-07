/**
 * Profile Picture URL Helpers
 * Centralized utilities for generating profile picture and certification URLs
 * with optional cache-busting support
 */

/**
 * Generates the URL for a user's profile picture
 * @param userId - The user's ID
 * @param filename - The profile picture filename
 * @param options - Optional configuration
 * @param options.bustCache - If true, appends a timestamp to force cache refresh
 * @returns The complete URL to the profile picture, or undefined if parameters are missing
 */
export function getProfilePictureUrl(
  userId: string | undefined,
  filename: string | undefined | null,
  options?: { bustCache?: boolean }
): string | undefined {
  if (!userId || !filename) {
    return undefined;
  }

  const baseUrl = `/uploads/documents/${userId}/${filename}`;

  if (options?.bustCache) {
    return `${baseUrl}?t=${Date.now()}`;
  }

  return baseUrl;
}

/**
 * Generates the URL for a user's certification document
 * @param userId - The user's ID
 * @param filename - The certification filename
 * @returns The complete URL to the certification document
 */
export function getCertificationUrl(
  userId: string,
  filename: string
): string {
  return `/uploads/certifications/${userId}/${filename}`;
}

/**
 * Generates a profile picture URL with a custom timestamp for cache-busting
 * @param userId - The user's ID
 * @param filename - The profile picture filename
 * @param timestamp - Custom timestamp to use for cache-busting
 * @returns The complete URL with timestamp parameter
 */
export function getProfilePictureUrlWithTimestamp(
  userId: string | undefined,
  filename: string | undefined | null,
  timestamp: number
): string | undefined {
  if (!userId || !filename) {
    return undefined;
  }

  return `/uploads/documents/${userId}/${filename}?t=${timestamp}`;
}
