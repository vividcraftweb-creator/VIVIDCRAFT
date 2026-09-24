import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://vividcraft.vercel.app'),
  title: {
    default: 'Cinnamon Gallery | Online Art Marketplace - Buy Art & Discover Artists',
    template: '%s | Cinnamon Gallery - Art Marketplace',
  },
  description: 'Cinnamon Gallery is the leading online art marketplace. Discover extraordinary artwork from independent artists, buy original art, and showcase your creative services. Join a vibrant community of artists and art collectors worldwide.',
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
  authors: [{ name: 'Cinnamon Gallery' }],
  creator: 'Cinnamon Gallery',
  publisher: 'Cinnamon Gallery',
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
    title: 'Cinnamon Gallery',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com',
    siteName: 'Cinnamon Gallery',
    title: 'Cinnamon Gallery | Online Art Marketplace - Discover & Collect Art',
    description: 'Discover extraordinary artwork from independent artists. Cinnamon Gallery connects collectors with talented artists worldwide.',
    images: [
      {
        url: '/cinnamon-gallery-og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cinnamon Gallery - Online Art Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cinnamon Gallery | Online Art Marketplace - Discover & Collect Art',
    description: 'Discover extraordinary artwork from independent artists. Connect with talented artists worldwide.',
    images: ['/cinnamon-gallery-og-image.png'],
    creator: '@cinnamongallery',
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
    { media: '(prefers-color-scheme: light)', color: '#F8F6F1' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1B18' },
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
import WhatsAppFloat from '@/components/WhatsAppFloat';

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vividcraft.vercel.app';

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cinnamon Gallery',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
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

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Cinnamon Gallery',
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
        description: 'Sign up and start your art journey on Cinnamon Gallery',
        url: `${siteUrl}/freelancers/getting-started`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'Discover Artists',
        description: 'Find and connect with talented independent artists',
        url: `${siteUrl}/freelancers`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'How It Works',
        description: 'Learn how Cinnamon Gallery connects artists with collectors',
        url: `${siteUrl}/how-it-works`,
      },
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="dom-null-safety-shield"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // Disable and remove any dynamically injected ma_payload.js or tracking scripts
                try {
                  var blockObserver = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var added = mutations[i].addedNodes;
                      for (var j = 0; j < added.length; j++) {
                        var node = added[j];
                        if (node && node.tagName === 'SCRIPT') {
                          var src = node.src || (node.getAttribute && node.getAttribute('src')) || '';
                          if (src.indexOf('ma_payload') !== -1) {
                            node.type = 'text/plain';
                            if (node.parentNode) node.parentNode.removeChild(node);
                          }
                        }
                      }
                    }
                  });
                  if (document.documentElement) {
                    blockObserver.observe(document.documentElement, { childList: true, subtree: true });
                  }
                } catch (e) {}

                // 1. Safe proxy for DOM elements queried before mounting/hydration
                var safeDummyElement = {
                  getAttribute: function(name) { return ''; },
                  setAttribute: function() {},
                  hasAttribute: function() { return false; },
                  removeAttribute: function() {},
                  getAttributeNames: function() { return []; },
                  querySelector: function() { return null; },
                  querySelectorAll: function() { return []; },
                  getElementsByTagName: function() { return []; },
                  getElementsByClassName: function() { return []; },
                  classList: {
                    add: function() {},
                    remove: function() {},
                    contains: function() { return false; },
                    toggle: function() { return false; }
                  },
                  value: '',
                  textContent: '',
                  innerText: '',
                  style: {},
                  dataset: {},
                  tagName: 'DIV',
                  nodeName: 'DIV',
                  nodeType: 1,
                  children: [],
                  childNodes: [],
                  addEventListener: function() {},
                  removeEventListener: function() {},
                };

                // Expose safe global fallbacks for third-party scripts/extensions
                try {
                  window.getUserFbFullName = window.getUserFbFullName || function() { return ''; };
                  window.addFUserInfo = window.addFUserInfo || function() { return Promise.resolve({}); };
                } catch (e) {}

                function isTrackingStack(stack) {
                  return (
                    stack.indexOf('ma_payload') !== -1 ||
                    stack.indexOf('getAttribute') !== -1 ||
                    stack.indexOf('getUserFbFullName') !== -1 ||
                    stack.indexOf('addFUserInfo') !== -1 ||
                    stack.indexOf('Fb') !== -1
                  );
                }

                try {
                  var origDocQuery = Document.prototype.querySelector;
                  Document.prototype.querySelector = function(sel) {
                    var res = origDocQuery.call(this, sel);
                    if (res) return res;
                    try {
                      var stack = (new Error()).stack || '';
                      if (isTrackingStack(stack)) return safeDummyElement;
                    } catch (e) {}
                    return null;
                  };

                  if (typeof Element !== 'undefined' && Element.prototype) {
                    var origElQuery = Element.prototype.querySelector;
                    Element.prototype.querySelector = function(sel) {
                      var res = origElQuery.call(this, sel);
                      if (res) return res;
                      try {
                        var stack = (new Error()).stack || '';
                        if (isTrackingStack(stack)) return safeDummyElement;
                      } catch (e) {}
                      return null;
                    };
                  }

                  var origGetId = Document.prototype.getElementById;
                  Document.prototype.getElementById = function(id) {
                    var res = origGetId.call(this, id);
                    if (res) return res;
                    try {
                      var stack = (new Error()).stack || '';
                      if (isTrackingStack(stack)) return safeDummyElement;
                    } catch (e) {}
                    return null;
                  };
                } catch (domPatchErr) {}

                // 2. Intercept unhandled promise rejections (ma_payload.js / third-party analytics / getAttribute crashes)
                window.addEventListener('unhandledrejection', function(event) {
                  try {
                    var reason = event && event.reason;
                    var msg = (reason && (reason.message || String(reason))) || '';
                    var stack = (reason && reason.stack) || '';
                    if (
                      msg.indexOf('getAttribute') !== -1 ||
                      msg.indexOf('ma_payload') !== -1 ||
                      msg.indexOf('getUserFbFullName') !== -1 ||
                      msg.indexOf('addFUserInfo') !== -1 ||
                      stack.indexOf('getAttribute') !== -1 ||
                      stack.indexOf('ma_payload') !== -1 ||
                      stack.indexOf('getUserFbFullName') !== -1 ||
                      stack.indexOf('addFUserInfo') !== -1
                    ) {
                      if (event.preventDefault) event.preventDefault();
                      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    }
                  } catch (e) {}
                }, true);

                // 3. Intercept global DOM errors before elements mount
                window.addEventListener('error', function(event) {
                  try {
                    var msg = (event && (event.message || '')) || '';
                    var filename = (event && (event.filename || '')) || '';
                    if (
                      msg.indexOf('getAttribute') !== -1 ||
                      msg.indexOf('ma_payload') !== -1 ||
                      msg.indexOf('getUserFbFullName') !== -1 ||
                      msg.indexOf('addFUserInfo') !== -1 ||
                      filename.indexOf('ma_payload') !== -1
                    ) {
                      if (event.preventDefault) event.preventDefault();
                      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                    }
                  } catch (e) {}
                }, true);

                // 4. Fallback for document.currentScript when queried by async modules/scripts
                try {
                  var originalDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'currentScript') ||
                                     Object.getOwnPropertyDescriptor(document, 'currentScript');
                  if (originalDesc && originalDesc.get) {
                    var origGet = originalDesc.get;
                    Object.defineProperty(document, 'currentScript', {
                      get: function() {
                        var el = origGet.call(this);
                        if (el) return el;
                        try {
                          var err = new Error();
                          var stack = err.stack || '';
                          if (stack.indexOf('ma_payload') !== -1 || stack.indexOf('getAttribute') !== -1) {
                            return safeDummyElement;
                          }
                        } catch (e) {}
                        return null;
                      },
                      configurable: true
                    });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased min-h-screen overflow-x-hidden bg-[#F8F6F1] dark:bg-[#1E1B18] text-slate-900 dark:text-slate-100 transition-colors duration-200`}
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
              <WhatsAppFloat />
              <Toaster />
            </Provider>
          </SessionProvider>
        </LanguageProvider>

        {/* Strict Style Overrides to Prevent Google Translate Body-Blinking / DOM Flicker */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                overflow-x: hidden;
                overflow-y: auto !important;
                scroll-behavior: smooth;
              }
              body {
                top: 0px !important;
                position: static !important;
                min-height: 100vh;
                overflow-x: hidden;
                overflow-y: auto !important;
              }
              .goog-te-banner-frame {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                width: 0 !important;
                opacity: 0 !important;
              }
              .skiptranslate {
                display: none !important;
              }
              body > .skiptranslate {
                display: none !important;
              }
              #goog-gt-tt, .goog-te-balloon-frame {
                display: none !important;
              }
              .goog-text-highlight {
                background: none !important;
                box-shadow: none !important;
              }
            `,
          }}
        />

        {/* Hidden Google Translate Element & Script */}
        <div
          id="google_translate_element"
          className="hidden opacity-0 pointer-events-none fixed -top-96 -left-96 w-0 h-0 overflow-hidden"
          aria-hidden="true"
        />
        <script
          id="google-translate-init"
          dangerouslySetInnerHTML={{
            __html: `
              window.googleTranslateElementInit = function() {
                if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                  new window.google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: 'si,en',
                    autoDisplay: false
                  }, 'google_translate_element');
                }
              };
              // Suppress Google Translate frame dynamic top-margin injection to stop continuous layout re-renders and visual flickering
              if (typeof window !== 'undefined') {
                const suppressGoogleTranslateFlicker = function() {
                  if (document.body && document.body.style.top && document.body.style.top !== '0px') {
                    document.body.style.top = '0px';
                  }
                  if (document.body && document.body.style.position && document.body.style.position !== 'static') {
                    document.body.style.position = 'static';
                  }
                };
                try {
                  const observer = new MutationObserver(suppressGoogleTranslateFlicker);
                  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
                  if (document.body) {
                    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
                    });
                  }
                } catch(e) {}
              }
            `,
          }}
        />
        <Script
          id="google-translate-script"
          strategy="afterInteractive"
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        />
      </body>
    </html>
  );
}