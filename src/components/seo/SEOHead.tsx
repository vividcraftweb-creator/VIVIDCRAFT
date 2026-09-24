import { Metadata } from 'next';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  schema?: object;
  noIndex?: boolean;
}

export function generateSEOMetadata({
  title,
  description,
  keywords,
  ogImage = '/cinnamon-gallery-og-image.png',
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps): Metadata {
  const defaultTitle = 'Cinnamon Gallery | Online Art Marketplace & Creative Community';
  const defaultDescription = 'Cinnamon Gallery is the leading online art marketplace. Connect with verified artists, discover extraordinary artwork, commission original pieces, and showcase creative services.';

  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: keywords?.join(', '),
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      type: ogType,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: finalTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: finalDescription,
      images: [ogImage],
    },
    robots: noIndex ? {
      index: false,
      follow: false,
    } : {
      index: true,
      follow: true,
    },
  };
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cinnamon Gallery',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/cinnamon-gallery-logo.png`,
    description: 'Cinnamon Gallery is a leading online art marketplace connecting independent artists with art collectors worldwide.',
    sameAs: [
      process.env.NEXT_PUBLIC_TWITTER_URL || '',
      process.env.NEXT_PUBLIC_LINKEDIN_URL || '',
      process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface JobPostingSchemaProps {
  title: string;
  description: string;
  budget: number;
  deadline: string;
  location?: string;
  jobId: string;
}

export function JobPostingSchema({ title, description, budget, deadline, location = 'Remote', jobId }: JobPostingSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: title,
    description: description,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Cinnamon Gallery',
      value: jobId,
    },
    datePosted: new Date().toISOString(),
    validThrough: deadline,
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Cinnamon Gallery',
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
      logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/cinnamon-gallery-logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: location,
        addressCountry: 'Worldwide',
      },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        value: budget,
        unitText: 'PROJECT',
      },
    },
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'Worldwide',
    },
    jobLocationType: 'TELECOMMUTE',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface PersonSchemaProps {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url: string;
  skills?: string[];
  location?: string;
}

export function PersonSchema({ name, jobTitle, description, image, url, skills, location }: PersonSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: name,
    jobTitle: jobTitle,
    description: description,
    image: image,
    url: url,
    knowsAbout: skills,
    worksFor: {
      '@type': 'Organization',
      name: 'Cinnamon Gallery',
    },
    address: location ? {
      '@type': 'PostalAddress',
      addressLocality: location,
    } : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Cinnamon Gallery',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    description: 'Online art marketplace for buying and selling artwork',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/jobs?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
