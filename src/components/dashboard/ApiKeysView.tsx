'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string | Date;
  lastUsedAt?: string | Date | null;
}

const isApiKeyRecord = (value: unknown): value is ApiKeyRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.keyPrefix === 'string' &&
    Array.isArray(record.scopes) &&
    record.scopes.every(scope => typeof scope === 'string') &&
    (typeof record.createdAt === 'string' || record.createdAt instanceof Date)
  );
};

export default function ApiKeysView() {
  const { data: session } = useAuth();
  const [keyName, setKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read:*']);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Fetch API keys
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!session?.session?.user,
  });
  const apiKeysList = Array.isArray(apiKeys) ? apiKeys.filter(isApiKeyRecord) : [];

  // Create API key mutation
  const createKeyMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewApiKey(data.key);
      setShowNewKey(true);
      setKeyName('');
      setSelectedScopes(['read:*']);
      utils.apiKeys.list.invalidate();
      toast.success('API key created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create API key', {
        description: error.message
      });
    }
  });

  // Revoke API key mutation
  const revokeKeyMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      utils.apiKeys.list.invalidate();
      setDeleteKeyId(null);
      toast.success('API key revoked successfully');
    },
    onError: (error) => {
      toast.error('Failed to revoke API key', {
        description: error.message
      });
    }
  });

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    createKeyMutation.mutate({
      name: keyName,
      scopes: selectedScopes
    });
  };

  const handleCopyKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast.success('API key copied to clipboard');
    }
  };

  const handleToggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const availableScopes = [
    { value: 'read:*', label: 'Read All', description: 'Read access to all resources' },
    { value: 'write:*', label: 'Write All', description: 'Write access to all resources' },
    { value: 'read:jobs', label: 'Read Jobs', description: 'View jobs' },
    { value: 'write:jobs', label: 'Write Jobs', description: 'Create/update jobs' },
    { value: 'read:freelancers', label: 'Read Freelancers', description: 'View freelancer profiles' },
    { value: 'read:analytics', label: 'Read Analytics', description: 'View analytics data' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="h-20 bg-white/10 rounded"></div>
          <div className="h-20 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
        <p className="text-slate-400">
          Manage your API keys for programmatic access to JobHorizons
        </p>
      </div>

      {/* Warning Banner */}
      <div className="glass-card p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-200 font-medium">Keep your API keys secure</p>
            <p className="text-yellow-300/80 text-sm mt-1">
              Treat API keys like passwords. Never share them publicly or commit them to version control.
            </p>
          </div>
        </div>
      </div>

      {/* New API Key Display */}
      {newApiKey && showNewKey && (
        <div className="glass-card p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-green-300">API Key Created</h3>
              <p className="text-green-200/80 text-sm mt-1">
                Make sure to copy your API key now. You won&apos;t be able to see it again!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={newApiKey}
              readOnly
              className="font-mono text-sm bg-black/20 border-green-500/30 text-green-200"
            />
            <Button
              onClick={handleCopyKey}
              className="bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30"
            >
              {copiedKey ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setShowNewKey(false);
                setNewApiKey(null);
              }}
              variant="ghost"
              className="text-green-300 hover:bg-green-500/20"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Create New Key */}
      <div className="glass-card p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Create New API Key</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Key Name
            </label>
            <Input
              type="text"
              placeholder="e.g., Production API Key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="bg-black/20 border-white/10 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              A descriptive name to help you identify this key
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block">
              Permissions (Scopes)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableScopes.map((scope) => (
                <button
                  key={scope.value}
                  onClick={() => handleToggleScope(scope.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedScopes.includes(scope.value)
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      selectedScopes.includes(scope.value)
                        ? 'bg-primary border-primary'
                        : 'border-slate-500'
                    }`}>
                      {selectedScopes.includes(scope.value) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{scope.label}</span>
                  </div>
                  <p className="text-xs opacity-70 ml-6">{scope.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreateKey}
            disabled={createKeyMutation.isPending || !keyName.trim() || selectedScopes.length === 0}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {/* Existing Keys */}
      <div className="glass-card p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Your API Keys</h2>

        {apiKeysList.length === 0 ? (
          <div className="text-center py-12">
            <Key className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">No API keys yet</p>
            <p className="text-slate-500 text-sm">
              Create your first API key to get started with the JobHorizons API
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeysList.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-white">{key.name}</h3>
                    {key.lastUsedAt ? (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">
                        Unused
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="font-mono">{key.keyPrefix}...</span>
                    <span>•</span>
                    <span>{key.scopes.length} scopes</span>
                    <span>•</span>
                    <span>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt && (
                      <>
                        <span>•</span>
                        <span>
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteKeyId(key.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Link */}
      <div className="glass-card p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Key className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-blue-300 mb-2">API Documentation</h3>
            <p className="text-blue-200/80 text-sm mb-4">
              Learn how to use the JobHorizons API to integrate with your applications.
            </p>
            <Button
              variant="outline"
              className="border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
              onClick={() => window.open('/docs/api', '_blank')}
            >
              View API Docs
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
        <AlertDialogContent className="glass-card bg-slate-900/90 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. Any applications using this API key will immediately
              lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && revokeKeyMutation.mutate({ id: deleteKeyId })}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
