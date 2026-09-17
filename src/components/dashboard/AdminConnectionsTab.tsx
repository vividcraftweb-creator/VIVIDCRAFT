'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, Unlock, Loader2, ArrowRight, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminConnectionsTab() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const [searchChatCode, setSearchChatCode] = useState('');

  const { data, isLoading } = trpc.admin.chatConnections.getConnections.useQuery({
    limit: 50,
    offset: page * 50,
  });

  const toggleChat = trpc.admin.chatConnections.toggleConnection.useMutation({
    onSuccess: () => {
      utils.admin.chatConnections.getConnections.invalidate();
      toast.success('Chat status updated successfully');
    },
    onError: (error: any) => {
      const msg = typeof error === 'string' ? error : error?.message || 'Failed to update chat connection';
      toast.error(`Failed to update chat status: ${msg}`);
    },
  });

  if (isLoading) return <div className="text-white p-4">Loading connections...</div>;

  const connections = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-medium text-white">Chat Connections &amp; Monitoring</h3>
          <p className="text-slate-400 text-xs">Manage permissions and monitor conversations across the platform.</p>
        </div>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
          <Link href="/admin/messages" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            All Messages &amp; Chat Codes
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Link>
        </Button>
      </div>

      {/* Chat Code Quick Lookup Box */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Chat Code (e.g. CHAT-XXXXXX)..."
            value={searchChatCode}
            onChange={(e) => setSearchChatCode(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button
          asChild
          size="sm"
          disabled={!searchChatCode.trim()}
          className="bg-blue-600/90 hover:bg-blue-600 text-white text-xs h-8 whitespace-nowrap w-full sm:w-auto"
        >
          <Link href={`/admin/messages?chatCode=${encodeURIComponent(searchChatCode.trim())}`}>
            <Search className="h-3.5 w-3.5 mr-1" />
            Inspect Chat Code
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map(conn => (
          <div key={conn.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />
                <span className="text-white font-medium">Conn: {conn.id ? `${conn.id.slice(0, 8)}...` : 'N/A'}</span>
              </div>
              <Badge className={
                conn.chatEnabled ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
              }>
                {conn.chatEnabled ? 'CHAT ENABLED' : 'CHAT DISABLED'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs">Client</span>
                <span className="text-slate-200">{conn.clientId ? `${conn.clientId.slice(0, 8)}...` : 'N/A'}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="flex flex-col text-right">
                <span className="text-slate-400 text-xs">Artist</span>
                <span className="text-slate-200">{conn.artistId ? `${conn.artistId.slice(0, 8)}...` : 'N/A'}</span>
              </div>
            </div>

            <div className="mt-auto pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`w-full gap-2 border-white/10 ${conn.chatEnabled ? 'hover:bg-red-500/20 hover:text-red-300' : 'hover:bg-green-500/20 hover:text-green-300'}`}
                disabled={toggleChat.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  toggleChat.mutate({ id: conn.id, chatEnabled: !conn.chatEnabled });
                }}
              >
                {toggleChat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                 conn.chatEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />
                }
                {conn.chatEnabled ? 'Disable Chat' : 'Enable Chat'}
              </Button>
            </div>
          </div>
        ))}
        {connections.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-8">
            No connections found.
          </div>
        )}
      </div>
    </div>
  );
}
