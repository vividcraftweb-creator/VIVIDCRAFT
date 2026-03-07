import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/jobs',
          '/jobs/*',
          '/freelancers',
          '/freelancers/*',
          '/hire',
          '/how-it-works',
          '/pricing',
          '/pricing/*',
          '/business-features',
          '/support',
          '/privacy',
          '/terms',
          '/cookies',
        ],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/profile/edit',
          '/profile-editor',
          '/settings',
          '/settings/*',
          '/messages',
          '/messages/*',
          '/billing',
          '/notifications',
          '/auth/*',
          '/api/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard/*',
          '/auth/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
