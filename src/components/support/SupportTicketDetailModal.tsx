'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SupportMessageThread } from './SupportMessageThread';
import { trpc } from '@/utils/trpc';
import { formatDateTime, formatResponseTime } from '@/lib/utils/time';
import {
  Clock,
  Tag,
  Calendar,
  AlertCircle,
  Send,
  XCircle,
  Loader2,
  Hash,
  MessageSquare,
} from 'lucide-react';

interface SupportTicketDetailModalProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SupportTicketDetailModal({
  ticketId,
  isOpen,
  onClose,
}: SupportTicketDetailModalProps) {
  const [replyMessage, setReplyMessage] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const utils = trpc.useContext();

  const { data: ticket, isLoading } = trpc.supportTickets.getById.useQuery(
    { id: ticketId },
    { enabled: isOpen && !!ticketId }
  );

  const addMessageMutation = trpc.supportTickets.addMessage.useMutation({
    onSuccess: () => {
      setReplyMessage('');
      utils.supportTickets.getById.invalidate({ id: ticketId });
      utils.supportTickets.list.invalidate();
    },
  });

  const closeTicketMutation = trpc.supportTickets.close.useMutation({
    onSuccess: () => {
      utils.supportTickets.getById.invalidate({ id: ticketId });
      utils.supportTickets.list.invalidate();
      setShowCloseConfirm(false);
      onClose();
    },
  });

  const handleSendReply = async () => {
    const trimmedMessage = replyMessage.trim();
    if (trimmedMessage.length < 1 || trimmedMessage.length > 5000) return;

    await addMessageMutation.mutateAsync({
      ticketId,
      message: trimmedMessage,
    });
  };

  const handleCloseTicket = () => {
    closeTicketMutation.mutate({ id: ticketId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'in-progress':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'open':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'closed':
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const isTicketClosed = ticket?.status === 'closed';

  // Check if user needs to wait for admin response
  const lastMessage = ticket?.messages?.[ticket.messages.length - 1];
  const hasMessages = ticket?.messages && ticket.messages.length > 0;

  // FIXED LOGIC:
  // User should wait if:
  // 1. No messages yet (fresh ticket, user already sent initial message in ticket.message)
  // 2. Last message exists AND is NOT from staff (user sent last message)
  const isWaitingForAdminResponse = !hasMessages || (lastMessage && !lastMessage.isStaffResponse);
  const canShowReplyForm = !isTicketClosed && !isWaitingForAdminResponse;

  const canSendReply = canShowReplyForm && replyMessage.trim().length >= 1 && replyMessage.trim().length <= 5000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-2xl font-bold text-gray-100 line-clamp-2" title={ticket?.subject}>
            {isLoading || !ticket ? 'Loading...' : ticket.subject}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Support ticket details and conversation history
          </DialogDescription>
          {!isLoading && ticket && (
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDateTime(ticket.createdAt)}</span>
            </div>
          )}
        </DialogHeader>

        {isLoading || !ticket ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[calc(90vh-5rem)] px-6 pb-6">
            <div className="space-y-6 pb-8">
              {/* Status Badge */}
              <div className="pt-4">
                <Badge className={`${getStatusColor(ticket.status)} border text-xs uppercase`}>
                  {ticket.status}
                </Badge>
              </div>

              {/* Key Metadata Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Ticket Number */}
                  <div className="glass-card p-4 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Hash className="w-3 h-3" />
                      Ticket Number
                    </div>
                    <p className="text-base font-mono font-semibold text-gray-200">
                      {ticket.ticketNumber}
                    </p>
                  </div>

                  {/* Category */}
                  <div className="glass-card p-4 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Tag className="w-3 h-3" />
                      Category
                    </div>
                    <p className="text-base capitalize text-gray-200">{ticket.category}</p>
                  </div>

                  {/* Priority */}
                  <div className="glass-card p-4 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      Priority
                    </div>
                    <Badge variant="outline" className={`${getPriorityColor(ticket.priority)} border text-xs uppercase`}>
                      {ticket.priority} Priority
                    </Badge>
                  </div>
                </div>

                {/* Original Message */}
                <div className="glass-card p-4 rounded-lg border border-white/10">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Original Message</h3>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
                </div>

                {/* Timeline Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Response */}
                  {ticket.firstResponseAt && (
                    <div className="glass-card p-4 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Clock className="w-3 h-3" />
                        First Response
                      </div>
                      <p className="text-sm text-gray-200">{formatDateTime(ticket.firstResponseAt)}</p>
                    </div>
                  )}

                  {/* Resolved */}
                  {ticket.resolvedAt && (
                    <div className="glass-card p-4 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <XCircle className="w-3 h-3" />
                        Resolved
                      </div>
                      <p className="text-sm text-gray-200">{formatDateTime(ticket.resolvedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Conversation History */}
                <div className="glass-card p-6 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Conversation History
                    </h3>
                    {ticket.messages && ticket.messages.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <SupportMessageThread
                    messages={ticket.messages || []}
                    currentUserId={ticket.userId}
                  />
                </div>

                {/* Reply Form - Show only if can reply */}
                {canShowReplyForm && (
                  <div className="glass-card p-4 rounded-lg border border-white/10 space-y-3">
                    <h3 className="text-sm font-medium text-gray-400">Add Reply</h3>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply here..."
                      className="min-h-[120px] resize-none bg-slate-950/50"
                      disabled={addMessageMutation.isPending}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {replyMessage.length}/5000 characters
                      </span>
                      <Button
                        onClick={handleSendReply}
                        disabled={!canSendReply || addMessageMutation.isPending}
                        size="sm"
                      >
                        {addMessageMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Waiting for Admin Response Notice */}
                {isWaitingForAdminResponse && (
                  <div className="glass-card p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-300 mb-1">
                          Awaiting Support Team Response
                        </p>
                        <p className="text-xs text-blue-400/80">
                          Your message has been received. Our support team will respond soon. You'll be able to reply once they've responded.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isTicketClosed ? (
                  <div className="space-y-2">
                    {showCloseConfirm ? (
                      <div className="glass-card p-4 rounded-lg border border-red-500/30 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-300 mb-1">
                              Are you sure you want to mark this support ticket as closed?
                            </p>
                            <p className="text-xs text-gray-500">
                              This will close the support ticket permanently. You can still view the conversation history, but no further replies will be allowed.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleCloseTicket}
                            disabled={closeTicketMutation.isPending}
                          >
                            {closeTicketMutation.isPending ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Closing...
                              </>
                            ) : (
                              'Yes, Close Ticket'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCloseConfirm(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowCloseConfirm(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Mark Ticket as Closed
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-4 rounded-lg border border-gray-500/30 bg-gray-500/10">
                    <div className="flex items-start gap-2 text-gray-400">
                      <XCircle className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">This support ticket has been closed</span>
                        <p className="text-xs text-gray-500 mt-1">
                          No further replies are allowed. If you need additional help, please create a new support ticket.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
