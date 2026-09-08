'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, TestTube, Clock, CheckCircle, XCircle, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

const WEBHOOK_EVENTS = [
  { value: 'proposal.submitted', label: 'Proposal Submitted', description: 'When a freelancer submits a proposal' },
  { value: 'proposal.accepted', label: 'Proposal Accepted', description: 'When you accept a proposal' },
  { value: 'proposal.rejected', label: 'Proposal Rejected', description: 'When you reject a proposal' },
  { value: 'contract.signed', label: 'Contract Signed', description: 'When both parties sign a contract' },
  { value: 'contract.completed', label: 'Contract Completed', description: 'When a contract is marked complete' },
  { value: 'contract.terminated', label: 'Contract Terminated', description: 'When a contract is terminated' },
  { value: 'milestone.completed', label: 'Milestone Completed', description: 'When a milestone is completed' },
  { value: 'payment.released', label: 'Payment Released', description: 'When payment is released to freelancer' },
  { value: 'job.created', label: 'Job Created', description: 'When you post a new job' },
  { value: 'job.closed', label: 'Job Closed', description: 'When a job is closed' },
];

interface WebhookEndpointRecord {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  description?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  lastUsedAt?: string | Date | null;
}

interface WebhookDeliveryLog {
  id: string;
  event: string;
  httpStatus?: number | null;
  responseBody?: string | null;
  attemptCount: number;
  nextRetryAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  createdAt: string | Date;
}

const isWebhookEndpointRecord = (value: unknown): value is WebhookEndpointRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.url === 'string' &&
    Array.isArray(record.events) &&
    record.events.every((event) => typeof event === 'string') &&
    typeof record.isActive === 'boolean' &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
  );
};

const isWebhookDeliveryLog = (value: unknown): value is WebhookDeliveryLog => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.event === 'string' &&
    typeof record.attemptCount === 'number' &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
  );
};

