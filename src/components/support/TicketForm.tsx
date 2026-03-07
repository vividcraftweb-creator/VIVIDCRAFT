'use client';
import React, { useState } from 'react';
import { useAuth as useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TicketForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (status === 'unauthenticated') {
        router.push('/auth/signin?callbackUrl=/support');
        return;
      }

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      setTicketNumber(data.ticket.ticketNumber);
      setSubmitted(true);
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium',
      });
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-4">Ticket Submitted!</h3>
        <p className="text-muted-foreground mb-6">
          Your support ticket <span className="font-semibold text-primary">{ticketNumber}</span> has
          been created. Our team will review it and get back to you via email within 24-48 hours.
        </p>
        <Button onClick={() => setSubmitted(false)} variant="outline">
          Submit Another Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 rounded-2xl">
      <h3 className="text-2xl font-semibold mb-6">Submit a Support Ticket</h3>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-destructive mb-1">Error</h4>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {session.session?.user && (
          <div className="p-4 bg-muted/30 rounded-xl border border-glass-border">
            <div className="text-sm text-muted-foreground mb-1">Submitting as:</div>
            <div className="font-medium">{session.session.user.email}</div>
            <div className="text-sm text-muted-foreground capitalize">
              Role: {session.session.user.role?.toLowerCase()}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-3 bg-transparent border border-glass-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          >
            <option value="general">General Inquiry</option>
            <option value="billing">Billing & Payment</option>
            <option value="technical">Technical Problem</option>
            <option value="feature-request">Feature Request</option>
            <option value="urgent">Urgent Issue</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-4 py-3 bg-transparent border border-glass-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          >
            <option value="low">Low - General question</option>
            <option value="medium">Medium - Need assistance</option>
            <option value="high">High - Urgent issue</option>
            <option value="urgent">Urgent - Critical problem</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief description of your issue"
            className="w-full px-4 py-3 bg-transparent border border-glass-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            maxLength={200}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {formData.subject.length}/200 characters
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Message *</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Please provide detailed information about your issue..."
            className="w-full px-4 py-3 bg-transparent border border-glass-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[200px] resize-y"
            required
            maxLength={2000}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {formData.message.length}/2000 characters
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !formData.subject || !formData.message}
          className="w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Ticket
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
