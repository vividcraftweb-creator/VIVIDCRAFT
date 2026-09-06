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
  if (!filename || typeof filename !== 'string') {
    return undefined;
  }

  const trimmed = filename.trim();
  if (!trimmed) {
    return undefined;
  }

  let baseUrl = trimmed;
  // If it's already a full URL or data URI, use it directly
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    baseUrl = trimmed;
  } else if (trimmed.startsWith('/')) {
    baseUrl = trimmed;
  } else {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    if (supabaseUrl && (trimmed.startsWith('avatars/') || trimmed.includes('/'))) {
      const cleanPath = trimmed.startsWith('avatars/') ? trimmed.replace(/^avatars\//, '') : trimmed;
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
    } else if (supabaseUrl && trimmed.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${userId ? `${userId}/` : ''}${trimmed}`;
    } else if (!userId) {
      return undefined;
    } else {
      baseUrl = `/uploads/documents/${userId}/${trimmed}`;
    }
  }

  if (options?.bustCache) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${Date.now()}`;
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
  if (!filename) {
    return undefined;
  }

  let baseUrl = filename;
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:') || filename.startsWith('blob:')) {
    baseUrl = filename;
  } else if (filename.startsWith('/')) {
    baseUrl = filename;
  } else {
    if (!userId) return undefined;
    baseUrl = `/uploads/documents/${userId}/${filename}`;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}t=${timestamp}`;
}
