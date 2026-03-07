"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
} from 'lucide-react';

interface VerificationCardProps {
  user?: {
    isVerified?: boolean;
    role?: string;
  };
  verificationStatus?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    submittedAt?: Date | string | null;
  };
}

export default function VerificationCard({ user, verificationStatus }: VerificationCardProps) {
  const isFreeVerificationEnabled = process.env.NEXT_PUBLIC_FREE_CLIENT_VERIFICATION === 'true';

  // Account is verified
  if (user?.isVerified) {
    return (
      <div className="glass-card p-6 rounded-3xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Account Verified</h3>
              <p className="text-green-300 text-sm">
                Your identity has been verified
              </p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        </div>
        <p className="text-slate-300 text-sm mt-3">
          You can now post jobs and hire freelancers on the platform.
        </p>
      </div>
    );
  }

  // Verification submitted and pending review
  if (verificationStatus?.status === 'PENDING') {
    return (
      <div className="glass-card p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verification Pending</h3>
              <p className="text-yellow-300 text-sm">
                Your documents are under review
              </p>
            </div>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>
        <p className="text-slate-300 text-sm mt-3">
          Our admin is reviewing your verification documents. This typically takes 24-48 hours.
        </p>
      </div>
    );
  }

  // Verification rejected
  if (verificationStatus?.status === 'REJECTED') {
    return (
      <div className="glass-card p-6 rounded-3xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verification Rejected</h3>
              <p className="text-red-300 text-sm">
                Please resubmit with correct documents
              </p>
            </div>
          </div>
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        </div>
        <div className="mt-4">
          <Button asChild className="w-full bg-red-500/20 hover:bg-red-500/30 border-red-500/30">
            <Link href="/dashboard?tab=verification">
              <Upload className="h-4 w-4 mr-2" />
              Resubmit Documents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Not verified - show free verification prompt
  return (
    <div className="glass-card p-8 rounded-3xl bg-blue-500/10 border border-blue-500/20">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-2xl">
            <ShieldAlert className="h-7 w-7 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">
              {user?.role === 'CLIENT' ? 'Client Verification Required' : 'Verification Required'}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {user?.role === 'CLIENT'
                ? 'Verify your identity to post jobs and hire freelancers. Quick and completely free!'
                : 'Complete identity verification to access all platform features.'}
            </p>
          </div>
        </div>
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1">
          <AlertCircle className="h-3 w-3 mr-1" />
          Unverified
        </Badge>
      </div>

      {/* Free Verification Notice */}
      {isFreeVerificationEnabled && user?.role === 'CLIENT' && (
        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-green-500/20 rounded-lg mt-0.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-green-200 font-semibold text-sm mb-1">Free Identity Verification</p>
              <p className="text-green-100/80 text-xs leading-relaxed">
                No fees required! Simply upload your ID to verify your account. This helps us maintain a trustworthy marketplace and ensures all clients are genuine.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <CheckCircle className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-white font-medium text-sm">Fast Approval</p>
          <p className="text-slate-400 text-xs mt-1">Usually within 24-48 hours</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <CheckCircle className="h-5 w-5 text-blue-400 mb-2" />
          <p className="text-white font-medium text-sm">Secure Process</p>
          <p className="text-slate-400 text-xs mt-1">Bank-level encryption</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <CheckCircle className="h-5 w-5 text-purple-400 mb-2" />
          <p className="text-white font-medium text-sm">Full Access</p>
          <p className="text-slate-400 text-xs mt-1">All platform features</p>
        </div>
      </div>

      {/* Verification Action */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <div className="text-center mb-4">
          <p className="text-white font-semibold text-lg mb-1">Submit Your ID</p>
          <p className="text-slate-400 text-sm">Upload a government-issued ID for verification</p>
        </div>

        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
          <Link href="/dashboard?tab=verification">
            <Upload className="h-4 w-4 mr-2" />
            Start Verification (Free)
          </Link>
        </Button>
      </div>

      {/* Support Link */}
      <div className="mt-6 text-center">
        <Button
          asChild
          variant="ghost"
          className="text-slate-400 hover:text-white hover:bg-white/5"
        >
          <a href="/support">Need help? Contact our support team</a>
        </Button>
      </div>
    </div>
  );
}
