"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, FileText, Image as ImageIcon, Building2, MapPin, FileCheck, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import DocumentUploadCard from './DocumentUploadCard';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

interface DocumentUploadStepProps {
  clientType: 'INDIVIDUAL' | 'BUSINESS';
  onComplete: () => void;
  onBack?: () => void;
}

// Centralized document requirements
const DOCUMENT_REQUIREMENTS = {
  INDIVIDUAL: {
    required: ['ID_FRONT', 'ID_BACK', 'SELFIE'],
    optional: []
  },
  BUSINESS: {
    required: ['ID_FRONT', 'ID_BACK', 'SELFIE', 'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS'],
    optional: ['TAX_DOCUMENT', 'BUSINESS_LICENSE']
  }
};

export default function DocumentUploadStep({ clientType, onComplete, onBack }: DocumentUploadStepProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: documents, isLoading } = trpc.verifications.getUserDocuments.useQuery();

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getDocumentByType = (type: string) => {
    return documents?.find(doc => doc.verificationType === type);
  };

  // Calculate progress
  const progress = useMemo(() => {
    if (!documents) return { uploaded: 0, required: 0, optional: 0, isComplete: false };

    const requirements = DOCUMENT_REQUIREMENTS[clientType];
    const uploadedTypes = new Set(documents.map(doc => doc.verificationType));

    const requiredUploaded = requirements.required.filter(type => uploadedTypes.has(type)).length;
    const optionalUploaded = requirements.optional.filter(type => uploadedTypes.has(type)).length;
    const isComplete = requiredUploaded === requirements.required.length;

    return {
      uploaded: requiredUploaded,
      required: requirements.required.length,
      optional: optionalUploaded,
      isComplete
    };
  }, [documents, clientType]);

  const handleContinue = () => {
    const requirements = DOCUMENT_REQUIREMENTS[clientType];
    const uploadedTypes = new Set(documents?.map(doc => doc.verificationType) || []);
    const missingDocs = requirements.required.filter(type => !uploadedTypes.has(type));

    if (missingDocs.length > 0) {
      const missingLabels = missingDocs.map(type => {
        if (type === 'ID_FRONT') return 'Government ID (Front)';
        if (type === 'ID_BACK') return 'Government ID (Back)';
        if (type === 'SELFIE') return 'Selfie with ID';
        if (type === 'BUSINESS_REGISTRATION') return 'Business Registration';
        if (type === 'PROOF_OF_ADDRESS') return 'Proof of Address';
        return type;
      });
      toast.error(`Please upload all required documents: ${missingLabels.join(', ')}`);
      return;
    }

    onComplete();
  };

  const individualDocuments = [
    {
      type: 'ID_FRONT' as const,
      title: 'Government ID (Front)',
      description: 'Upload the front/ID page of your government-issued ID',
      icon: <FileText className="h-5 w-5 text-blue-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'ID_BACK' as const,
      title: 'Government ID (Back)',
      description: 'Upload the back/barcode page of your ID',
      icon: <FileText className="h-5 w-5 text-blue-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'SELFIE' as const,
      title: 'Selfie with ID',
      description: 'Take a selfie while holding your ID next to your face - ensures you own the ID',
      icon: <ImageIcon className="h-5 w-5 text-purple-400" />,
      required: true,
      acceptedTypes: 'image/*',
    },
  ];

  const businessDocuments = [
    {
      type: 'ID_FRONT' as const,
      title: 'Government ID (Front)',
      description: 'Upload the front of the business owner\'s government-issued ID',
      icon: <FileText className="h-5 w-5 text-blue-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'ID_BACK' as const,
      title: 'Government ID (Back)',
      description: 'Upload the back of the business owner\'s ID',
      icon: <FileText className="h-5 w-5 text-blue-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'SELFIE' as const,
      title: 'Selfie with ID',
      description: 'Business owner holds their ID next to their face - prevents fraud',
      icon: <ImageIcon className="h-5 w-5 text-purple-400" />,
      required: true,
      acceptedTypes: 'image/*',
    },
    {
      type: 'BUSINESS_REGISTRATION' as const,
      title: 'Business Registration Certificate',
      description: 'Official business registration or incorporation certificate',
      icon: <Building2 className="h-5 w-5 text-purple-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'PROOF_OF_ADDRESS' as const,
      title: 'Proof of Business Address',
      description: 'Utility bill or bank statement with your business address',
      icon: <MapPin className="h-5 w-5 text-green-400" />,
      required: true,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'TAX_DOCUMENT' as const,
      title: 'Tax ID / EIN Certificate (Optional)',
      description: 'Your Tax ID or EIN certificate - recommended',
      icon: <Receipt className="h-5 w-5 text-orange-400" />,
      required: false,
      acceptedTypes: 'image/*,.pdf',
    },
    {
      type: 'BUSINESS_LICENSE' as const,
      title: 'Business License (Optional)',
      description: 'Your business license if applicable',
      icon: <FileCheck className="h-5 w-5 text-cyan-400" />,
      required: false,
      acceptedTypes: 'image/*,.pdf',
    },
  ];

  const documentsToShow = clientType === 'INDIVIDUAL' ? individualDocuments : businessDocuments;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Upload Your Documents
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          {clientType === 'INDIVIDUAL'
            ? 'Upload both sides of your government ID to verify your identity'
            : 'Upload your business documents and owner identification for verification'}
        </p>

        {/* Progress Bar */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              {progress.uploaded} of {progress.required} required documents
            </span>
            {progress.isComplete ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Complete</span>
              </div>
            ) : (
              <span className="text-sm text-slate-500">
                {progress.required - progress.uploaded} remaining
              </span>
            )}
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isComplete ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(progress.uploaded / progress.required) * 100}%` }}
            />
          </div>
          {progress.optional > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              + {progress.optional} optional document{progress.optional !== 1 ? 's' : ''} uploaded
            </p>
          )}
        </div>
      </div>

      {/* Missing Documents Warning */}
      {!progress.isComplete && documents && documents.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-300 mb-1">
                Required Documents Missing
              </h4>
              <p className="text-xs text-amber-200/80">
                Please upload all required documents to continue to the next step
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Cards */}
      <div className="space-y-4" key={refreshKey}>
        {documentsToShow.map((doc) => (
          <DocumentUploadCard
            key={doc.type}
            verificationType={doc.type}
            title={doc.title}
            description={doc.description}
            icon={doc.icon}
            required={doc.required}
            acceptedTypes={doc.acceptedTypes}
            onUploadSuccess={handleUploadSuccess}
            existingDocument={getDocumentByType(doc.type)}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-6">
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="h-12 px-6 border-white/20 text-slate-300 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Button
          onClick={handleContinue}
          disabled={isLoading || !progress.isComplete}
          className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {progress.isComplete ? 'Continue to Review' : `Upload ${progress.required - progress.uploaded} More`}
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-300 mb-1">
              Your Documents Are Secure
            </h4>
            <p className="text-xs text-blue-200/80">
              All documents are encrypted and stored securely. Only authorized verification staff can access them for review purposes. We typically review submissions within 24-48 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
