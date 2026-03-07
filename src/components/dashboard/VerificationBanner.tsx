'use client';

import { trpc } from '@/utils/trpc';
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VerificationBanner() {
  const { data: verificationStatus, isLoading } = trpc.verifications.checkVerificationStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  if (isLoading || !verificationStatus) {
    return null;
  }

  // Don't show banner if user is verified
  if (verificationStatus.isVerified) {
    return null;
  }

  const getBannerConfig = () => {
    switch (verificationStatus.status) {
      case 'not_started':
        return {
          icon: Shield,
          iconColor: 'text-blue-400',
          bgColor: 'blue-500/10',
          borderColor: 'border-blue-500/30',
          title: 'Complete Your Verification',
          description: 'Verify your identity to start posting jobs and accessing all platform features.',
          actionText: 'Start Verification',
          actionHref: '/dashboard?tab=verification',
          variant: 'default' as const,
        };

      case 'incomplete':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          bgColor: 'amber-500/10',
          borderColor: 'border-amber-500/30',
          title: 'Complete Your Verification Documents',
          description: verificationStatus.message,
          actionText: 'Upload Documents',
          actionHref: '/dashboard?tab=verification',
          variant: 'default' as const,
        };

      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-purple-400',
          bgColor: 'purple-500/10',
          borderColor: 'border-purple-500/30',
          title: 'Verification Under Review',
          description: 'Your documents are being reviewed. We\'ll notify you within 24-48 hours.',
          actionText: 'View Status',
          actionHref: '/dashboard?tab=verification',
          variant: 'outline' as const,
        };

      case 'rejected':
        return {
          icon: XCircle,
          iconColor: 'text-red-400',
          bgColor: 'red-500/10',
          borderColor: 'border-red-500/30',
          title: 'Verification Documents Rejected',
          description: 'Some documents were rejected. Please review the feedback and re-upload.',
          actionText: 'Fix Issues',
          actionHref: '/dashboard?tab=verification',
          variant: 'destructive' as const,
        };

      default:
        return null;
    }
  };

  const config = getBannerConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`glass-card p-6 rounded-2xl bg-${config.bgColor} border ${config.borderColor} mb-6`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 bg-white/10 rounded-xl ${config.iconColor}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{config.title}</h3>
          <p className="text-gray-300 text-sm mb-3">{config.description}</p>

          {verificationStatus.status === 'incomplete' && verificationStatus.missingDocs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Missing documents:</p>
              <div className="flex flex-wrap gap-2">
                {verificationStatus.missingDocs.map((doc) => (
                  <span
                    key={doc}
                    className="inline-flex items-center px-2 py-1 rounded-md bg-white/10 text-xs text-gray-300"
                  >
                    {doc.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {verificationStatus.status === 'rejected' && verificationStatus.rejectedDocs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Rejected documents:</p>
              <div className="space-y-1">
                {verificationStatus.rejectedDocs.map((doc, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-red-300 font-medium">{doc.type.replace('_', ' ')}</span>
                    <span className="text-gray-400"> - {doc.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link href={config.actionHref}>
            <Button
              variant={config.variant}
              size="sm"
              className="mt-2"
            >
              {config.actionText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
