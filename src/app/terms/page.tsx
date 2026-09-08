'use client';
import React from 'react';
import { Scale, FileText, Shield, AlertTriangle, Users, Handshake } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Terms of <span className="text-gradient">Service</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The terms and conditions that govern your use of the JobHorizons platform.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Overview */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Agreement Overview</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              By using JobHorizons, you agree to these terms of service. This agreement governs your 
              access to and use of our platform, including all features, services, and content we provide.
            </p>
            <p className="text-muted-foreground">
              <strong>Effective Date:</strong> January 2025
            </p>
          </div>
        </section>

        {/* Platform Usage */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-chart-1" />
              <h2 className="text-2xl font-bold text-foreground">Platform Usage</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Account Registration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You must provide accurate and complete information when creating your account. 
                  You are responsible for maintaining the security of your account credentials 
                  and for all activities that occur under your account.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Token System</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Artists receive 150 application tokens weekly. Tokens are used to apply for jobs 
                  and cannot be transferred, sold, or refunded. Unused tokens do not carry over to 
                  subsequent weeks.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Professional Conduct</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All users must maintain professional standards in their interactions. This includes 
                  honest representation of skills, timely communication, and respectful treatment of 
                  other platform members.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services and Features */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-8 w-8 text-chart-2" />
              <h2 className="text-2xl font-bold text-foreground">Services and Features</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">For Artists</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Job discovery and application system</li>
                  <li>• Profile creation and portfolio showcase</li>
                  <li>• Client communication tools</li>
                  <li>• Payment processing and dispute resolution</li>
                  <li>• Performance analytics and feedback</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">For Clients</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Job posting and management tools</li>
                  <li>• Access to verified freelancer profiles</li>
                  <li>• Secure payment and contract management</li>
                  <li>• Quality assurance and support services</li>
                  <li>• Project tracking and milestone management</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Payments and Fees */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Handshake className="h-8 w-8 text-chart-3" />
              <h2 className="text-2xl font-bold text-foreground">Payments and Fees</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              Our platform introduces clients and freelancers, offering collaboration tools and premium analytics
              through subscription fees. All project payments are handled directly between the parties using their
              preferred external services.
            </p>
            
            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-foreground mb-2">Payment Arrangements</h4>
                <p className="text-muted-foreground">
                  JobHorizons does not operate an escrow or payout service. Clients and freelancers are responsible for
                  agreeing on payment terms, documenting milestones, and transferring funds via trusted third-party
                  providers such as PayPal or bank transfer.
                </p>
              </div>
              
              <div className="border-l-4 border-chart-1 pl-4">
                <h4 className="font-semibold text-foreground mb-2">Service Fees</h4>
                <p className="text-muted-foreground">
                  Platform fees vary based on transaction volume and user verification status. 
                  All fees are clearly disclosed before any transaction is completed.
                </p>
              </div>
              
              <div className="border-l-4 border-chart-2 pl-4">
                <h4 className="font-semibold text-foreground mb-2">Refunds and Disputes</h4>
                <p className="text-muted-foreground">
                  We provide mediation services for project disputes and will facilitate refunds 
                  when appropriate according to our dispute resolution policy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prohibited Activities */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <h2 className="text-2xl font-bold text-foreground">Prohibited Activities</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              To maintain a safe and professional environment, the following activities are strictly prohibited:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Misrepresenting skills, experience, or identity</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Attempting to circumvent platform payments</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Posting fraudulent or illegal job opportunities</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Harassment or discriminatory behavior</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Spamming or unsolicited communications</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Sharing copyrighted material without permission</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Attempting to hack or compromise platform security</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0"></div>
                  <p className="text-muted-foreground">Creating multiple accounts to circumvent restrictions</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Responsibilities */}
        <section className="mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-8 w-8 text-chart-4" />
              <h2 className="text-2xl font-bold text-foreground">Platform Responsibilities</h2>
            </div>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              While we strive to provide a safe and reliable platform, users should understand 
              our responsibilities and limitations:
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/10">
                <h4 className="font-semibold text-foreground mb-2">What We Provide</h4>
                <p className="text-muted-foreground text-sm">
                  Platform infrastructure, security measures, payment processing, dispute mediation, 
                  and customer support services.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-chart-1/10">
                <h4 className="font-semibold text-foreground mb-2">User Responsibility</h4>
                <p className="text-muted-foreground text-sm">
                  Users are responsible for their own interactions, work quality, meeting deadlines, 
                  and ensuring compliance with applicable laws and regulations.
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-chart-2/10">
                <h4 className="font-semibold text-foreground mb-2">Limitation of Liability</h4>
                <p className="text-muted-foreground text-sm">
                  We cannot guarantee specific outcomes and are not liable for issues arising from 
                  user interactions, work quality, or external factors beyond our control.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="glass-card p-8 rounded-2xl text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">Questions About Terms?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you have questions about these terms or need clarification on any policies, 
              please don&apos;t hesitate to contact our legal team.
            </p>
            <a 
              href={`mailto:${process.env.NEXT_PUBLIC_LEGAL_EMAIL || 'legal@yourdomain.com'}`} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              <FileText className="h-4 w-4" />
              Contact Legal Team
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
