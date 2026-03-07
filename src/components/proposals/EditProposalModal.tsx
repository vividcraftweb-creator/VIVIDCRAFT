'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { type Proposal } from '@/types/database.types';

interface EditProposalModalProps {
  proposal: Proposal;
  isOpen: boolean;
  onClose: () => void;
}

export function EditProposalModal({
  proposal,
  isOpen,
  onClose,
}: EditProposalModalProps) {
  const [coverLetter, setCoverLetter] = useState(proposal.coverLetter);
  const [proposedRate, setProposedRate] = useState(proposal.proposedRate);

  const utils = trpc.useUtils();
  const editMutation = trpc.proposals.editProposal.useMutation({
    onSuccess: () => {
      toast.success('Proposal updated successfully.');
      utils.proposals.getProposalsForFreelancer.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update proposal:', {
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    editMutation.mutate({
      proposalId: proposal.id,
      coverLetter,
      proposedRate,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Your Proposal</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-slate-600">
            <span className="font-semibold text-primary">Token bid</span>
            <span>{proposal.tokenBid} token{proposal.tokenBid === 1 ? '' : 's'} were used to boost this proposal.</span>
            <span className="text-xs text-slate-500">Token bids are locked after submission to keep the review order consistent.</span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rate">Your Rate ($/hr)</Label>
            <Input
              id="rate"
              type="number"
              value={proposedRate}
              onChange={(e) => setProposedRate(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coverLetter">Cover Letter</Label>
            <Textarea
              id="coverLetter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={editMutation.isPending}>
            {editMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
