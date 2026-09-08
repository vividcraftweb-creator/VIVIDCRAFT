"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { trpc } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import ClientTypeSelection from './ClientTypeSelection';
import DocumentUploadStep from './DocumentUploadStep';
import ReviewSubmitStep from './ReviewSubmitStep';
import PendingReviewStatus from './PendingReviewStatus';

type VerificationStep = 'client-type' | 'documents' | 'review' | 'pending';

export default function ClientVerificationWizard() {
  const [currentStep, setCurrentStep] = useState<VerificationStep | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const { data: user, isLoading: isLoadingUser } = trpc.user.getCurrentUser.useQuery();
  const { data: documents, isLoading: isLoadingDocs } = trpc.verifications.getUserDocuments.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // 5-second timeout fallback guarantees loading ceases even if queries hang
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          setCurrentStep('client-type');
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Determine the initial step ONLY ONCE on first load
  useEffect(() => {
    if (isLoadingUser || isLoadingDocs) return;
    if (hasInitialized.current) return;

    try {
      hasInitialized.current = true;

      // If user has officially submitted for review, show pending status
      if (user?.verificationSubmittedAt) {
        setCurrentStep('pending');
        return;
      }

      // If client type not selected, start there
      if (!user?.clientType) {
        setCurrentStep('client-type');
        return;
      }

      // Default to documents step
      setCurrentStep('documents');
    } catch (err) {
      console.warn('Client verification wizard init notice:', err);
      setCurrentStep('client-type');
    } finally {
      setIsLoading(false);
    }
  }, [user, documents, isLoadingUser, isLoadingDocs]);

  if ((isLoadingUser || isLoadingDocs || isLoading) && currentStep === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  const clientType = (user?.clientType as 'INDIVIDUAL' | 'BUSINESS' | null) || 'INDIVIDUAL';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Indicator - 3 Steps */}
      <div className="mb-8">
        <div className="flex w-full items-center justify-center">
          {['Account Type', 'Upload Documents', 'Review & Submit'].map((label, index) => {
            const stepIndex = ['client-type', 'documents', 'review', 'pending'].indexOf(currentStep || 'client-type');
            const stepNumber = index + 1;
            const isNotLastStep = index < 2;
            const isActive = stepIndex === index;
            const isComplete = stepIndex > index || currentStep === 'pending';

            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={isActive ? 'active' : isComplete ? 'complete' : 'inactive'}
                    initial={false}
                    className="relative cursor-default outline-none focus:outline-none"
                  >
                    <motion.div
                      variants={{
                        inactive: { scale: 1, backgroundColor: '#1e293b', color: '#64748b' },
                        active: { scale: 1.1, backgroundColor: '#3b82f6', color: '#ffffff' },
                        complete: { scale: 1, backgroundColor: '#10b981', color: '#ffffff' }
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full font-semibold shadow-lg"
                    >
                      {isComplete ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{
                              delay: 0.1,
                              type: 'tween',
                              ease: 'easeOut',
                              duration: 0.3
                            }}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : isActive ? (
                        <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                      ) : (
                        <span className="text-sm font-bold">{stepNumber}</span>
                      )}
                    </motion.div>
                  </motion.div>
                  <span className={`text-xs text-center mt-2 font-medium transition-colors ${
                    isActive ? 'text-blue-400' :
                    isComplete ? 'text-emerald-400' :
                    'text-slate-500'
                  }`}>
                    {label}
                  </span>
                </div>

                {isNotLastStep && (
                  <div className="relative mx-3 h-1 flex-1 overflow-hidden rounded-full bg-slate-700/50 min-w-[40px]">
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                      initial={false}
                      animate={{ width: isComplete ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[600px]">
        {currentStep === 'client-type' && (
          <ClientTypeSelection
            currentType={clientType}
            onComplete={() => setCurrentStep('documents')}
          />
        )}

        {currentStep === 'documents' && clientType && (
          <DocumentUploadStep
            clientType={clientType}
            onComplete={() => setCurrentStep('review')}
            onBack={() => setCurrentStep('client-type')}
          />
        )}

        {currentStep === 'review' && clientType && (
          <ReviewSubmitStep
            clientType={clientType}
            onComplete={() => setCurrentStep('pending')}
            onBack={() => setCurrentStep('documents')}
          />
        )}

        {currentStep === 'pending' && (
          <PendingReviewStatus
            onRetry={() => setCurrentStep('documents')}
          />
        )}
      </div>
    </div>
  );
}
