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
import { useState, useEffect } from 'react';
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

  const pageSize = 20;

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

  // Filter messages by search term or Chat Code
  const filteredMessages =
    (messagesData?.messages || []).filter((msg) => {
      const searchLower = searchTerm.toLowerCase();
      const senderEmail = msg.sender?.email?.toLowerCase() || '';
      const receiverEmail = msg.receiver?.email?.toLowerCase() || '';
      const content = msg.content?.toLowerCase() || '';
      const senderId = (msg as any).senderId || msg.sender?.id;
      const receiverId = (msg as any).receiverId || msg.receiver?.id;
      const chatCode = getChatCode(senderId, receiverId);

      return (
        matchesChatCode(chatCode, searchTerm) ||
        senderEmail.includes(searchLower) ||
        receiverEmail.includes(searchLower) ||
        content.includes(searchLower)
      );
    });

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
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">No messages found</p>
              <p className="text-slate-500 text-xs mt-1">
                {searchTerm
                  ? 'Try adjusting your search'
                  : showFlaggedOnly
                  ? 'No flagged messages'
                  : 'Messages will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Chat Code
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      From
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      To
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Message
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide w-20">
                      Status
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-300 uppercase tracking-wide w-16">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((message) => {
                    const senderProfile = Array.isArray(message.sender?.Profile)
                      ? message.sender.Profile[0]
                      : message.sender?.Profile;
                    const receiverProfile = Array.isArray(message.receiver?.Profile)
                      ? message.receiver.Profile[0]
                      : message.receiver?.Profile;

                    const senderName =
                      senderProfile
                        ? `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim()
                        : null;
                    const receiverName =
                      receiverProfile
                        ? `${receiverProfile.firstName || ''} ${receiverProfile.lastName || ''}`.trim()
                        : null;

                    const senderId = (message as any).senderId || message.sender?.id;
                    const receiverId = (message as any).receiverId || message.receiver?.id;
                    const chatCode = getChatCode(senderId, receiverId);

                    return (
                      <tr
                        key={message.id}
                        className="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedMessageId(message.id)}
                      >
                        <td className="py-2 px-3">
                          <div className="text-xs text-slate-300">
                            {new Date(message.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(message.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] bg-blue-500/10 text-blue-400 border-blue-500/30 whitespace-nowrap tracking-wide cursor-pointer hover:bg-blue-500/20 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(chatCode);
                                toast.success(`Copied chat code: ${chatCode}`);
                              }}
                              title="Click to copy Chat Code"
                            >
                              {chatCode}
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(chatCode);
                                toast.success(`Copied chat code: ${chatCode}`);
                              }}
                              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                              title="Copy Chat Code"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-xs text-white font-medium truncate max-w-[150px]">
                            {senderName || message.sender?.email || 'Unknown'}
                          </div>
                          {senderName && (
                            <div className="text-xs text-slate-500 truncate max-w-[150px]">
                              {message.sender?.email}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-xs text-white font-medium truncate max-w-[150px]">
                            {receiverName || message.receiver?.email || 'Unknown'}
                          </div>
                          {receiverName && (
                            <div className="text-xs text-slate-500 truncate max-w-[150px]">
                              {message.receiver?.email}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed max-w-[300px]">
                            {message.content || 'No content'}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {message.flagged ? (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                              <Flag className="h-3 w-3 mr-1" />
                              Flagged
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessageId(message.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
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
            Page {currentPage} of {totalPages} • {filteredMessages.length} messages
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
