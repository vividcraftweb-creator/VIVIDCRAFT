'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function WebhooksPage() {
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
        description: `Secret: ${data.secret} (save this, it won&apos;t be shown again)`,
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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure webhooks to receive real-time notifications about events in your account.
        </p>
      </div>

      {/* Security Notice */}
      <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <ul className="list-disc pl-5 space-y-1">
            <li>All webhook URLs must use HTTPS for security</li>
            <li>Verify webhook signatures using the X-JobHorizons-Signature header (HMAC SHA-256)</li>
            <li>Your webhook secret is shown only once when creating a webhook</li>
            <li>Webhooks have automatic retry logic with exponential backoff</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create New Webhook */}
      {isCreating ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Webhook</CardTitle>
            <CardDescription>
              Add a new endpoint to receive webhook notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL *</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://api.yourapp.com/webhooks"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL that can receive POST requests
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-description">Description (optional)</Label>
              <Input
                id="webhook-description"
                placeholder="Production API webhook"
                value={newWebhookDescription}
                onChange={(e) => setNewWebhookDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Events to Subscribe *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event.value}
                    type="button"
                    onClick={() => handleToggleEvent(event.value)}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent text-left transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      selectedEvents.includes(event.value)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {selectedEvents.includes(event.value) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {event.label}
                      </div>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateWebhook}
                disabled={createMutation.isPending}
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
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsCreating(true)} className="mb-6">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      )}

      {/* Webhooks List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading webhooks...</p>
          </CardContent>
        </Card>
      ) : webhookList.length > 0 ? (
        <div className="space-y-4">
          {webhookList.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{webhook.url}</CardTitle>
                      <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Created {new Date(webhook.createdAt).toLocaleDateString()}</span>
                      {webhook.lastUsedAt && (
                        <span>Last used {new Date(webhook.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Events */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Subscribed Events
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testMutation.mutate({ id: webhook.id })}
                      disabled={testMutation.isPending || !webhook.isActive}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingLogs(viewingLogs === webhook.id ? null : webhook.id)}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      {viewingLogs === webhook.id ? 'Hide' : 'View'} Logs
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(webhook.id, webhook.isActive)}
                      disabled={updateMutation.isPending}
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
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>

                  {/* Delivery Logs */}
                  {viewingLogs === webhook.id && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-semibold mb-3">Recent Deliveries</h4>
                      {deliveryLogs.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {deliveryLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 p-3 bg-muted rounded-lg text-sm"
                            >
                              <div className="mt-0.5">
                                {log.deliveredAt ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{log.event}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Status {log.httpStatus || 'Failed'}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>
                                    Attempt {log.attemptCount} • {new Date(log.createdAt).toLocaleString()}
                                  </div>
                                  {log.responseBody && (
                                    <div className="font-mono bg-background p-2 rounded mt-1 truncate">
                                      {log.responseBody}
                                    </div>
                                  )}
                                  {!log.deliveredAt && log.nextRetryAt && (
                                    <div className="text-orange-600 dark:text-orange-400">
                                      Retry scheduled: {new Date(log.nextRetryAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No delivery logs yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No webhooks configured yet</p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
