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
  ogImage = '/og-image.png',
  ogType = 'website',
  noIndex = false,
}: SEOHeadProps): Metadata {
  const defaultTitle = 'Vivid Art | Freelance Remote Work & Online Opportunities';
  const defaultDescription = 'Vivid Art is the leading freelance marketplace for remote work opportunities. Connect with verified freelancers, find high-quality online jobs, and hire top talent for your projects.';

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
    name: 'Vivid Art',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/logo.webp`,
    description: 'Vivid Art is a leading freelance marketplace connecting talented professionals with remote work opportunities worldwide.',
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
      name: 'Vivid Art',
      value: jobId,
    },
    datePosted: new Date().toISOString(),
    validThrough: deadline,
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Vivid Art',
      sameAs: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
      logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/logo.webp`,
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
      name: 'Vivid Art',
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
    name: 'Vivid Art',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    description: 'Freelance marketplace for remote work opportunities',
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
