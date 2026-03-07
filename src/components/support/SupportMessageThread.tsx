'use client';

import { useEffect, useRef } from 'react';
import { formatRelativeTime } from '@/lib/utils/time';
import { Badge } from '@/components/ui/badge';
import { FileText, MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  message: string;
  isStaffResponse: boolean;
  createdAt: string;
  attachmentUrl: string | null;
  sender: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string } | null;
  };
}

interface SupportMessageThreadProps {
  messages: Message[];
  currentUserId: string;
}

export function SupportMessageThread({ messages, currentUserId }: SupportMessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <MessageSquare className="w-12 h-12 text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">No messages yet</h3>
        <p className="text-sm text-gray-500">
          This is the beginning of your support conversation. Add a reply below to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-slate-950/30 rounded-lg border border-white/5">
      {messages.map((msg) => {
        const isCurrentUser = msg.sender.id === currentUserId;
        const senderName = msg.sender.profile
          ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`
          : msg.sender.email;

        return (
          <div
            key={msg.id}
            className={`flex ${msg.isStaffResponse ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] ${
                msg.isStaffResponse
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-blue-500/10 border-blue-500/20'
              } border rounded-lg p-4 space-y-2`}
            >
              {/* Sender info */}
              <div className="flex items-center gap-2">
                {msg.isStaffResponse && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                    Support Team
                  </Badge>
                )}
                <span className="text-xs font-medium text-gray-400">
                  {msg.isStaffResponse ? senderName : isCurrentUser ? 'You' : senderName}
                </span>
                <span className="text-xs text-gray-600">•</span>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(msg.createdAt)}
                </span>
              </div>

              {/* Message content */}
              <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                {msg.message}
              </p>

              {/* Attachment */}
              {msg.attachmentUrl && (
                <a
                  href={msg.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2"
                >
                  <FileText className="w-4 h-4" />
                  View Attachment
                </a>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
