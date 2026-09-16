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
    const defaultNum = String(DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
    return `https://wa.me/${defaultNum}`;
  }

  // 1. Extract phone number safely from artist/user profile
  const rawPhone =
    artwork.profiles?.phone ||
    artwork.user?.phone ||
    artwork.artist_phone ||
    DEFAULT_WHATSAPP_NUMBER;

  // 2. Sanitize to contain ONLY digits using /\D/g
  const cleanPhone = String(rawPhone).replace(/\D/g, '') || DEFAULT_WHATSAPP_NUMBER;

  const title = artwork.title || 'Artwork';
  const rawRef = artwork.ref_id || artwork.art_code || artwork.id || 'N/A';
  const refId = String(rawRef).replace(/^#/, '');
  const artistName = artwork.profiles?.full_name || artwork.profiles?.display_name || artwork.artist_name || artwork.artist?.name || 'Artist';

  const rawPrice = Number(artwork.price || artwork.price_amount || artwork.amount || artwork.starting_bid || 0);
  const priceDisplay = rawPrice > 0 ? `LKR ${rawPrice.toLocaleString()}` : 'Not For Sale / Contact for Price';

  const defaultText = options?.customMessage || `Hi, I am interested in buying "${title}" (Ref ID: #${refId}) by ${artistName}. Listed Price: ${priceDisplay}.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultText)}`;
}
