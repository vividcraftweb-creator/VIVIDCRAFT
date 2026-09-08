'use client';

import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SubscriptionPlan } from '@/types/database.types';

interface FeaturedBadgeProps {
  plan: SubscriptionPlan;
  variant?: 'default' | 'compact';
  className?: string;
}

export function FeaturedBadge({ plan, variant = 'default', className = '' }: FeaturedBadgeProps) {
  // Only show for ELITE users
  if (plan !== 'FREELANCER_ELITE') {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Crown className={`h-5 w-5 text-yellow-400 fill-yellow-400 ${className}`} aria-label="Elite Artist" />
    );
  }

  return (
    <Badge className={`bg-yellow-500 text-white border-yellow-600 ${className}`}>
      <Crown className="h-3 w-3 mr-1" />
      Elite
    </Badge>
  );
}

interface PlanBadgeProps {
  plan: SubscriptionPlan;
  variant?: 'default' | 'minimal';
  className?: string;
}

export function PlanBadge({ plan, variant = 'default', className = '' }: PlanBadgeProps) {
  const getPlanDisplay = () => {
    switch (plan) {
      case 'FREELANCER_ELITE':
        return {
          label: 'Elite',
          className: 'bg-yellow-500 text-white border-yellow-600',
          icon: <Crown className="h-3 w-3 mr-1" />,
        };
      case 'FREELANCER_PRO':
        return {
          label: 'Pro',
          className: 'bg-blue-500 text-white border-blue-600',
          icon: null,
        };
      case 'FREELANCER_FREE':
        return null; // Don't show badge for free plan
      default:
        return null;
    }
  };

  const planDisplay = getPlanDisplay();

  if (!planDisplay) {
    return null;
  }

  if (variant === 'minimal') {
    return (
      <span className={`text-xs font-semibold ${className}`}>
        {planDisplay.label}
      </span>
    );
  }

  return (
    <Badge className={`${planDisplay.className} ${className}`}>
      {planDisplay.icon}
      {planDisplay.label}
    </Badge>
  );
}
