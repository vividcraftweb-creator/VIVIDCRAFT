'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface PaymentProcessingModalProps {
  isOpen: boolean;
}

export function PaymentProcessingModal({ isOpen }: PaymentProcessingModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {}} // Prevent manual closing during payment
    >
      <DialogContent
        showCloseButton={false} // No X button - user can't dismiss
        className="sm:max-w-[400px]"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-white">
            Processing payment
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400 text-sm">
            Please wait while we securely process your subscription. This may take a few moments.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
