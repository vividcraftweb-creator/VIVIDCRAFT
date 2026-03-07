'use client';

import React from 'react';
import { trpc } from '@/utils/trpc';
import { AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SubscriptionStatusBanner() {
  const router = useRouter();
  const { data: subscriptionStatus } = trpc.braintree.getSubscriptionStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  if (!subscriptionStatus?.hasActiveSubscription) {
    return null;
  }

  const { daysUntilExpiry, isExpiringSoon, currentPeriodEnd } = subscriptionStatus;

  if (!isExpiringSoon) {
    return null;
  }

  const getAlertColor = () => {
    if (daysUntilExpiry! <= 1) return 'bg-red-500/10 border-red-500/50 text-red-500';
    if (daysUntilExpiry! <= 3) return 'bg-orange-500/10 border-orange-500/50 text-orange-500';
    return 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500';
  };

  const getIcon = () => {
    if (daysUntilExpiry! <= 1) return <AlertTriangle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getMessage = () => {
    if (daysUntilExpiry! === 0) {
      return 'Your subscription expires today!';
    }
    if (daysUntilExpiry! === 1) {
      return 'Your subscription expires tomorrow!';
    }
    return `Your subscription expires in ${daysUntilExpiry} days`;
  };

  return (
    <div className={`mb-6 p-4 rounded-xl border-2 ${getAlertColor()} flex items-center justify-between gap-4`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div>
          <p className="font-semibold">{getMessage()}</p>
          <p className="text-sm opacity-80 mt-1">
            Expiry date: {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>
      <Button
        onClick={() => router.push('/dashboard?tab=subscription')}
        className="bg-primary hover:scale-105 transition-all"
      >
        Renew Now
      </Button>
    </div>
  );
}
