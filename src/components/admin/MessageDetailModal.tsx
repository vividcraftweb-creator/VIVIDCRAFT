'use client';

import { trpc } from '@/utils/trpc';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  AlertTriangle,
  Trash2,
  Loader2,
  ArrowRight,
  Flag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface MessageDetailModalProps {
  messageId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function MessageDetailModal({
  messageId,
  onClose,
  onUpdate,
}: MessageDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: message, isLoading } = trpc.admin.messages.getMessageById.useQuery({
    id: messageId,
  });

  const deleteMutation = trpc.admin.messages.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success('Message deleted successfully');
      onUpdate();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete message');
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      setIsDeleting(true);
      deleteMutation.mutate({
        id: messageId,
        reason: message?.flagged ? 'Flagged content violation' : 'Admin moderation',
      });
    }
  };

  if (isLoading || !message) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Loading Message...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const senderProfile = Array.isArray(message.sender?.Profile)
    ? message.sender.Profile[0]
    : message.sender?.Profile;
  const receiverProfile = Array.isArray(message.receiver?.Profile)
    ? message.receiver.Profile[0]
    : message.receiver?.Profile;

  const senderName = senderProfile
    ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || 'Unknown User'
    : message.sender?.email || 'Unknown User';

  const receiverName = receiverProfile
    ? `${receiverProfile.firstName || ''} ${receiverProfile.lastName || ''}`.trim() || 'Unknown User'
    : message.receiver?.email || 'Unknown User';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-slate-900 border-white/10 text-white p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-white/10 px-6 py-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              View and manage message details, including sender, receiver, content, and moderation actions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white">Message Details</h2>
                <div className="text-xs text-slate-400 mt-0.5 font-mono truncate">
                  ID: {message.id}
                </div>
              </div>
              {message.flagged && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 flex-shrink-0">
                  <Flag className="h-3 w-3 mr-1" />
                  Flagged
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Flagged Warning */}
          {message.flagged && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Potentially Problematic Content</p>
                  <p className="text-xs text-red-400/80 mt-1">
                    This message has been automatically flagged for potential policy violations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message Flow - Horizontal Layout */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Sender */}
              <div className="min-w-0">
                <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"></span>
                  From
                </div>
                <div className="text-sm font-semibold text-white mb-1">{senderName}</div>
                <div className="text-xs text-slate-400 break-all">
                  {message.sender?.email || 'N/A'}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-5 w-5 text-slate-600 flex-shrink-0" />

              {/* Receiver */}
              <div className="min-w-0">
                <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
                  To
                </div>
                <div className="text-sm font-semibold text-white mb-1">{receiverName}</div>
                <div className="text-xs text-slate-400 break-all">
                  {message.receiver?.email || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Message Metadata - Horizontal */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-slate-400 mb-1">Sent Date</div>
                <div className="text-sm text-white font-medium">
                  {new Date(message.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">Time</div>
                <div className="text-sm text-white font-medium">
                  {new Date(message.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">Message Content</div>
            <div className="text-sm text-white whitespace-pre-wrap leading-relaxed bg-slate-950/50 rounded-lg p-4 border border-white/5 max-h-96 overflow-y-auto">
              {message.content || 'No content available'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-white/10 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Close
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Message
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
