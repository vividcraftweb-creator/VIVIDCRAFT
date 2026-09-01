import { Metadata } from 'next';

/**
 * Centralized SEO Configuration
 * Single source of truth for all SEO-related constants
 */
export const SEO_CONFIG = {
  siteName: 'Vivid Art',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
  tagline: 'Premier Art & Creative Talent Marketplace',
  twitterHandle: '@vividart',
  defaultOgImage: '/vivid-art-og-image.png',
  description: 'Vivid Art is the premier marketplace for creative talent and artwork. Connect with verified artists, commission custom artworks, and hire top creators for your projects.',
} as const;

/**
 * Create metadata for standard public/marketing pages
 * Uses full title format with branding for better SEO
 *
 * Note: Next.js has a bug where title.template from root layout doesn't apply
 * to the homepage (app/page.tsx), so we explicitly set the full title here.
 *
 * @example
 * export const metadata = createPageMetadata({
 *   title: 'Pricing Plans',
 *   description: 'View our pricing for freelancers and clients',
 *   keywords: ['pricing', 'plans', 'subscription']
 * });
 */
export function createPageMetadata(params: {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}): Metadata {
  const { title, description, keywords, ogImage, canonical, noIndex = false } = params;

  // Use title.absolute to ensure the full title is always set
  // This works around Next.js template issues and ensures consistency
  const fullTitle = `${title} | ${SEO_CONFIG.siteName} - ${SEO_CONFIG.tagline}`;

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical || SEO_CONFIG.siteUrl,
      siteName: SEO_CONFIG.siteName,
      images: ogImage ? [ogImage] : [SEO_CONFIG.defaultOgImage],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SEO_CONFIG.siteName}`,
      description,
      images: ogImage ? [ogImage] : [SEO_CONFIG.defaultOgImage],
      creator: SEO_CONFIG.twitterHandle,
    },
    alternates: canonical ? {
      canonical,
    } : undefined,
    robots: noIndex ? {
      index: false,
      follow: true,
    } : undefined,
  };
}

/**
 * Create metadata for authenticated pages (Dashboard, Messages, etc.)
 * Uses simple title format without tagline
 *
 * @example
 * export const metadata = createAuthPageMetadata({
 *   title: 'Dashboard',
 *   description: 'View your Vivid Art dashboard'
 * });
 */
export function createAuthPageMetadata(params: {
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  const { title, description, noIndex = true } = params;

  return {
    title: {
      absolute: `${title} | ${SEO_CONFIG.siteName}`,
    },
    description,
    robots: {
      index: noIndex ? false : true,
      follow: true,
      googleBot: {
        index: noIndex ? false : true,
        follow: true,
      },
    },
  };
}

/**
 * Create metadata for admin pages
 * Uses hierarchical title format: "Page Name | Admin | Vivid Art"
 * Always marked noindex to prevent search indexing
 *
 * @example
 * export const metadata = createAdminPageMetadata({
 *   title: 'User Management',
 *   description: 'Manage users and permissions'
 * });
 */
export function createAdminPageMetadata(params: {
  title: string;
  description: string;
}): Metadata {
  const { title, description } = params;

  return {
    title: {
      absolute: `${title} | Admin | ${SEO_CONFIG.siteName}`,
    },
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

/**
 * Create metadata for dynamic routes (Jobs, Freelancers, etc.)
 * Uses hierarchical format: "Dynamic Title | Section | Vivid Art"
 *
 * @example
 * return createDynamicMetadata({
 *   title: 'Senior React Developer',
 *   description: job.description.slice(0, 160),
 *   section: 'Jobs',
 *   ogImage: job.supportingImages?.[0]
 * });
 */
export function createDynamicMetadata(params: {
  title: string;
  description: string;
  section: string;
  ogImage?: string;
  canonical?: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  const { title, description, section, ogImage, canonical, keywords, noIndex = false } = params;

  const fullTitle = `${title} | ${section} | ${SEO_CONFIG.siteName}`;

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      url: canonical || SEO_CONFIG.siteUrl,
      siteName: SEO_CONFIG.siteName,
      images: ogImage ? [ogImage] : [SEO_CONFIG.defaultOgImage],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: ogImage ? [ogImage] : [SEO_CONFIG.defaultOgImage],
      creator: SEO_CONFIG.twitterHandle,
    },
    alternates: canonical ? {
      canonical,
    } : undefined,
    robots: noIndex ? {
      index: false,
      follow: true,
    } : undefined,
  };
}

/**
 * Create metadata for settings subpages
 * Uses hierarchical format: "Page Name | Settings | Vivid Art"
 *
 * @example
 * export const metadata = createSettingsPageMetadata({
 *   title: 'API Keys',
 *   description: 'Manage your API keys'
 * });
 */
export function createSettingsPageMetadata(params: {
  title: string;
  description: string;
}): Metadata {
  const { title, description } = params;

  return {
    title: {
      absolute: `${title} | Settings | ${SEO_CONFIG.siteName}`,
    },
    description,
    robots: {
      index: false,
      follow: true,
    },
  };
}
