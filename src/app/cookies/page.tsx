'use client';
import React from 'react';
import { Cookie, Settings, BarChart3, Shield, Info, ToggleLeft } from 'lucide-react';

const CookiesPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Cookie <span className="text-gradient">Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            How we use cookies and similar technologies to enhance your experience on JobHorizons.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Overview */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Cookie className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">What Are Cookies?</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              Cookies are small text files that websites place on your device to store information 
              about your preferences and activities. They help us provide you with a personalized 
              and seamless experience on JobHorizons.
            </p>
            <p className="text-muted-foreground">
              <strong>Last updated:</strong> January 2025
            </p>
          </div>
        </section>

        {/* Types of Cookies */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Info className="h-8 w-8 text-chart-1" />
              <h2 className="text-2xl font-bold text-foreground">Types of Cookies We Use</h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-l-4 border-green-500 pl-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-green-500" />
                  <h3 className="text-xl font-semibold text-foreground">Essential Cookies</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-500 rounded-full">Required</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  These cookies are necessary for the website to function properly. They enable core 
                  functionality like user authentication, security features, and basic navigation. 
                  These cannot be disabled as they are essential for the platform to work.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <div className="flex items-center gap-3 mb-3">
                  <Settings className="h-6 w-6 text-blue-500" />
                  <h3 className="text-xl font-semibold text-foreground">Functional Cookies</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-500 rounded-full">Optional</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  These cookies enhance your experience by remembering your preferences, such as 
                  language settings, dashboard layouts, and notification preferences. They make 
                  your interactions with JobHorizons more personalized and efficient.
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-6">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                  <h3 className="text-xl font-semibold text-foreground">Analytics Cookies</h3>
                  <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-500 rounded-full">Optional</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We use analytics cookies to understand how users interact with our platform. 
                  This helps us identify popular features, optimize performance, and improve the 
                  overall user experience. All data is anonymized and aggregated.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How We Use Cookies */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-8 w-8 text-chart-2" />
              <h2 className="text-2xl font-bold text-foreground">How We Use Cookies</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">User Experience</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Remember your login status across sessions</li>
                  <li>• Save your dashboard preferences and layouts</li>
                  <li>• Maintain shopping cart contents</li>
                  <li>• Store language and timezone settings</li>
                  <li>• Remember notification preferences</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Platform Improvement</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Track which features are most popular</li>
                  <li>• Identify areas for performance optimization</li>
                  <li>• Understand user navigation patterns</li>
                  <li>• Monitor system performance and errors</li>
                  <li>• Test new features with user feedback</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Cookie Management */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <ToggleLeft className="h-8 w-8 text-chart-3" />
              <h2 className="text-2xl font-bold text-foreground">Managing Your Cookie Preferences</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              Under data protection laws including GDPR and CCPA, you have control over how cookies are 
              used on your device. Here are the ways you can manage your cookie preferences:
            </p>
            
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-primary/10">
                <h3 className="text-lg font-semibold text-foreground mb-3">Platform Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Use our cookie preference center (available in your account settings) to choose 
                  which types of optional cookies you want to allow.
                </p>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                  Manage Cookie Preferences
                </button>
              </div>
              
              <div className="p-6 rounded-xl bg-chart-1/10">
                <h3 className="text-lg font-semibold text-foreground mb-3">Browser Settings</h3>
                <p className="text-muted-foreground mb-4">
                  Most browsers allow you to control cookies through their settings. You can typically 
                  block all cookies, allow only first-party cookies, or delete existing cookies.
                </p>
                <p className="text-sm text-muted-foreground">
                  Note: Blocking essential cookies may prevent some platform features from working properly.
                </p>
              </div>
              
              <div className="p-6 rounded-xl bg-chart-2/10">
                <h3 className="text-lg font-semibold text-foreground mb-3">Third-Party Tools</h3>
                <p className="text-muted-foreground">
                  You can also use browser extensions or privacy tools that help manage cookies and 
                  tracking across websites. Popular options include privacy-focused browsers and 
                  ad-blocking extensions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Third-Party Cookies */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-chart-4" />
              <h2 className="text-2xl font-bold text-foreground">Third-Party Services</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              We work with trusted third-party services to provide certain features. These services 
              may also use cookies according to their own policies:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border border-glass-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Payment Processing</h4>
                <p className="text-muted-foreground text-sm">
                  Our payment partners use cookies to process transactions securely and prevent fraud.
                </p>
              </div>
              
              <div className="p-4 border border-glass-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Analytics Services</h4>
                <p className="text-muted-foreground text-sm">
                  We use analytics services to understand user behavior and improve our platform.
                </p>
              </div>
              
              <div className="p-4 border border-glass-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Customer Support</h4>
                <p className="text-muted-foreground text-sm">
                  Support chat services may use cookies to maintain conversation context and preferences.
                </p>
              </div>
              
              <div className="p-4 border border-glass-border rounded-xl">
                <h4 className="font-semibold text-foreground mb-2">Security Services</h4>
                <p className="text-muted-foreground text-sm">
                  Security tools help protect against spam, fraud, and other malicious activities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Updates and Contact */}
        <section>
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Policy Updates and Contact</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <Info className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-3">Policy Updates</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We may update this cookie policy from time to time to reflect changes in our 
                  practices or applicable laws. We&apos;ll notify you of any significant changes.
                </p>
              </div>
              
              <div className="text-center">
                <Cookie className="h-12 w-12 text-chart-1 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-3">Questions?</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  If you have questions about our cookie policy or how we use cookies, we&apos;re here to help.
                </p>
                <a 
                  href="mailto:${process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'privacy@yourdomain.com'}" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-chart-1/20 text-chart-1 rounded-lg hover:bg-chart-1/30 transition-colors text-sm font-medium"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CookiesPage;