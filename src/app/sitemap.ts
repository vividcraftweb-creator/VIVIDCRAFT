import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  // Define priority pages for sitelinks
  const getPriority = (route: string): number => {
    if (route === '') return 1.0; // Homepage
    if (route === '/jobs' || route === '/freelancers') return 0.9; // Main features
    if (route === '/freelancers/getting-started' || route === '/how-it-works' || route === '/pricing') return 0.9; // Key sitelinks
    if (route === '/about' || route === '/support' || route === '/hire') return 0.8;
    if (route === '/privacy' || route === '/terms' || route === '/cookies') return 0.3; // Low priority utility pages
    return 0.7; // Other pages
  };

  const getChangeFreq = (route: string): 'daily' | 'weekly' | 'monthly' => {
    if (route === '' || route === '/jobs') return 'daily';
    if (route === '/freelancers' || route === '/pricing') return 'weekly';
    return 'weekly';
  };

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/jobs',
    '/freelancers',
    '/freelancers/getting-started',
    '/hire',
    '/how-it-works',
    '/pricing',
    '/pricing/freelancers',
    '/pricing/clients',
    '/business-features',
    '/support',
    '/privacy',
    '/terms',
    '/cookies',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: getChangeFreq(route),
    priority: getPriority(route),
  }));

  // Fetch active jobs (limit to 100 most recent)
  let jobPages: MetadataRoute.Sitemap = [];
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'OPEN' },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    jobPages = jobs.map((job) => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: new Date(job.updatedAt || job.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    // Failed to fetch jobs - continue with static pages only
  }

  // Fetch public freelancer profiles (limit to 100)
  let freelancerPages: MetadataRoute.Sitemap = [];
  try {
    const profiles = await prisma.profile.findMany({
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });

    freelancerPages = profiles
      .filter((profile) => profile.slug)
      .map((profile) => ({
        url: `${baseUrl}/freelancers/${profile.slug}`,
        lastModified: new Date(profile.updatedAt || profile.createdAt),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
  } catch (error) {
    // Failed to fetch profiles - continue without them
  }

  return [...staticPages, ...jobPages, ...freelancerPages];
}
