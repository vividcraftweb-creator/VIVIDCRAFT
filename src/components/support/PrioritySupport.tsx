'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import {
  Headphones,
  Crown,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  Send,
  Zap,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SupportTicketDetailModal } from './SupportTicketDetailModal';

type SupportTab = 'contact' | 'tickets';
type SupportCategory = 'general' | 'technical' | 'billing' | 'feature-request' | 'urgent';
type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';
type SupportStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

interface SupportTicketSummary {
  id: string;
  subject: string;
  message: string;
  category: SupportCategory;
  status: SupportStatus;
  priority: SupportPriority;
  responseTime?: number | null;
  resolvedAt?: string | null;
  firstResponseAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const isSupportTicketSummary = (value: unknown): value is SupportTicketSummary => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.subject === 'string' &&
    typeof record.message === 'string' &&
    typeof record.category === 'string' &&
    typeof record.status === 'string' &&
    typeof record.priority === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string'
  );
};

export default function PrioritySupport() {
  const [activeTab, setActiveTab] = useState<SupportTab>('contact');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>('general');
  const [priority, setPriority] = useState<SupportPriority>('medium');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  const permissions = planSummary?.permissions as any;
  const supportLevel = permissions?.clientSupportLevel || permissions?.supportLevel || 'email';
  const hasPrioritySupport = supportLevel !== 'email';

  // Fetch support tickets
  const { data: supportTickets, isLoading: ticketsLoading } = trpc.supportTickets.list.useQuery(
    { status: 'all', limit: 50 },
    { enabled: hasPrioritySupport }
  );
  const tickets = Array.isArray(supportTickets) ? supportTickets.filter(isSupportTicketSummary) : [];

  const { data: stats } = trpc.supportTickets.getStats.useQuery(
    undefined,
    { enabled: hasPrioritySupport }
  );

  // Create ticket mutation
  const createTicketMutation = trpc.supportTickets.create.useMutation({
    onSuccess: () => {
      toast.success('Support ticket created successfully');
      setNewTicketSubject('');
      setNewTicketMessage('');
      setSelectedCategory('general');
      setPriority('medium');
      setActiveTab('tickets');
      utils.supportTickets.list.invalidate();
      utils.supportTickets.getStats.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to create ticket', {
        description: error.message,
      });
    },
  });

  const getStatusColor = (status: SupportStatus) => {
    switch (status) {
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20';
      case 'open': return 'text-yellow-400 bg-yellow-500/20';
      case 'closed': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority: SupportPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const handleCreateTicket = () => {
    if (!newTicketSubject || !newTicketMessage) {
      toast.error('Please fill in all fields');
      return;
    }

    createTicketMutation.mutate({
      subject: newTicketSubject,
      message: newTicketMessage,
      category: selectedCategory,
      priority: selectedCategory === 'urgent' ? 'urgent' : priority,
    });
  };

  if (!hasPrioritySupport) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Priority Support</h3>
        <p className="text-muted-foreground mb-6">
          Upgrade to Business Plan or higher to get priority email support with faster response times.
        </p>
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Response within 1 hour during business hours</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Direct support from specialists</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            <span>Priority phone support available</span>
          </div>
        </div>
        <Link
          href="/dashboard?tab=subscription"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Business Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl border-2 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Headphones className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Priority Support</h2>
            <div className="px-3 py-1 bg-yellow-500/20 text-yellow-600 text-xs font-medium rounded-full border border-yellow-500/30">
              Premium Access
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Average response time: {'< 60 minutes'}</span>
          </div>
        </div>
      </div>

      {/* Support Benefits */}
      <div className="glass-card p-6 rounded-2xl border-2 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-foreground">Your Priority Benefits</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Fast Response</h4>
              <p className="text-sm text-muted-foreground">{'< 1 hour response time'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Priority Tickets</h4>
              <p className="text-sm text-muted-foreground">Higher priority in queue</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">Support Team</h4>
              <p className="text-sm text-muted-foreground">Specialist support agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-yellow-400">{stats.open}</div>
            <div className="text-sm text-muted-foreground">Open</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
            <div className="text-sm text-muted-foreground">Resolved</div>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <div className="text-2xl font-bold text-red-400">{stats.urgent}</div>
            <div className="text-sm text-muted-foreground">Urgent</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="glass-card p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
        <div className="flex space-x-1">
          {([
            { key: 'contact' as SupportTab, label: 'Create Ticket', icon: Phone },
            { key: 'tickets' as SupportTab, label: 'My Tickets', icon: AlertCircle },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'contact' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create Ticket Form */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-6">Create Support Ticket</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as SupportCategory)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="general" className="bg-white text-gray-900">General Question</option>
                  <option value="technical" className="bg-white text-gray-900">Technical Issue</option>
                  <option value="billing" className="bg-white text-gray-900">Billing Support</option>
                  <option value="feature-request" className="bg-white text-gray-900">Feature Request</option>
                  <option value="urgent" className="bg-white text-gray-900">Urgent Issue</option>
                </select>
              </div>

              {selectedCategory !== 'urgent' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportPriority)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="low" className="bg-white text-gray-900">Low</option>
                    <option value="medium" className="bg-white text-gray-900">Medium</option>
                    <option value="high" className="bg-white text-gray-900">High</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject *</label>
                <input
                  type="text"
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Brief description of your issue (min 5 characters)"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={200}
                  minLength={5}
                />
                <p className="text-xs text-muted-foreground mt-1">{newTicketSubject.length}/200 characters (min 5)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message *</label>
                <textarea
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Please describe your issue in detail (min 10 characters)..."
                  rows={6}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  maxLength={5000}
                  minLength={10}
                />
                <p className="text-xs text-muted-foreground mt-1">{newTicketMessage.length}/5000 characters (min 10)</p>
              </div>

              <button
                onClick={handleCreateTicket}
                disabled={!newTicketSubject || !newTicketMessage || createTicketMutation.isPending}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {createTicketMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create Priority Ticket
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-6">Get Priority Help</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Priority Support Ticket</h4>
                  <p className="text-sm text-muted-foreground">Get help from our support team</p>
                  <p className="text-xs text-muted-foreground mt-1">Response within 1 hour</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Email Support</h4>
                  <p className="text-sm text-muted-foreground">Send us a detailed message</p>
                  <p className="text-xs text-muted-foreground mt-1">support@yourdomain.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Phone className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Need real-time help?</h4>
                  <p className="text-sm text-muted-foreground">Drop us an email and we will respond within one hour.</p>
                  <p className="text-xs text-muted-foreground mt-1">support@yourdomain.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Your Support Tickets</h3>
            <div className="text-sm text-muted-foreground">
              {tickets.length} total tickets
            </div>
          </div>

          {ticketsLoading ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Support Tickets</h3>
              <p className="text-muted-foreground mb-6">
                You haven&apos;t created any support tickets yet
              </p>
              <button
                onClick={() => setActiveTab('contact')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Create Your First Ticket
              </button>
            </div>
          ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="glass-card p-6 rounded-2xl hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-foreground">{ticket.subject}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('-', ' ')}
                      </span>
                      <div className={`flex items-center gap-1 ${getPriorityColor(ticket.priority)}`}>
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs">{ticket.priority}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.message}</p>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>#{ticket.id.slice(0, 8)}</span>
                      <span className="capitalize">{ticket.category.replace('-', ' ')}</span>
                      <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.responseTime && (
                        <div className="flex items-center gap-1 text-green-400">
                          <Zap className="h-3 w-3" />
                          <span>Responded in {Math.floor(ticket.responseTime / 60)} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicketId(ticket.id);
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm text-white"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Support Ticket Detail Modal */}
      {selectedTicketId && (
        <SupportTicketDetailModal
          ticketId={selectedTicketId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTicketId(null);
          }}
        />
      )}
    </div>
  );
}
