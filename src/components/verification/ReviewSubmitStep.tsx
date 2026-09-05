"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Building2, User, FileText, Send, AlertCircle } from 'lucide-react';

interface ReviewSubmitStepProps {
  clientType: 'INDIVIDUAL' | 'BUSINESS';
  onComplete: () => void;
  onBack?: () => void;
}

export default function ReviewSubmitStep({ clientType, onComplete, onBack }: ReviewSubmitStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: user } = trpc.user.getCurrentUser.useQuery(undefined, { retry: false });
  const { data: profile } = trpc.profiles.getMyProfile.useQuery({}, { retry: false });
  const { data: documents } = trpc.verifications.getUserDocuments.useQuery(undefined, { retry: false });

  // Determine if user is freelancer or client for proper labeling
  const userRole = user?.role || 'CLIENT';
  const isFreelancer = userRole === 'FREELANCER';

  const utils = trpc.useUtils();

  const submitForReview = trpc.verifications.submitForReview.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.user.getCurrentUser.invalidate();
      utils.verifications.getUserDocuments.invalidate();
      onComplete();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit for review');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitForReview.mutateAsync();
  };

  const documentsUploaded = documents?.length || 0;
  // Updated requirements: ID_FRONT + ID_BACK + SELFIE for individuals, + BUSINESS_REGISTRATION + PROOF_OF_ADDRESS for business
  const requiredDocsCount = clientType === 'INDIVIDUAL' ? 3 : 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-green-500/20 rounded-2xl mb-4">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">
          Review & Submit
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Please review your information before submitting for verification
        </p>
      </div>

      {/* Account Type */}
      <div className="glass-card p-6 rounded-2xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {clientType === 'INDIVIDUAL' ? (
            <>
              <User className="h-5 w-5 text-blue-400" />
              Individual {isFreelancer ? 'Freelancer' : 'Client'}
            </>
          ) : (
            <>
              <Building2 className="h-5 w-5 text-purple-400" />
              Business {isFreelancer ? 'Freelancer' : 'Client'}
            </>
          )}
        </h3>
        <p className="text-sm text-slate-400">
          {clientType === 'INDIVIDUAL'
            ? `You are verifying as an individual ${isFreelancer ? 'freelancer' : 'client'}`
            : `You are verifying as a business ${isFreelancer ? 'freelancer' : 'client'}`}
        </p>
      </div>

      {/* Profile Information */}
      {clientType === 'INDIVIDUAL' ? (
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Full Name:</span>
              <span className="text-white font-medium">{profile?.firstName && profile?.lastName ? `${profile.firstName} ${profile.lastName}` : profile?.firstName || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Email:</span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Phone:</span>
              <span className="text-white font-medium">{profile?.phone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Location:</span>
              <span className="text-white font-medium">{profile?.location || profile?.country || 'Not provided'}</span>
            </div>
            {profile?.city && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">City:</span>
                <span className="text-white font-medium">{profile.city}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Business Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Business Name:</span>
              <span className="text-white font-medium">{profile?.companyName || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Registration Number:</span>
              <span className="text-white font-medium">{profile?.businessRegistrationNumber || 'Not provided'}</span>
            </div>
            {profile?.taxId && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tax ID:</span>
                <span className="text-white font-medium">{profile.taxId}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Business Email:</span>
              <span className="text-white font-medium">{profile?.businessEmail || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Business Phone:</span>
              <span className="text-white font-medium">{profile?.businessPhone || 'Not provided'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-400">Business Address:</span>
              <span className="text-white font-medium text-right">
                {profile?.businessAddressLine1 && profile?.businessCity && profile?.businessCountry ? (
                  <>
                    {profile.businessAddressLine1}<br />
                    {profile.businessAddressLine2 && <>{profile.businessAddressLine2}<br /></>}
                    {profile.businessCity}
                    {profile.businessState && `, ${profile.businessState}`}
                    {profile.businessPostalCode && ` ${profile.businessPostalCode}`}<br />
                    {profile.businessCountry}
                  </>
                ) : (
                  'Not provided'
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Documents Summary */}
      <div className="glass-card p-6 rounded-2xl border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          Uploaded Documents
        </h3>
        <div className="space-y-2">
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-white text-sm">
                    {doc.verificationType.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  doc.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                  doc.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm">No documents uploaded</p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-slate-400">
            Total documents: <span className="text-white font-medium">{documentsUploaded}</span> uploaded
            {documentsUploaded < requiredDocsCount && (
              <span className="text-red-400 ml-2">
                ({requiredDocsCount - documentsUploaded} required document{requiredDocsCount - documentsUploaded > 1 ? 's' : ''} missing)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Warning if missing documents */}
      {documentsUploaded < requiredDocsCount && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-200 font-semibold text-sm mb-1">Missing Required Documents</p>
              <p className="text-red-100/80 text-xs">
                Please go back and upload all required documents before submitting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What Happens Next */}
      <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <h4 className="text-white font-semibold mb-3">What happens next?</h4>
        <ul className="space-y-2 text-sm text-blue-100/80">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span>Your documents will be reviewed by admin</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span>Review typically takes 24-48 hours</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span>You'll receive an email notification once verification is complete</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <span>Once verified, you can start posting jobs immediately</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            disabled={isSubmitting}
            className="h-12 px-6 border-white/20 text-slate-300 hover:bg-white/5"
          >
            Back
          </Button>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || documentsUploaded < requiredDocsCount}
          className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-semibold text-base ml-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
