"use client";

import { Clock, CheckCircle, XCircle, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';

interface PendingReviewStatusProps {
  onRetry?: () => void;
}

export default function PendingReviewStatus({ onRetry }: PendingReviewStatusProps) {
  const { data: documents, refetch } = trpc.verifications.getUserDocuments.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Check verification status
  const allApproved = documents?.every(doc => doc.status === 'APPROVED') && documents.length > 0;
  const anyRejected = documents?.some(doc => doc.status === 'REJECTED');
  const allPending = documents?.every(doc => doc.status === 'PENDING') && documents.length > 0;

  const approvedCount = documents?.filter(doc => doc.status === 'APPROVED').length || 0;
  const rejectedCount = documents?.filter(doc => doc.status === 'REJECTED').length || 0;
  const pendingCount = documents?.filter(doc => doc.status === 'PENDING').length || 0;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center mb-8">
        <div className={`inline-flex p-4 rounded-2xl mb-4 ${
          allApproved ? 'bg-green-500/20' :
          anyRejected ? 'bg-red-500/20' :
          'bg-yellow-500/20'
        }`}>
          {allApproved ? (
            <CheckCircle className="h-12 w-12 text-green-400" />
          ) : anyRejected ? (
            <XCircle className="h-12 w-12 text-red-400" />
          ) : (
            <Clock className="h-12 w-12 text-yellow-400" />
          )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">
          {allApproved ? 'Verification Approved!' :
           anyRejected ? 'Action Required' :
           'Verification Under Review'}
        </h2>

        <p className="text-slate-400 max-w-2xl mx-auto">
          {allApproved ?
            'Your verification has been approved! You can now post jobs and access all client features.' :
           anyRejected ?
            'Some of your documents were rejected. Please review the feedback and re-upload the required documents.' :
            'Your documents are being reviewed by our admin. This typically takes 24-48 hours.'}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Approved */}
        <div className="glass-card p-6 rounded-2xl border border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Approved</span>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">{approvedCount}</p>
        </div>

        {/* Pending */}
        <div className="glass-card p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Pending</span>
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
        </div>

        {/* Rejected */}
        <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Rejected</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400">{rejectedCount}</p>
        </div>
      </div>

      {/* Documents List */}
      <div className="glass-card p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Document Status
          </h3>
          <Button
            onClick={() => refetch()}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {documents && documents.length > 0 ? (
            documents
              .filter(doc => doc.verificationType !== null)
              .map((doc) => (
              <div key={doc.id} className={`p-4 rounded-xl border ${
                doc.status === 'APPROVED' ? 'bg-green-500/5 border-green-500/20' :
                doc.status === 'REJECTED' ? 'bg-red-500/5 border-red-500/20' :
                'bg-yellow-500/5 border-yellow-500/20'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {doc.status === 'APPROVED' ? (
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      ) : doc.status === 'REJECTED' ? (
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                      )}
                      <span className="text-white font-medium text-sm">
                        {doc.verificationType?.replace(/_/g, ' ') || 'Document'}
                      </span>
                    </div>

                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                      <div className="mt-2 flex items-start gap-2 p-2 rounded bg-red-500/10">
                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-200 text-xs font-medium">Rejection Reason:</p>
                          <p className="text-red-100/80 text-xs mt-1">{doc.rejectionReason}</p>
                        </div>
                      </div>
                    )}

                    {doc.adminNotes && (
                      <div className="mt-2 flex items-start gap-2 p-2 rounded bg-blue-500/10">
                        <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-blue-200 text-xs font-medium">Admin Notes:</p>
                          <p className="text-blue-100/80 text-xs mt-1">{doc.adminNotes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ml-3 ${
                    doc.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                    doc.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">No documents found</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {anyRejected && onRetry && (
        <div className="flex justify-center">
          <Button
            onClick={onRetry}
            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Re-upload Rejected Documents
          </Button>
        </div>
      )}

      {/* Info Notice */}
      {allPending && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-200 font-semibold text-sm mb-1">Please be patient</p>
              <p className="text-blue-100/80 text-xs">
                Our admin is reviewing your documents. You'll receive an email notification once the review is complete.
                This page will automatically update when there's a status change.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notice */}
      {allApproved && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-200 font-semibold text-sm mb-1">You're all set!</p>
              <p className="text-green-100/80 text-xs">
                Your account is now fully verified. You can start posting jobs and hiring freelancers immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
