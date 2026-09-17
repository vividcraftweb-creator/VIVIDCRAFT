'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, Unlock, Loader2, ArrowRight, Search, ExternalLink, Eye, Copy, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MessageDetailModal from '@/components/admin/MessageDetailModal';
import { getChatCode, matchesChatCode } from '@/lib/chat-code';

export default function AdminConnectionsTab() {
  const utils = trpc.useUtils();
  const [page, setPage] = useState(0);
  const [searchChatCode, setSearchChatCode] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Fetch messages for grouped chat code monitoring
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = trpc.admin.messages.getMessages.useQuery({
    limit: 100,
    searchQuery: searchChatCode.trim() || undefined,
  });

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

  // Group messages by unique Chat Code
  const groupedConversations = useMemo(() => {
    const rawList = messagesData?.messages || [];
    const map = new Map<string, {
      chatCode: string;
      sender: {
        id: string;
        name: string;
        email: string;
      };
      receiver: {
        id: string;
        name: string;
        email: string;
      };
      lastMessageTime: string | Date;
      totalMessages: number;
      latestMessageId: string;
      hasFlagged: boolean;
      allMessages: any[];
    }>();

    for (const msg of rawList) {
      const senderId = (msg as any).senderId || (msg as any).sender_id || msg.sender?.id;
      const receiverId = (msg as any).receiverId || (msg as any).receiver_id || msg.receiver?.id;
      const code = msg.chat_code || (msg as any).chatCode || getChatCode(senderId, receiverId);

      const senderProfile = Array.isArray(msg.sender?.Profile)
        ? msg.sender.Profile[0]
        : msg.sender?.Profile;
      const receiverProfile = Array.isArray(msg.receiver?.Profile)
        ? msg.receiver.Profile[0]
        : msg.receiver?.Profile;

      const senderName =
        senderProfile
          ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim()
          : msg.sender?.name || msg.sender?.email?.split('@')[0] || 'User';
      const receiverName =
        receiverProfile
          ? `${receiverProfile.firstName || ''} ${receiverProfile.lastName || ''}`.trim()
          : msg.receiver?.name || msg.receiver?.email?.split('@')[0] || 'User';

      const msgTime = msg.createdAt || msg.created_at;

      if (!map.has(code)) {
        map.set(code, {
          chatCode: code,
          sender: {
            id: senderId,
            name: senderName || 'User',
            email: msg.sender?.email || '',
          },
          receiver: {
            id: receiverId,
            name: receiverName || 'User',
            email: msg.receiver?.email || '',
          },
          lastMessageTime: msgTime,
          totalMessages: 1,
          latestMessageId: msg.id,
          hasFlagged: Boolean(msg.flagged),
          allMessages: [msg],
        });
      } else {
        const existing = map.get(code)!;
        existing.totalMessages += 1;
        existing.allMessages.push(msg);
        if (msg.flagged) {
          existing.hasFlagged = true;
        }
        if (new Date(msgTime).getTime() > new Date(existing.lastMessageTime).getTime()) {
          existing.lastMessageTime = msgTime;
          existing.latestMessageId = msg.id;
        }
      }
    }

    let list = Array.from(map.values());
    list.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    if (searchChatCode.trim()) {
      const s = searchChatCode.toLowerCase().trim();
      list = list.filter(
        (g) =>
          matchesChatCode(g.chatCode, s) ||
          g.sender.name.toLowerCase().includes(s) ||
          g.sender.email.toLowerCase().includes(s) ||
          g.receiver.name.toLowerCase().includes(s) ||
          g.receiver.email.toLowerCase().includes(s) ||
          g.allMessages.some((m) => m.content && m.content.toLowerCase().includes(s))
      );
    }

    return list;
  }, [messagesData?.messages, searchChatCode]);

  const connections = data?.items || [];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Communications &amp; Messages Monitoring
          </h3>
          <p className="text-slate-400 text-xs">Conversations grouped by unique Chat Code with full thread inspection.</p>
        </div>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
          <Link href="/admin/messages" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            All Messages Page
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Link>
        </Button>
      </div>

      {/* Chat Code Quick Search */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter conversations by Chat Code (e.g. CHAT-XXXXXX) or user email..."
            value={searchChatCode}
            onChange={(e) => setSearchChatCode(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {searchChatCode && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSearchChatCode('')}
            className="text-slate-400 hover:text-white text-xs h-8"
          >
            Clear
          </Button>
        )}
      </div>

      {/* 1. GROUPED CHAT CODE CONVERSATIONS TABLE */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Active Chat Threads</span>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
              {groupedConversations.length} {groupedConversations.length === 1 ? 'thread' : 'threads'}
            </Badge>
          </div>
          <span className="text-xs text-slate-400">Click Eye to view chronological history</span>
        </div>

        {messagesLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            Loading conversations...
          </div>
        ) : groupedConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No conversations found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/40">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Chat Code
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Participants
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Last Message Time
                  </th>
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Total Messages
                  </th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide w-20">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedConversations.map((group) => (
                  <tr
                    key={group.chatCode}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedMessageId(group.latestMessageId)}
                  >
                    {/* CHAT CODE */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 whitespace-nowrap tracking-wide font-bold cursor-pointer hover:bg-blue-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(group.chatCode);
                            toast.success(`Copied chat code: ${group.chatCode}`);
                          }}
                          title="Click to copy Chat Code"
                        >
                          {group.chatCode}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(group.chatCode);
                            toast.success(`Copied chat code: ${group.chatCode}`);
                          }}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                          title="Copy Chat Code"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* PARTICIPANTS (From/To) */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="min-w-0 max-w-[140px]">
                          <span className="text-[10px] text-slate-500 uppercase block font-medium">From</span>
                          <span className="font-medium text-white truncate block">{group.sender.name}</span>
                          <span className="text-[11px] text-slate-400 truncate block">{group.sender.email}</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0 mx-0.5" />
                        <div className="min-w-0 max-w-[140px]">
                          <span className="text-[10px] text-slate-500 uppercase block font-medium">To</span>
                          <span className="font-medium text-white truncate block">{group.receiver.name}</span>
                          <span className="text-[11px] text-slate-400 truncate block">{group.receiver.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* LAST MESSAGE TIME */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-xs text-slate-300 font-medium">
                        {new Date(group.lastMessageTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(group.lastMessageTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* TOTAL MESSAGES */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700 text-xs">
                          {group.totalMessages} {group.totalMessages === 1 ? 'msg' : 'msgs'}
                        </Badge>
                        {group.hasFlagged && (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px] py-0 h-4">
                            <Flag className="h-2.5 w-2.5 mr-0.5" />
                            Flagged
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* ACTION */}
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-white hover:bg-blue-600/30 h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMessageId(group.latestMessageId);
                        }}
                        title="View Chronological History"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. CHAT PERMISSION CONNECTIONS */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h4 className="text-sm font-bold text-white">Direct Chat Permissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {connections.map((conn) => (
            <div key={conn.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  <span className="text-white text-xs font-medium">Conn: {conn.id ? `${conn.id.slice(0, 8)}...` : 'N/A'}</span>
                </div>
                <Badge
                  className={
                    conn.chatEnabled
                      ? 'bg-green-500/20 text-green-300 border-green-500/30 text-[11px]'
                      : 'bg-red-500/20 text-red-300 border-red-500/30 text-[11px]'
                  }
                >
                  {conn.chatEnabled ? 'CHAT ENABLED' : 'CHAT DISABLED'}
                </Badge>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 rounded-lg p-2.5 text-xs">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px]">Client</span>
                  <span className="text-slate-200">{conn.clientId ? `${conn.clientId.slice(0, 8)}...` : 'N/A'}</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                <div className="flex flex-col text-right">
                  <span className="text-slate-400 text-[10px]">Artist</span>
                  <span className="text-slate-200">{conn.artistId ? `${conn.artistId.slice(0, 8)}...` : 'N/A'}</span>
                </div>
              </div>

              <div className="mt-auto pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`w-full gap-2 text-xs h-7 border-slate-800 ${
                    conn.chatEnabled ? 'hover:bg-red-500/20 hover:text-red-300' : 'hover:bg-green-500/20 hover:text-green-300'
                  }`}
                  disabled={toggleChat.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleChat.mutate({ id: conn.id, chatEnabled: !conn.chatEnabled });
                  }}
                >
                  {toggleChat.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : conn.chatEnabled ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  {conn.chatEnabled ? 'Disable Chat' : 'Enable Chat'}
                </Button>
              </div>
            </div>
          ))}
          {connections.length === 0 && (
            <div className="col-span-full text-center text-slate-400 py-6 text-xs">
              No connections found.
            </div>
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessageId && (
        <MessageDetailModal
          messageId={selectedMessageId}
          onClose={() => {
            setSelectedMessageId(null);
            refetchMessages();
          }}
          onUpdate={refetchMessages}
        />
      )}
    </div>
  );
}
