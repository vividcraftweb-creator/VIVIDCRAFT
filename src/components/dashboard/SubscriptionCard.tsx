'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Crown,
  Zap,
  ArrowUpCircle,
  Check,
  X,
  Star,
  Users,
  BarChart3,
  Briefcase,
  Loader2,
  Sparkles,
  TrendingUp,
  FileText,
  Headphones,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan } from '@/types/database.types';

interface PlanFeature {
  name: string;
  included: boolean;
  icon?: ComponentType<{ className?: string }>;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  name: string;
  price: number;
  description: string;
  features: PlanFeature[];
  isCurrentPlan: boolean;
  isPopular?: boolean;
  onUpgrade: (plan: SubscriptionPlan) => void;
  loading?: boolean;
}

function PlanCard({ 
  plan, 
  name, 
  price, 
  description, 
  features, 
  isCurrentPlan, 
  isPopular, 
  onUpgrade,
  loading 
}: PlanCardProps) {
  return (
    <div className={`relative glass-card p-6 rounded-3xl bg-white/5 border ${
      isCurrentPlan 
        ? 'border-blue-500/50' 
        : isPopular 
          ? 'border-yellow-500/50' 
          : 'border-white/10'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-yellow-500 text-white px-4 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            <Crown className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
        <p className="text-slate-400 text-sm mb-4">{description}</p>
        <div className="flex items-baseline justify-center">
          <span className="text-3xl font-bold text-white">${price}</span>
          <span className="text-slate-400 text-sm ml-1">/month</span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
          <div key={index} className="flex items-center space-x-3">
            <div className={`p-1 rounded-full ${
              feature.included 
                ? 'bg-green-500/20' 
                : 'bg-red-500/20'
            }`}>
              {feature.included ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <X className="h-3 w-3 text-red-400" />
              )}
            </div>
            <div className="flex items-center space-x-2">
              {IconComponent ? <IconComponent className="h-4 w-4 text-slate-400" /> : null}
              <span className={`text-sm ${
                feature.included ? 'text-white' : 'text-slate-500'
              }`}>
                {feature.name}
              </span>
            </div>
          </div>
        );})}
      </div>

      <Button
        onClick={() => onUpgrade(plan)}
        disabled={isCurrentPlan || loading || price === 0}
        className={`w-full ${
          isCurrentPlan
            ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
            : isPopular
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : price === 0 ? (
          'Free Plan'
        ) : (
          <>
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Upgrade to {name}
          </>
        )}
      </Button>
    </div>
  );
}

interface SubscriptionCardProps {
  userRole?: 'CLIENT' | 'FREELANCER';
}

export default function SubscriptionCard({ userRole }: SubscriptionCardProps) {
  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null);

  const role = userRole ?? 'CLIENT';

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan);
    toast.info('Upgrades will be available soon. Thanks for your interest!');
    setTimeout(() => setUpgrading(null), 1000);
  };

  // Define plan features based on the pricing structure
  const getPlanFeatures = (planType: SubscriptionPlan): PlanFeature[] => {
    const isFreelancer = planType.startsWith('FREELANCER');
    
    if (isFreelancer) {
      switch (planType) {
        case SubscriptionPlan.FREELANCER_FREE:
          return [
            { name: '150 application tokens/week', included: true, icon: Zap },
            { name: 'Portfolio showcase (5 items)', included: true, icon: Briefcase },
            { name: 'Standard messaging', included: true },
            { name: 'Basic dashboard', included: true },
            { name: 'Elite search placement', included: false, icon: Star },
            { name: 'Advanced analytics', included: false, icon: BarChart3 },
            { name: 'Market insights', included: false },
          ];
        case SubscriptionPlan.FREELANCER_PRO:
          return [
            { name: '250 application tokens/week', included: true, icon: Zap },
            { name: 'Portfolio showcase (20 items)', included: true, icon: Briefcase },
            { name: 'Pro user badge on your public profile', included: true, icon: Crown },
            { name: 'Priority messaging', included: true },
            { name: 'Advanced dashboard', included: true, icon: BarChart3 },
            { name: 'Priority support', included: true },
            { name: 'Market demand trends', included: false },
          ];
        case SubscriptionPlan.FREELANCER_ELITE:
          return [
            { name: '500 application tokens/week', included: true, icon: Zap },
            { name: 'Unlimited portfolio items', included: true, icon: Briefcase },
            { name: 'Elite user badge on your public profile', included: true, icon: Crown },
            { name: 'Top-tier search placement', included: true, icon: Star },
            { name: 'Advanced analytics + insights', included: true, icon: BarChart3 },
            { name: 'Market demand trends', included: true },
            { name: 'Premium support', included: true },
          ];
      }
    } else {
      switch (planType) {
        case SubscriptionPlan.CLIENT_STARTER:
          return [
            { name: 'Post up to 1 job/month', included: true, icon: Briefcase },
            { name: 'Access to verified freelancers', included: true, icon: Users },
            { name: 'Standard messaging', included: true },
            { name: 'Basic project management', included: false, icon: FileText },
            { name: 'Priority job placement', included: false, icon: Star },
            { name: 'Advanced freelancer search', included: false },
            { name: 'Team collaboration', included: false },
          ];
        case SubscriptionPlan.CLIENT_BUSINESS:
          return [
            { name: 'Unlimited job postings', included: true, icon: Briefcase },
            { name: 'Priority job placement', included: true, icon: Star },
            { name: 'API access (100 req/hr)', included: true, icon: Zap },
            { name: 'Webhook integrations', included: true, icon: Sparkles },
            { name: 'AI freelancer recommendations (top 5)', included: true, icon: TrendingUp },
            { name: 'Team collaboration (up to 2 members)', included: true, icon: Users },
            { name: 'Enhanced analytics dashboard', included: true, icon: BarChart3 },
            { name: 'Project management tools', included: true, icon: FileText },
            { name: 'Priority email support', included: true, icon: Headphones },
            { name: 'Advanced API (1000 req/hr)', included: false, icon: Zap },
          ];
        case SubscriptionPlan.CLIENT_ENTERPRISE:
          return [
            { name: 'Everything in Business', included: true, icon: Crown },
            { name: 'Advanced API (1000 req/hr)', included: true, icon: Zap },
            { name: 'Advanced webhooks with retry logic', included: true, icon: Sparkles },
            { name: 'AI recommendations (top 10 matches)', included: true, icon: TrendingUp },
            { name: 'Unlimited team members', included: true, icon: Users },
            { name: 'Advanced analytics with custom reports', included: true, icon: BarChart3 },
            { name: 'Priority email support', included: true, icon: Headphones },
            { name: 'Audit logs & activity tracking', included: true, icon: Shield },
            { name: 'Early access to new features', included: true, icon: Star },
          ];
      }
    }
    return [];
  };

  interface PlanConfig {
    plan: SubscriptionPlan;
    name: string;
    price: number;
    description: string;
    roles: Array<'CLIENT' | 'FREELANCER'>;
    popular?: boolean;
  }

  const PLAN_CATALOG: PlanConfig[] = [
    {
      plan: SubscriptionPlan.FREELANCER_PRO,
      name: 'Freelancer Pro',
      price: 9.99,
      description: 'Boost your visibility and unlock more opportunities.',
      roles: ['FREELANCER'],
      popular: true,
    },
    {
      plan: SubscriptionPlan.FREELANCER_ELITE,
      name: 'Freelancer Elite',
      price: 12.99,
      description: 'Top-tier placement, analytics, and priority support.',
      roles: ['FREELANCER'],
    },
    {
      plan: SubscriptionPlan.CLIENT_BUSINESS,
      name: 'Client Business',
      price: 14.99,
      description: 'Unlimited posts with advanced search and collaboration tools.',
      roles: ['CLIENT'],
      popular: true,
    },
    {
      plan: SubscriptionPlan.CLIENT_ENTERPRISE,
      name: 'Client Enterprise',
      price: 19.99,
      description: 'Advanced integrations, analytics, and priority support.',
      roles: ['CLIENT'],
    },
  ];

  const planConfigs = PLAN_CATALOG.filter((config) =>
    config.roles.includes(role)
  );

  const defaultPlan: SubscriptionPlan =
    role === 'FREELANCER'
      ? SubscriptionPlan.FREELANCER_PRO
      : SubscriptionPlan.CLIENT_BUSINESS;

  const currentPlanConfig =
    planConfigs.find((plan) => plan.plan === defaultPlan) ?? planConfigs[0];

  const statusMetrics =
    role === 'FREELANCER'
      ? [
          {
            icon: Zap,
            label: 'Application tokens/week',
            value:
              currentPlanConfig.plan === SubscriptionPlan.FREELANCER_ELITE
                ? '500'
                : currentPlanConfig.plan === SubscriptionPlan.FREELANCER_PRO
                ? '250'
                : '150',
          },
          {
            icon: Briefcase,
            label: 'Portfolio items',
            value:
              currentPlanConfig.plan === SubscriptionPlan.FREELANCER_ELITE
                ? 'Unlimited'
                : currentPlanConfig.plan === SubscriptionPlan.FREELANCER_PRO
                ? '20'
                : '5',
          },
        ]
      : [
          {
            icon: Briefcase,
            label: 'Job postings/month',
            value:
              currentPlanConfig.plan === SubscriptionPlan.CLIENT_STARTER
                ? '1'
                : 'Unlimited',
          },
          {
            icon: Users,
            label: 'Team collaboration',
            value:
              currentPlanConfig.plan === SubscriptionPlan.CLIENT_STARTER
                ? 'Not included'
                : 'Included',
          },
        ];

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card className="glass-card bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Crown className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Subscription Status</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your subscription and billing
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="h-4 w-4 text-blue-400" />
                <span className="text-white font-medium">Current Plan</span>
              </div>
              <p className="text-lg font-bold text-blue-300">
                {currentPlanConfig?.name ?? 'Free'}
              </p>
            </div>
            
            {statusMetrics.map((metric) => (
              <div key={metric.label} className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 mb-2">
                  <metric.icon className="h-4 w-4 text-slate-300" />
                  <span className="text-white font-medium">{metric.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{metric.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          Choose Your Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planConfigs.map((plan) => (
            <PlanCard
              key={plan.plan}
              plan={plan.plan}
              name={plan.name}
              price={plan.price}
              description={plan.description}
              features={getPlanFeatures(plan.plan)}
              isCurrentPlan={currentPlanConfig?.plan === plan.plan}
              isPopular={plan.popular}
              onUpgrade={handleUpgrade}
              loading={upgrading === plan.plan}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
