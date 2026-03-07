import { SecureId } from './security';

/**
 * URL generation utilities with secure slugs
 */
export class SecureUrls {
  /**
   * Generate job URL with slug (prefer real slug over encoded ID)
   */
  static job(slugOrId: string): string {
    // If it looks like a real slug (contains hyphens, no weird encoding), use as-is
    if (slugOrId.includes('-') && !/^[A-Za-z0-9+/=]+$/.test(slugOrId)) {
      return `/jobs/${slugOrId}`;
    }
    // Otherwise, try to decode as legacy encrypted ID or use as-is
    try {
      SecureId.ensureId(slugOrId);
      return `/jobs/${slugOrId}`; // Use the original slug/ID passed in
    } catch {
      return `/jobs/${slugOrId}`;
    }
  }

  /**
   * Generate profile URL with secure slug
   */
  static profile(userIdOrSlug: string): string {
    const slug = SecureId.ensureSlug(userIdOrSlug);
    return `/profile/${slug}`;
  }

  /**
   * Extract ID from current URL params (for use in components)
   */
  static extractId(slugFromUrl: string): string {
    try {
      return SecureId.ensureId(slugFromUrl);
    } catch {
      // In development, be more forgiving with URL formats
      if (process.env.NODE_ENV === 'development') {
        return slugFromUrl;
      }
      // Fallback for legacy URLs or development
      return slugFromUrl;
    }
  }

  /**
   * Check if URL contains secure slug vs raw ID
   */
  static hasSecureSlug(url: string): boolean {
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    return SecureId.isSecureSlug(lastSegment);
  }

  /**
   * Convert any raw IDs in URL to secure slugs
   */
  static secureUrl(url: string): string {
    // Common patterns to replace
    const patterns = [
      { regex: /\/jobs\/([a-z0-9]{20,})/g, replacement: (match: string, id: string) => `/jobs/${SecureId.ensureSlug(id)}` },
      { regex: /\/profile\/([a-z0-9]{20,})/g, replacement: (match: string, id: string) => `/profile/${SecureId.ensureSlug(id)}` },
    ];

    let secureUrl = url;
    for (const pattern of patterns) {
      secureUrl = secureUrl.replace(pattern.regex, pattern.replacement);
    }

    return secureUrl;
  }
}

/**
 * Hook for Next.js router that handles secure slugs
 */
export function useSecureRouter() {
  // This would be implemented as a custom hook in a real app
  // For now, we'll just export utilities
  return {
    push: (url: string) => {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', SecureUrls.secureUrl(url));
      }
    },
    replace: (url: string) => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', SecureUrls.secureUrl(url));
      }
    },
  };
}
