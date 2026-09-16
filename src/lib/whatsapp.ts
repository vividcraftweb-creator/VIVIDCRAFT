/**
 * Safe WhatsApp utilities for phone sanitization, international format validation,
 * and reliable wa.me URL generation.
 */

export const DEFAULT_WHATSAPP_NUMBER = '94783813833';

/**
 * Sanitize a phone number string to contain ONLY digits.
 */
export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, '');
}

/**
 * Enforce international format validation:
 * Must start with country code (1-9) without leading '+', spaces, or hyphens (e.g. 94771234567).
 * Standard international numbers are between 8 and 15 digits.
 */
export function isValidInternationalPhone(phone?: string | null): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  return /^[1-9]\d{7,14}$/.test(trimmed);
}

export interface WhatsAppUrlOptions {
  artistName?: string;
  customMessage?: string;
  statusText?: string;
}

/**
 * Generate a safe, sanitized WhatsApp URL for inquiring about an artwork.
 * 1. Extracts phone safely from artist/user profile
 * 2. Sanitizes phone to ONLY digits
 * 3. Falls back to default support number if empty or invalid
 * 4. Safely constructs the wa.me URL
 */
export function getSafeArtworkWhatsAppUrl(
  artwork: any,
  options?: WhatsAppUrlOptions
): string {
  if (!artwork) {
    return `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I am interested in your artwork.')}`;
  }

  // 1. Extract phone number safely from artist/user profile
  const rawPhone =
    artwork.profiles?.phone ||
    artwork.user?.phone ||
    DEFAULT_WHATSAPP_NUMBER;

  // 2. Sanitize to contain ONLY digits
  const cleanPhone = String(rawPhone).replace(/\D/g, '');

  // 3. If cleanPhone is empty or invalid, fallback to default artist/support number
  const validPhone = (cleanPhone && cleanPhone.length >= 7)
    ? cleanPhone
    : DEFAULT_WHATSAPP_NUMBER;

  // 4. Construct URL safely
  const title = artwork.title || 'Artwork';
  const refId = artwork.id || artwork.art_code || '';
  const defaultText = options?.customMessage || (refId ? `Hi, I am interested in "${title}" (Ref: ${refId})` : `Hi, I am interested in "${title}"`);

  return `https://wa.me/${validPhone}?text=${encodeURIComponent(defaultText)}`;
}
