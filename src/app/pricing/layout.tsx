import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Pricing Plans',
  description: 'Choose the perfect plan for your needs. Flexible pricing for freelancers and clients on Vivid Art. Free plans available with premium features for Pro and Elite members.',
  keywords: [
    'freelance pricing',
    'subscription plans',
    'freelancer plans',
    'client plans',
    'Vivid Art pricing',
    'remote work pricing',
    'freelance marketplace pricing',
    'affordable freelance platform',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/pricing`,
});

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What payment methods do you accept?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. All payments are processed securely through our payment partners.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel my subscription anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, you can cancel your subscription at any time. Your plan will remain active until the end of your current billing period, and you won\'t be charged again.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens when I upgrade my plan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When you upgrade, you\'ll immediately get access to all features of your new plan. We\'ll pro-rate the cost based on your remaining billing period.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you offer refunds?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We offer a 14-day money-back guarantee on all paid plans. If you\'re not satisfied, contact our support team within 14 days of your purchase for a full refund.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a free plan?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! We offer free plans for both freelancers and clients. Free plans include core features with some limitations. You can upgrade anytime to unlock additional features and benefits.',
      },
    },
  ],
};

const offerSchemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Vivid Art Freelancer Pro Plan',
    description: 'Premium plan for freelancers with enhanced features',
    offers: {
      '@type': 'Offer',
      price: '14.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/pricing`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Vivid Art Freelancer Elite Plan',
    description: 'Elite plan for top freelancers',
    offers: {
      '@type': 'Offer',
      price: '39.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/pricing`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Vivid Art Client Business Plan',
    description: 'Business plan for hiring teams',
    offers: {
      '@type': 'Offer',
      price: '99.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/pricing`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Vivid Art Client Enterprise Plan',
    description: 'Enterprise plan with advanced features',
    offers: {
      '@type': 'Offer',
      price: '299.99',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceValidUntil: '2025-12-31',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/pricing`,
    },
  },
];

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {offerSchemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
