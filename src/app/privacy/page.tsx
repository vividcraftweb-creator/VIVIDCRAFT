'use client';
import React from 'react';
import { Shield, Eye, Lock, Database, Users, Mail } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Your privacy matters. Here&apos;s how we protect and handle your personal information.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Overview */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Our Commitment</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              At JobHorizons, we are committed to protecting your privacy and ensuring transparency 
              about how we collect, use, and safeguard your personal information. This policy 
              explains our practices in clear, understandable terms.
            </p>
            <p className="text-muted-foreground">
              <strong>Last updated:</strong> January 2025
            </p>
          </div>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-8 w-8 text-chart-1" />
              <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Account Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  When you create an account, we collect basic information such as your name, email address, 
                  and professional details. For verified accounts, we may collect additional documentation 
                  for identity verification purposes.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Usage Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We collect information about how you use our platform, including pages visited, 
                  features used, and interactions with other users. This helps us improve our service 
                  and provide personalized experiences.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Communication Data</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Messages exchanged through our platform are stored to facilitate your work relationships 
                  and provide customer support when needed. We use encryption to protect sensitive communications.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How We Use Your Information */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="h-8 w-8 text-chart-2" />
              <h2 className="text-2xl font-bold text-foreground">How We Use Your Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Platform Operations</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Matching freelancers with relevant opportunities</li>
                  <li>• Processing payments and maintaining transaction records</li>
                  <li>• Providing customer support and resolving disputes</li>
                  <li>• Preventing fraud and maintaining platform security</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Service Improvement</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Analyzing usage patterns to enhance features</li>
                  <li>• Personalizing your platform experience</li>
                  <li>• Sending relevant notifications and updates</li>
                  <li>• Conducting research for product development</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Data Protection */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="h-8 w-8 text-chart-3" />
              <h2 className="text-2xl font-bold text-foreground">Data Protection</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              We implement industry-standard security measures to protect your personal information, 
              including encryption, secure servers, and regular security audits. Access to your data 
              is strictly limited to authorized personnel who need it to provide our services.
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-primary/10">
                <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">End-to-End Encryption</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-chart-1/10">
                <Shield className="h-8 w-8 text-chart-1 mx-auto mb-2" />
                <p className="text-sm font-medium">Regular Security Audits</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-chart-2/10">
                <Database className="h-8 w-8 text-chart-2 mx-auto mb-2" />
                <p className="text-sm font-medium">Secure Data Storage</p>
              </div>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-chart-4" />
              <h2 className="text-2xl font-bold text-foreground">Your Rights</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              You have control over your personal information. You can access, update, or delete 
              your data at any time through your account settings. For additional requests or 
              questions about your privacy rights, please contact us.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">Access and download your personal data</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">Correct inaccurate or incomplete information</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">Request deletion of your account and data</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">Opt out of non-essential communications</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="glass-card p-8 rounded-2xl text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Mail className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Questions About Privacy?</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you have any questions about this Privacy Policy or how we handle your personal 
              information, we&apos;re here to help.
            </p>
            <a 
              href="mailto:${process.env.NEXT_PUBLIC_PRIVACY_EMAIL || 'privacy@yourdomain.com'}" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              <Mail className="h-4 w-4" />
              Contact Privacy Team
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;