export default function WebhooksView() {
  const [isCreating, setIsCreating] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: webhooks, isLoading } = trpc.webhooks.list.useQuery();
  const { data: logs } = trpc.webhooks.getLogs.useQuery(
    { webhookId: viewingLogs!, limit: 50 },
    { enabled: !!viewingLogs }
  );
  const webhookList = Array.isArray(webhooks) ? webhooks.filter(isWebhookEndpointRecord) : [];
  const deliveryLogs = Array.isArray(logs) ? logs.filter(isWebhookDeliveryLog) : [];

  // Mutations
  const createMutation = trpc.webhooks.create.useMutation({
    onSuccess: (data) => {
      toast.success('Webhook created successfully!', {
        description: `Secret: ${data.secret} (save this, it won't be shown again)`,
        duration: 10000,
      });
      setIsCreating(false);
      setNewWebhookUrl('');
      setNewWebhookDescription('');
      setSelectedEvents([]);
      utils.webhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to create webhook', {
        description: error.message,
      });
    },
  });

  const deleteMutation = trpc.webhooks.delete.useMutation({
    onSuccess: () => {
      toast.success('Webhook deleted');
      utils.webhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to delete webhook', {
        description: error.message,
      });
    },
  });

  const testMutation = trpc.webhooks.test.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test webhook sent successfully!', {
          description: `Status: ${data.status}`,
        });
      } else {
        toast.error('Test webhook failed', {
          description: data.response || `Status: ${data.status}`,
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to send test webhook', {
        description: error.message,
      });
    },
  });

  const updateMutation = trpc.webhooks.update.useMutation({
    onSuccess: () => {
      toast.success('Webhook updated');
      utils.webhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update webhook', {
        description: error.message,
      });
    },
  });

  const handleCreateWebhook = () => {
    if (!newWebhookUrl.startsWith('https://')) {
      toast.error('Webhook URL must use HTTPS');
      return;
    }
    if (selectedEvents.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    createMutation.mutate({
      url: newWebhookUrl,
      events: selectedEvents,
      description: newWebhookDescription || undefined,
    });
  };

  const handleToggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter((e) => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  const handleToggleActive = (webhookId: string, currentState: boolean) => {
    updateMutation.mutate({
      id: webhookId,
      isActive: !currentState,
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Webhooks</h2>
        <p className="text-slate-400">
          Configure webhooks to receive real-time notifications about events in your account.
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-slate-900/90 p-6 rounded-2xl border border-blue-500/30 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-100">Security Information</h3>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-sm text-blue-200">
          <li>All webhook URLs must use HTTPS for security</li>
          <li>Verify webhook signatures using the X-JobHorizons-Signature header (HMAC SHA-256)</li>
          <li>Your webhook secret is shown only once when creating a webhook</li>
          <li>Webhooks have automatic retry logic with exponential backoff</li>
        </ul>
      </div>

      {/* Create New Webhook */}
      {isCreating ? (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-white mb-2">Create New Webhook</h3>
            <p className="text-sm text-slate-400">
              Add a new endpoint to receive webhook notifications
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url" className="text-white">Endpoint URL *</Label>
              <Input
                id="webhook-url"
                name="webhook-url"
                type="url"
                placeholder="https://api.yourapp.com/webhooks"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-slate-400">
                Must be a valid HTTPS URL that can receive POST requests
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-description" className="text-white">Description (optional)</Label>
              <Input
                id="webhook-description"
                name="webhook-description"
                placeholder="Production API webhook"
                value={newWebhookDescription}
                onChange={(e) => setNewWebhookDescription(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-white">Events to Subscribe *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event.value}
                    type="button"
                    onClick={() => handleToggleEvent(event.value)}
                    className="flex items-start space-x-3 p-3 border border-white/10 rounded-lg hover:bg-white/5 text-left transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      selectedEvents.includes(event.value)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-500'
                    }`}>
                      {selectedEvents.includes(event.value) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {event.label}
                      </div>
                      <p className="text-xs text-slate-400">{event.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateWebhook}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewWebhookUrl('');
                  setNewWebhookDescription('');
                  setSelectedEvents([]);
                }}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      )}

      {/* Webhooks List */}
      {isLoading ? (
        <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-sm">
          <p className="text-center text-slate-400">Loading webhooks...</p>
        </div>
      ) : webhookList.length > 0 ? (
        <div className="space-y-4">
          {webhookList.map((webhook) => (
            <div key={webhook.id} className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white truncate">{webhook.url}</h4>
                  <Badge variant={webhook.isActive ? 'default' : 'secondary'} className={webhook.isActive ? 'bg-green-500/20 text-green-300 border-green-500/30' : ''}>
                    {webhook.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {webhook.description && (
                  <p className="text-sm text-slate-400">{webhook.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Created {new Date(webhook.createdAt).toLocaleDateString()}</span>
                  {webhook.lastUsedAt && (
                    <span>Last used {new Date(webhook.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Events */}
                <div>
                  <Label className="text-xs text-slate-400 mb-2 block">
                    Subscribed Events
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs bg-white/5 border-white/10 text-slate-300">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate({ id: webhook.id })}
                    disabled={testMutation.isPending || !webhook.isActive}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingLogs(viewingLogs === webhook.id ? null : webhook.id)}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {viewingLogs === webhook.id ? 'Hide' : 'View'} Logs
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(webhook.id, webhook.isActive)}
                    disabled={updateMutation.isPending}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    {webhook.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this webhook?')) {
                        deleteMutation.mutate({ id: webhook.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>

                {/* Delivery Logs */}
                {viewingLogs === webhook.id && (
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-white mb-3">Recent Deliveries</h4>
                    {deliveryLogs.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {deliveryLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg text-sm border border-white/5"
                          >
                            <div className="mt-0.5">
                              {log.deliveredAt ? (
                                <CheckCircle className="h-4 w-4 text-green-400" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white">{log.event}</span>
                                <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-slate-300">
                                  Status {log.httpStatus || 'Failed'}
                                </Badge>
                              </div>
                              <div className="text-xs text-slate-400 space-y-1">
                                <div>
                                  Attempt {log.attemptCount} • {new Date(log.createdAt).toLocaleString()}
                                </div>
                                {log.responseBody && (
                                  <div className="font-mono bg-black/30 p-2 rounded mt-1 truncate text-slate-300">
                                    {log.responseBody}
                                  </div>
                                )}
                                {!log.deliveredAt && log.nextRetryAt && (
                                  <div className="text-orange-400">
                                    Retry scheduled: {new Date(log.nextRetryAt).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No delivery logs yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-800 shadow-sm">
          <div className="text-center">
            <p className="text-slate-400 mb-4">No webhooks configured yet</p>
            <Button onClick={() => setIsCreating(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Webhook
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
