import "@/app/globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'),
  title: {
    default: 'Vivid Art | Online Art Marketplace - Buy Art & Discover Artists',
    template: '%s | Vivid Art - Art Marketplace',
  },
  description: 'Vivid Art is the leading online art marketplace. Discover extraordinary artwork from independent artists, buy original art, and showcase your creative services. Join a vibrant community of artists and art collectors worldwide.',
  keywords: [
    'buy art online',
    'art marketplace',
    'original artwork',
    'independent artists',
    'art for sale',
    'discover artists',
    'art gallery online',
    'contemporary art',
    'art collectors',
    'commission art',
    'artist services',
    'fine art marketplace',
    'digital art',
    'art prints',
    'creative marketplace',
  ],
  authors: [{ name: 'Vivid Art' }],
  creator: 'Vivid Art',
  publisher: 'Vivid Art',
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
    title: 'Vivid Art',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    siteName: 'Vivid Art',
    title: 'Vivid Art | Online Art Marketplace - Discover & Collect Art',
    description: 'Discover extraordinary artwork from independent artists. Vivid Art connects collectors with talented artists worldwide.',
    images: [
      {
        url: '/vivid-art-og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vivid Art - Online Art Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vivid Art | Online Art Marketplace - Discover & Collect Art',
    description: 'Discover extraordinary artwork from independent artists. Connect with talented artists worldwide.',
    images: ['/vivid-art-og-image.png'],
    creator: '@vividart',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import Provider from './_trpc/Provider';
import SessionProvider from '@/components/providers/SessionProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vivid Art',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
    description: 'Vivid Art is a leading online art marketplace connecting independent artists with art collectors worldwide.',
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
    name: 'Vivid Art',
    url: siteUrl,
    description: 'Online art marketplace for buying and selling artwork',
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
        description: 'Sign up and start your art journey on Vivid Art',
        url: `${siteUrl}/freelancers/getting-started`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'Explore Art',
        description: 'Browse and discover original artwork',
        url: `${siteUrl}/jobs`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'Discover Artists',
        description: 'Find and connect with talented independent artists',
        url: `${siteUrl}/freelancers`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 4,
        name: 'How It Works',
        description: 'Learn how Vivid Art connects artists with collectors',
        url: `${siteUrl}/how-it-works`,
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased min-h-screen overflow-x-hidden"
        suppressHydrationWarning
      >
        {/* JSON-LD structured data */}
        <script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          id="schema-navigation"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }}
        />
        <LanguageProvider>
          {process.env.NODE_ENV === 'production' && <SpeedInsights />}
          <SessionProvider session={session}>
            <Provider>
              <ConditionalLayout session={session}>
                {children}
              </ConditionalLayout>
              <Toaster />
            </Provider>
          </SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}