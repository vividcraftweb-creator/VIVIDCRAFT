"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2, User, CheckCircle, ArrowRight } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';

interface ClientTypeSelectionProps {
  currentType?: 'INDIVIDUAL' | 'BUSINESS' | null;
  onComplete: (clientType: 'INDIVIDUAL' | 'BUSINESS') => void;
}

export default function ClientTypeSelection({ currentType, onComplete }: ClientTypeSelectionProps) {
  const [selectedType, setSelectedType] = useState<'INDIVIDUAL' | 'BUSINESS' | null>(currentType || null);

  const utils = trpc.useUtils();

  const updateClientType = trpc.user.updateClientType.useMutation({
    onSuccess: () => {
      toast.success('Client type saved successfully');
      utils.user.getCurrentUser.invalidate();
      if (selectedType) {
        onComplete(selectedType);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save client type');
    },
  });

  const handleContinue = () => {
    if (!selectedType) {
      toast.error('Please select a client type');
      return;
    }

    updateClientType.mutate({ clientType: selectedType });
  };

  const clientTypes = [
    {
      type: 'INDIVIDUAL' as const,
      icon: User,
      title: 'Individual Client',
      description: 'I am hiring as an individual or sole proprietor',
      features: [
        'Personal identity verification',
        'Government-issued ID required',
        'Faster verification process',
        'Suitable for personal projects',
      ],
    },
    {
      type: 'BUSINESS' as const,
      icon: Building2,
      title: 'Business Client',
      description: 'I am hiring on behalf of a registered business',
      features: [
        'Business identity verification',
        'Business registration documents required',
        'Proof of address required',
        'Tax ID/EIN verification',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Select Your Client Type
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Choose the type that best describes you. This determines the verification requirements.
        </p>
      </div>

      {/* Client Type Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {clientTypes.map((clientType) => {
          const Icon = clientType.icon;
          const isSelected = selectedType === clientType.type;

          return (
            <button
              key={clientType.type}
              onClick={() => setSelectedType(clientType.type)}
              className={`glass-card p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
              }`}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="bg-blue-500 rounded-full p-1">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl mb-4 ${
                isSelected ? 'bg-blue-500/30' : 'bg-white/10'
              }`}>
                <Icon className={`h-8 w-8 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white mb-2">
                {clientType.title}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                {clientType.description}
              </p>

              {/* Features */}
              <ul className="space-y-2">
                {clientType.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      isSelected ? 'text-blue-400' : 'text-slate-500'
                    }`} />
                    <span className={isSelected ? 'text-slate-200' : 'text-slate-400'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedType || updateClientType.isPending}
          className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
        >
          {updateClientType.isPending ? (
            'Saving...'
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
