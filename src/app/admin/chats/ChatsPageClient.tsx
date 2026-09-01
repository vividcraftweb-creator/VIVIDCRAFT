'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatsPageClient() {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.chatConnections.getConnections.useQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  const toggleMutation = trpc.admin.chatConnections.toggleConnection.useMutation({
    onSuccess: () => {
      toast.success('Chat connection updated');
      utils.admin.chatConnections.getConnections.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update chat connection');
    },
  });

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, chatEnabled: !currentStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-400" />
          Chat Connections
        </h1>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-black/20 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Artist</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto" />
                  </td>
                </tr>
              ) : (!data?.items || data.items.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No chat connections found.
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((conn: any) => (
                  <tr key={conn.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-slate-500" />
                        <div>
                          <div className="text-white font-medium">
                            {conn.client?.Profile?.firstName} {conn.client?.Profile?.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{conn.client?.email || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-purple-400" />
                        <div>
                          <div className="text-white font-medium">
                            {conn.artist?.Profile?.firstName} {conn.artist?.Profile?.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{conn.artist?.email || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {conn.chatEnabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant={conn.chatEnabled ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggle(conn.id, conn.chatEnabled)}
                        disabled={toggleMutation.isPending}
                        className={!conn.chatEnabled ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      >
                        {conn.chatEnabled ? 'Disable Chat' : 'Enable Chat'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && (data.hasMore || page > 0) && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-white/10 text-slate-300 hover:text-white"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-500">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.total || 0)} of {data.total || 0}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasMore}
              className="border-white/10 text-slate-300 hover:text-white"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
