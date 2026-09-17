'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import {
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Eye,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
  ArrowRight,
  Copy,
  X,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import MessageDetailModal from '@/components/admin/MessageDetailModal';
import { getChatCode, matchesChatCode } from '@/lib/chat-code';

export default function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('chatCode') || searchParams?.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  useEffect(() => {
    const codeFromUrl = searchParams?.get('chatCode') || searchParams?.get('search');
    if (codeFromUrl && codeFromUrl !== searchTerm) {
      setSearchTerm(codeFromUrl);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const pageSize = 100;

  // Get messages from actual database with search query passed to backend
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = trpc.admin.messages.getMessages.useQuery({
    page: currentPage,
    limit: pageSize,
    flaggedOnly: showFlaggedOnly,
    searchQuery: searchTerm.trim() || undefined,
  });

  // Get real statistics
  const { data: stats, refetch: refetchStats } = trpc.admin.messages.getStats.useQuery();

  const handleRefresh = () => {
    refetchMessages();
    refetchStats();
  };

  const handleModalClose = () => {
    setSelectedMessageId(null);
    handleRefresh();
  };

  // Group messages by unique Chat Code
  const groupedConversations = useMemo(() => {
    const rawList = messagesData?.messages || [];
    const map = new Map<string, {
      chatCode: string;
      sender: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
      };
      receiver: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string | null;
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
            name: senderName,
            email: msg.sender?.email || '',
            avatarUrl: senderProfile?.avatarUrl,
          },
          receiver: {
            id: receiverId,
            name: receiverName,
            email: msg.receiver?.email || '',
            avatarUrl: receiverProfile?.avatarUrl,
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

    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase().trim();
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

    if (showFlaggedOnly) {
      list = list.filter((g) => g.hasFlagged);
    }

    return list;
  }, [messagesData?.messages, searchTerm, showFlaggedOnly]);

  const totalPages = messagesData?.totalPages || 1;
  const totalMessages = stats?.totalMessages || 0;
  const flaggedMessages = stats?.flaggedMessages || 0;
  const last24Hours = stats?.last24Hours || 0;
  const flaggedPercentage = stats?.flaggedPercentage || '0';

  if (messagesLoading && !messagesData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Messages</h1>
            <p className="text-slate-400 text-xs">Monitor platform communications</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Compact Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-400 font-medium uppercase tracking-wide">Total</div>
                <div className="text-xl font-bold text-white mt-0.5">{totalMessages.toLocaleString()}</div>
              </div>
              <MessageSquare className="h-5 w-5 text-blue-400/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-400 font-medium uppercase tracking-wide">Flagged</div>
                <div className="text-xl font-bold text-white mt-0.5">{flaggedMessages.toLocaleString()}</div>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-400/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-400 font-medium uppercase tracking-wide">Last 24h</div>
                <div className="text-xl font-bold text-white mt-0.5">{last24Hours.toLocaleString()}</div>
              </div>
              <TrendingUp className="h-5 w-5 text-green-400/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-400 font-medium uppercase tracking-wide">Page</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {currentPage}/{totalPages}
                </div>
              </div>
              <Filter className="h-5 w-5 text-purple-400/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Filters */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages by content, user email, or Chat Code (e.g. CHAT-XXXXXX)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-8 py-1.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              onClick={() => {
                setShowFlaggedOnly(!showFlaggedOnly);
                setCurrentPage(1);
              }}
              variant={showFlaggedOnly ? 'default' : 'outline'}
              size="sm"
              className={
                showFlaggedOnly
                  ? 'bg-red-600 hover:bg-red-700 text-white text-xs h-8'
                  : 'bg-slate-950 border-slate-800 text-white hover:bg-slate-800 text-xs h-8'
              }
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              {showFlaggedOnly ? 'All' : 'Flagged'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compact Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          {groupedConversations.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No conversations found</p>
              <p className="text-slate-500 text-xs mt-1">
                {searchTerm
                  ? 'Try adjusting your search or Chat Code'
                  : showFlaggedOnly
                  ? 'No flagged conversations'
                  : 'Conversations will appear here grouped by Chat Code'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Chat Code
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Participants
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Last Message Time
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Total Messages
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wide w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedConversations.map((group) => {
                    return (
                      <tr
                        key={group.chatCode}
                        className="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedMessageId(group.latestMessageId)}
                      >
                        {/* CHAT CODE */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 whitespace-nowrap tracking-wide font-bold cursor-pointer hover:bg-blue-500/20 transition-colors"
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
                              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                              title="Copy Chat Code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* PARTICIPANTS (From/To) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="min-w-0 max-w-[150px] sm:max-w-[180px]">
                              <span className="text-[10px] text-slate-500 uppercase block font-semibold">From</span>
                              <span className="font-medium text-white truncate block">{group.sender.name}</span>
                              <span className="text-[11px] text-slate-400 truncate block">{group.sender.email}</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500 shrink-0 mx-1" />
                            <div className="min-w-0 max-w-[150px] sm:max-w-[180px]">
                              <span className="text-[10px] text-slate-500 uppercase block font-semibold">To</span>
                              <span className="font-medium text-white truncate block">{group.receiver.name}</span>
                              <span className="text-[11px] text-slate-400 truncate block">{group.receiver.email}</span>
                            </div>
                          </div>
                        </td>

                        {/* LAST MESSAGE TIME */}
                        <td className="py-3 px-4 whitespace-nowrap">
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
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="bg-slate-800 text-slate-200 border-slate-700 text-xs font-semibold">
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
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-white hover:bg-blue-600/30 h-8 w-8 p-0 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessageId(group.latestMessageId);
                            }}
                            title="Inspect Conversation History"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-xs text-slate-400">
            Page {currentPage} of {totalPages} • {groupedConversations.length} conversations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 disabled:opacity-50 h-7 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="bg-slate-900 border-slate-800 text-white hover:bg-slate-800 disabled:opacity-50 h-7 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedMessageId && (
        <MessageDetailModal
          messageId={selectedMessageId}
          onClose={handleModalClose}
          onUpdate={handleRefresh}
        />
      )}
    </div>
  );
}
