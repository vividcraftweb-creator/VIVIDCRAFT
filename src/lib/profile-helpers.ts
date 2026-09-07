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

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edvoffgfattcoladypii.supabase.co').replace(/\/+$/, '');

  let baseUrl = trimmed;

  // 1. If it's already a full absolute URL or data/blob URI, use it directly
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    baseUrl = trimmed;
  }
  // 2. If it contains the storage public path (e.g., /storage/v1/object/public/avatars/...)
  else if (trimmed.includes('storage/v1/object/public/avatars/')) {
    const after = trimmed.substring(trimmed.indexOf('storage/v1/object/public/avatars/') + 'storage/v1/object/public/avatars/'.length);
    const cleanPath = after.replace(/^\/+/, '');
    baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
  }
  // 3. If it starts with /avatars/ or avatars/
  else if (trimmed.startsWith('/avatars/') || trimmed.startsWith('avatars/')) {
    const cleanPath = trimmed.replace(/^\/?avatars\//, '');
    baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
  }
  // 4. If it's an existing legacy /uploads/ path
  else if (trimmed.startsWith('/uploads/')) {
    baseUrl = trimmed;
  }
  // 5. If it's any other relative path or filename
  else {
    const clean = trimmed.replace(/^\/+/, '');
    if (clean.includes('/')) {
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${clean}`;
    } else if (clean.match(/\.(png|jpe?g|webp|gif|svg)$/i)) {
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${userId ? `${userId}/` : ''}${clean}`;
    } else if (userId) {
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/${clean}`;
    } else {
      baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${clean}`;
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

  const url = getProfilePictureUrl(userId, filename);
  if (!url) {
    return undefined;
  }

  const [base] = url.split('?');
  return `${base}?t=${timestamp}`;
}
