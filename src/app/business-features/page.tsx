'use client';

import { useState } from 'react';
import { Crown, Users, Search, FolderOpen, Headphones, ArrowRight } from 'lucide-react';
import TeamCollaboration from '@/components/collaboration/TeamCollaboration';
import EnhancedProjectManagement from '@/components/project/EnhancedProjectManagement';
import PrioritySupport from '@/components/support/PrioritySupport';
import Link from 'next/link';

type DemoKey = 'search' | 'collaboration' | 'project' | 'support';

const FEATURE_NAV_ITEMS: Array<{ key: DemoKey; label: string; icon: typeof Search }> = [
  { key: 'search', label: 'Advanced Search', icon: Search },
  { key: 'collaboration', label: 'Team Collaboration', icon: Users },
  { key: 'project', label: 'Project Management', icon: FolderOpen },
  { key: 'support', label: 'Priority Support', icon: Headphones },
];

export default function BusinessFeaturesPage() {
  const [activeDemo, setActiveDemo] = useState<DemoKey>('search');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/90">
      {/* Hero Section */}
      <div className="relative pt-6 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Business Plan <span className="text-gradient">Features</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Experience advanced tools designed for growing businesses and teams
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/dashboard?tab=subscription" 
              className="px-8 py-4 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium inline-flex items-center justify-center gap-2"
            >
              <Crown className="h-5 w-5" />
              Upgrade to Business Plan - $9.99/month
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        {/* Feature Navigation */}
        <div className="mb-12">
          <div className="glass-card p-2 rounded-2xl bg-white/5 border border-white/10 w-fit mx-auto">
            <div className="flex space-x-2">
              {FEATURE_NAV_ITEMS.map((feature) => (
                <button
                  key={feature.key}
                  onClick={() => setActiveDemo(feature.key)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeDemo === feature.key
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <feature.icon className="h-4 w-4" />
                  <span>{feature.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Demos */}
        <div className="space-y-12">
          {activeDemo === 'search' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">Advanced Freelancer Search</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Find the perfect freelancers with powerful filtering by skills, rates, ratings, availability, and more.
                </p>
              </div>
              
              <div className="glass-card p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-foreground">Business Plan Search Features</h3>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Search className="h-6 w-6 text-blue-400 mb-3" />
                    <h4 className="font-semibold text-foreground mb-2">Skills & Expertise Filter</h4>
                    <p className="text-sm text-muted-foreground">Filter by specific technologies, frameworks, and skills</p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-green-400 text-lg font-bold mb-3">$$$</div>
                    <h4 className="font-semibold text-foreground mb-2">Rate Range Filtering</h4>
                    <p className="text-sm text-muted-foreground">Set minimum and maximum hourly rates</p>
                  </div>
                  
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-1 mb-3">
                      <div className="text-yellow-400">★★★★★</div>
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">Rating & Review Filter</h4>
                    <p className="text-sm text-muted-foreground">Find top-rated freelancers with proven track records</p>
                  </div>
                </div>
                
                <div className="text-center">
                  <Link 
                    href="/freelancers"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Try Advanced Search
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeDemo === 'collaboration' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">Team Collaboration Tools</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Invite team members, assign roles, and collaborate on projects together with advanced permission management.
                </p>
              </div>
              <TeamCollaboration />
            </div>
          )}

          {activeDemo === 'project' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">Enhanced Project Management</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Track milestones, manage files, and monitor project progress with comprehensive project management tools.
                </p>
              </div>
              <EnhancedProjectManagement />
            </div>
          )}

          {activeDemo === 'support' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">Priority Support</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Get priority assistance with faster response times, live chat support, and dedicated help from our specialist team.
                </p>
              </div>
              <PrioritySupport />
            </div>
          )}
        </div>

        {/* Upgrade CTA */}
        <div className="mt-20">
          <div className="glass-card p-12 rounded-2xl text-center bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-2 border-yellow-500/20">
            <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to <span className="text-gradient">Upgrade</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get all these powerful features and more with Business Plan. Perfect for growing teams and businesses that need advanced tools.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8 max-w-4xl mx-auto">
              <div className="text-left">
                <h3 className="text-xl font-semibold text-foreground mb-4">What&apos;s Included:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Unlimited job postings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Advanced freelancer search & filtering</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Team collaboration tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Enhanced project management</span>
                  </li>
                </ul>
              </div>
              
              <div className="text-left">
                <h3 className="text-xl font-semibold text-foreground mb-4">Plus:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Priority job placement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Priority support (&lt; 1 hour response)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>File storage and sharing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Advanced analytics and reporting</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/dashboard?tab=subscription" 
                className="px-8 py-4 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium inline-flex items-center justify-center gap-2"
              >
                <Crown className="h-5 w-5" />
                Upgrade Now - $9.99/month
              </Link>
              <Link 
                href="/pricing/clients" 
                className="px-8 py-4 glass-button border border-glass-border rounded-xl hover:scale-105 transition-transform font-medium inline-flex items-center justify-center gap-2"
              >
                View All Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
