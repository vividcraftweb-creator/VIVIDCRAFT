/**
 * Image Placeholders and URL Validation Utilities
 * Provides offline-resilient SVG fallbacks for artworks and profile avatars.
 */

// Elegant dark purple/slate styled SVG artwork placeholder matching Vivid Craft branding
export const DEFAULT_ARTWORK_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
    <rect width="800" height="600" fill="#090d16"/>
    <defs>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#9333ea" stop-opacity="0.25"/>
        <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#090d16" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#glow)"/>
    <rect x="40" y="40" width="720" height="520" rx="24" fill="#0f172a" fill-opacity="0.7" stroke="url(#borderGrad)" stroke-width="2"/>
    <g transform="translate(400, 260)">
      <circle cx="0" cy="0" r="54" fill="#1e1b4b" stroke="#7c3aed" stroke-width="2"/>
      <path d="M-22 -14 C-22 -26 22 -26 22 -14 C22 -2 6 6 0 16 C-6 6 -22 -2 -22 -14 Z" fill="#a855f7"/>
      <circle cx="-10" cy="-10" r="4" fill="#f472b6"/>
      <circle cx="10" cy="-10" r="4" fill="#60a5fa"/>
      <circle cx="0" cy="2" r="4" fill="#fbbf24"/>
    </g>
    <text x="400" y="360" fill="#f3e8ff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" text-anchor="middle" letter-spacing="1">Artwork Preview</text>
    <text x="400" y="390" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="14" text-anchor="middle">Original Piece on Vivid Art</text>
  </svg>`
)}`;

// Default avatar placeholder SVG
export const DEFAULT_AVATAR_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200" fill="none">
    <rect width="200" height="200" fill="#1e1b4b"/>
    <circle cx="100" cy="78" r="38" fill="#7c3aed"/>
    <path d="M30 180 C30 140 60 125 100 125 C140 125 170 140 170 180 Z" fill="#7c3aed"/>
  </svg>`
)}`;

/**
 * Checks if a string is a potentially valid image URL
 */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('/')) return true;
  return false;
}

/**
 * Returns the provided artwork URL if valid, or falls back to the default SVG placeholder
 */
export function getSafeArtworkUrl(url?: string | null): string {
  if (isValidImageUrl(url)) {
    return url!.trim();
  }
  return DEFAULT_ARTWORK_PLACEHOLDER;
}

/**
 * Returns the provided avatar URL if valid, or undefined (so AvatarFallback can render initials)
 */
export function getSafeAvatarUrl(url?: string | null): string | undefined {
  if (isValidImageUrl(url)) {
    return url!.trim();
  }
  return undefined;
}
