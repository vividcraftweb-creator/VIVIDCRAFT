'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, Shield, Star, CheckCircle, Zap, Users, TrendingUp } from 'lucide-react';

const HirePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.session?.user?.role === 'FREELANCER') {
      router.push('/jobs');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (session?.session?.user?.role === 'FREELANCER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Hire <span className="text-gradient">Quality Talent</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Connect with verified professionals who deliver exceptional results. No spam applications, no time wasters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/jobs/create" 
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium inline-flex items-center justify-center gap-2"
            >
              <UserCheck className="h-5 w-5" />
              Post Your First Job
            </Link>
            <a 
              href="/auth/signup" 
              className="px-8 py-4 glass-button border border-glass-border rounded-xl hover:scale-105 transition-transform font-medium inline-flex items-center justify-center gap-2"
            >
              <Shield className="h-5 w-5" />
              Create Account
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Why Choose JobHorizons */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Clients Choose <span className="text-gradient">JobHorizons</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the difference of a curated marketplace built for quality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/30 transition-colors">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Verified Professionals</h3>
              <p className="text-muted-foreground">
                Every freelancer goes through our verification process. No fake profiles, no scam accounts - only legitimate professionals.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-chart-1/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-chart-1/30 transition-colors">
                <Zap className="h-8 w-8 text-chart-1" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Quality Applications</h3>
              <p className="text-muted-foreground">
                Our token system ensures you receive thoughtful, relevant applications instead of generic copy-paste proposals.
              </p>
            </div>

            <div className="glass-card p-8 rounded-2xl text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 rounded-2xl bg-chart-2/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-chart-2/30 transition-colors">
                <Star className="h-8 w-8 text-chart-2" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Curated Marketplace</h3>
              <p className="text-muted-foreground">
                We maintain high standards for both projects and professionals, ensuring fair rates and quality outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works for Clients */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple <span className="text-gradient">Hiring Process</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From posting to completion in just a few steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Post Your Job</h3>
              <p className="text-muted-foreground text-sm">
                Create a detailed job posting with your requirements, budget, and timeline.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-1/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-chart-1">2</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Review Applications</h3>
              <p className="text-muted-foreground text-sm">
                Receive quality applications from verified freelancers who match your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-chart-2">3</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Hire & Collaborate</h3>
              <p className="text-muted-foreground text-sm">
                Choose your freelancer and work together using our project management tools.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-chart-3/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-chart-3">4</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Arrange Payment</h3>
              <p className="text-muted-foreground text-sm">
                Coordinate payments directly with your freelancer using trusted services like PayPal, Wise, or bank transfer.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <div className="glass-card p-12 rounded-2xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need to <span className="text-gradient">Succeed</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Powerful tools and features designed for modern hiring
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Advanced Search</h3>
                  <p className="text-muted-foreground text-sm">Filter freelancers by skills, experience, rates, and availability.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-chart-1/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-chart-1" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Transparent Agreements</h3>
                  <p className="text-muted-foreground text-sm">Document milestones and settle payments externally while keeping everything coordinated in JobHorizons.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-chart-2" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Team Collaboration</h3>
                  <p className="text-muted-foreground text-sm">Built-in messaging and file sharing for seamless project management.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-chart-3/20 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground text-sm">Track project progress, spending, and freelancer performance.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-chart-4/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-chart-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Quality Assurance</h3>
                  <p className="text-muted-foreground text-sm">Our support team helps resolve disputes and ensures project success.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Verified Reviews</h3>
                  <p className="text-muted-foreground text-sm">Authentic feedback system helps you make informed hiring decisions.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section>
          <div className="glass-card p-12 rounded-2xl text-center bg-gradient-to-br from-primary/5 to-chart-1/5">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to Find Your Next <span className="text-gradient">Star Player</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied clients who have found their perfect freelancers on JobHorizons. 
              Post your first job today and experience the difference quality makes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/jobs/create" 
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium inline-flex items-center justify-center gap-2"
              >
                <UserCheck className="h-5 w-5" />
                Post a Job - It&apos;s Free
              </Link>
              <a 
                href="/pricing" 
                className="px-8 py-4 glass-button border border-glass-border rounded-xl hover:scale-105 transition-transform font-medium inline-flex items-center justify-center gap-2"
              >
                <Star className="h-5 w-5" />
                View Pricing
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HirePage;
