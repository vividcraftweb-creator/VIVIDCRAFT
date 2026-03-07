import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'How It Works',
  description: 'Learn how JobHorizons connects freelancers with clients. Step-by-step guide to posting jobs, finding work, submitting proposals, and managing projects on our platform.',
  keywords: [
    'how JobHorizons works',
    'freelance platform guide',
    'hire freelancers guide',
    'find freelance work',
    'remote work platform',
    'freelance marketplace guide',
    'post jobs online',
    'submit proposals',
  ],
  canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/how-it-works',
});

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does JobHorizons work for freelancers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Freelancers create a profile showcasing their skills and portfolio, browse curated job opportunities, and apply using token-based applications. Once a client selects you, you collaborate directly with them off-platform using your preferred tools.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does JobHorizons work for clients?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Clients post detailed project briefs with scope, budget, and expectations. Freelancers submit structured proposals which clients review in a centralized dashboard. After selecting the right freelancer, both parties move the relationship to their preferred collaboration tools.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do I need to pay to use JobHorizons?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'JobHorizons offers free plans for both freelancers and clients. Premium plans (Pro and Elite for freelancers, Business and Enterprise for clients) provide additional features like more application tokens, advanced analytics, and priority support.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do application tokens work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Freelancers use tokens to apply for jobs. Free plan members get weekly tokens, while Pro and Elite members receive more tokens and faster refresh rates. This system ensures quality applications and helps freelancers focus on the best-fit opportunities.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens after I hire a freelancer or get hired?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'After both parties agree to work together, the relationship moves off-platform. You manage deliverables, contracts, and payments using your own preferred tools and systems. JobHorizons facilitates the connection, but doesn\'t handle ongoing project management.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are freelancers verified on JobHorizons?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, JobHorizons offers ID verification for freelancers. Verified profiles display a badge, helping build trust with clients. The platform also includes fraud detection and reporting systems to maintain a professional community.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I get started on JobHorizons?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Getting started is easy. Sign up for a free account, complete your profile (for freelancers) or post your first job (for clients), and start connecting. The entire process takes just a few minutes.',
      },
    },
  ],
};

export default function HowItWorksLayout({
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
      {children}
    </>
  );
}
