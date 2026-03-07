import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "block", // Block rendering until font loads to prevent FOUC
  fallback: ["system-ui", "arial"],
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional", // Optional for monospace since it's not critical
  fallback: ["ui-monospace", "monospace"],
  preload: false, // Only preload fonts used on every page
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'),
  title: {
    default: 'JobHorizons | Freelance Remote Work & Online Opportunities - Hire Top Freelancers',
    template: '%s | JobHorizons - Find Remote Work & Freelance Jobs',
  },
  description: 'JobHorizons is the leading freelance marketplace for remote work opportunities. Connect with verified freelancers, find high-quality online jobs, and hire top talent for your projects. Join thousands of professionals working remotely worldwide.',
  keywords: [
    'freelance jobs',
    'remote work',
    'online freelance marketplace',
    'hire freelancers online',
    'work from home opportunities',
    'freelance remote work',
    'online jobs',
    'freelancer marketplace',
    'remote freelance jobs',
    'hire remote workers',
    'freelance platform',
    'online work opportunities',
    'digital nomad jobs',
    'remote job board',
    'freelance gigs',
  ],
  authors: [{ name: 'JobHorizons' }],
  creator: 'JobHorizons',
  publisher: 'JobHorizons',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JobHorizons',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    siteName: 'JobHorizons',
    title: 'JobHorizons | Freelance Remote Work & Online Opportunities',
    description: 'Find freelance remote work opportunities and hire verified freelancers online. JobHorizons connects talented professionals with quality projects worldwide.',
    images: [
      {
        url: '/jobhorizons-og-image.png',
        width: 1200,
        height: 630,
        alt: 'JobHorizons - Freelance Remote Work Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobHorizons | Freelance Remote Work & Online Opportunities',
    description: 'Find freelance remote work opportunities and hire verified freelancers online. Connect with top talent worldwide.',
    images: ['/jobhorizons-og-image.png'],
    creator: '@jobhorizons',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d0d14',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import Provider from './_trpc/Provider';
import SessionProvider from '@/components/providers/SessionProvider';
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'JobHorizons',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
    description: 'JobHorizons is a leading freelance marketplace connecting talented professionals with remote work opportunities worldwide.',
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

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JobHorizons',
    url: siteUrl,
    description: 'Freelance marketplace for remote work opportunities',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/jobs?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const siteNavigationSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'SiteNavigationElement',
        position: 1,
        name: 'Get Started',
        description: 'Sign up and start your freelance journey on JobHorizons',
        url: `${siteUrl}/freelancers/getting-started`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'Find Work',
        description: 'Browse and apply to remote freelance jobs',
        url: `${siteUrl}/jobs`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'Hire Freelancers',
        description: 'Find and hire talented freelancers for your projects',
        url: `${siteUrl}/freelancers`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 4,
        name: 'How It Works',
        description: 'Learn how JobHorizons connects freelancers with clients',
        url: `${siteUrl}/how-it-works`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 5,
        name: 'Pricing',
        description: 'View our pricing plans for freelancers and clients',
        url: `${siteUrl}/pricing`,
      },
    ],
  };

  return (
    <html lang="en" className="dark" suppressHydrationWarning style={{
      background: 'oklch(0.08 0.005 264)',
      color: 'oklch(0.98 0.002 264)',
    }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen overflow-x-hidden`}
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: 0,
        }}
      >
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
        <SessionProvider session={session}>
          <Provider>
            <ConditionalLayout session={session}>
              {children}
            </ConditionalLayout>
            <Toaster />
          </Provider>
        </SessionProvider>
      </body>
    </html>
  );
}
