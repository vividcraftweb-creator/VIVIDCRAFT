'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProposalDetailModal from '@/components/admin/ProposalDetailModal';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Award,
  Brain,
  Filter,
  ArrowUpDown,
  Briefcase,
} from 'lucide-react';
import { useState } from 'react';

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export default function AdminProposalsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | ''>('');
  const [page, setPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const limit = 25;

  const utils = trpc.useUtils();

  // Get real proposals from database
  const { data: proposalsData, isLoading, refetch } = trpc.admin.proposals.getProposals.useQuery({
    page,
    limit,
    status: filterStatus || undefined,
    search: searchTerm || undefined,
  });

  // Get proposal statistics
  const { data: stats } = trpc.admin.proposals.getStats.useQuery();

  // Mutations for accepting/rejecting proposals
  const acceptProposal = trpc.admin.proposals.acceptProposal.useMutation({
    onSuccess: () => {
      utils.admin.proposals.getProposals.invalidate();
      utils.admin.proposals.getStats.invalidate();
      setIsModalOpen(false);
    },
    onError: (error) => {
    },
  });

  const rejectProposal = trpc.admin.proposals.rejectProposal.useMutation({
    onSuccess: () => {
      utils.admin.proposals.getProposals.invalidate();
      utils.admin.proposals.getStats.invalidate();
      setIsModalOpen(false);
    },
    onError: (error) => {
    },
  });

  const proposals = proposalsData?.proposals ?? [];
  const totalProposals = proposalsData?.total ?? 0;
  const totalPages = proposalsData?.totalPages ?? 1;

  // Calculate statistics
  const pendingProposals = stats?.pendingProposals ?? 0;
  const acceptedProposals = stats?.acceptedProposals ?? 0;
  const rejectedProposals = stats?.rejectedProposals ?? 0;
  const totalStats = stats?.totalProposals ?? 0;

  const acceptanceRate = totalStats > 0 ? (acceptedProposals / totalStats) * 100 : 0;
  const avgProposedRate = proposals.length > 0
    ? proposals.reduce((sum, p) => sum + p.proposedRate, 0) / proposals.length
    : 0;

  const avgAiScore = proposals.length > 0
    ? proposals.filter(p => p.aiScore !== null && p.aiScore !== undefined)
        .reduce((sum, p) => sum + (p.aiScore || 0), 0) / proposals.filter(p => p.aiScore).length
    : 0;

  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'ACCEPTED': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'REJECTED': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'WITHDRAWN': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: ProposalStatus) => {
    switch (status) {
      case 'PENDING': return Clock;
      case 'ACCEPTED': return CheckCircle;
      case 'REJECTED': return XCircle;
      case 'WITHDRAWN': return AlertCircle;
      default: return FileText;
    }
  };

  const handleViewProposal = (proposal: any) => {
    setSelectedProposal(proposal);
    setIsModalOpen(true);
  };

  const handleAcceptProposal = (proposalId: string) => {
    acceptProposal.mutate({ id: proposalId });
  };

  const handleRejectProposal = (proposalId: string) => {
    rejectProposal.mutate({ id: proposalId });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/5 rounded w-1/4"></div>
          <div className="h-12 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Inline Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Proposals Management</h1>
        </div>

        {/* Inline Stats */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <FileText className="h-4 w-4 text-blue-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{totalStats}</span>
              <span className="text-xs text-blue-300">Total</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{pendingProposals}</span>
              <span className="text-xs text-yellow-300">Pending</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white">{acceptedProposals}</span>
              <span className="text-xs text-green-300">Accepted</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="border-white/10 text-white hover:bg-white/5 h-8 px-3"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>

      {/* Compact Additional Metrics */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
        <span className="text-xs text-slate-400 px-2">Metrics:</span>
        <div className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded border border-green-500/20">
            <DollarSign className="h-3 w-3 text-green-400" />
            <span className="text-sm font-bold text-white">${avgProposedRate.toFixed(0)}</span>
            <span className="text-xs text-green-300">/hr avg</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 rounded border border-purple-500/20">
            <Award className="h-3 w-3 text-purple-400" />
            <span className="text-sm font-bold text-white">
              {proposals.length > 0
                ? (proposals.reduce((sum, p) => sum + p.tokenBid, 0) / proposals.length).toFixed(1)
                : 0}
            </span>
            <span className="text-xs text-purple-300">tokens avg</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded border border-blue-500/20">
            <Brain className="h-3 w-3 text-blue-400" />
            <span className="text-sm font-bold text-white">
              {avgAiScore > 0 ? avgAiScore.toFixed(0) : 'N/A'}
            </span>
            <span className="text-xs text-blue-300">AI score avg</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded border border-red-500/20">
            <XCircle className="h-3 w-3 text-red-400" />
            <span className="text-sm font-bold text-white">{rejectedProposals}</span>
            <span className="text-xs text-red-300">Rejected</span>
          </div>
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by freelancer, client, or job title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-8"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as typeof filterStatus);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 h-8"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="PENDING" className="bg-slate-900">Pending</option>
              <option value="ACCEPTED" className="bg-slate-900">Accepted</option>
              <option value="REJECTED" className="bg-slate-900">Rejected</option>
              <option value="WITHDRAWN" className="bg-slate-900">Withdrawn</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Proposals Table */}
      <Card className="glass-card border-white/10 bg-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Freelancer</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Job</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Rate</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tokens</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Score</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {proposals.map((proposal) => {
                  const StatusIcon = getStatusIcon(proposal.status as ProposalStatus);
                  const freelancer = Array.isArray(proposal.freelancer) ? proposal.freelancer[0] : proposal.freelancer;
                  const job = Array.isArray(proposal.job) ? proposal.job[0] : proposal.job;
                  const freelancerProfile = freelancer?.Profile
                    ? (Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile)
                    : null;

                  const freelancerName = freelancerProfile?.firstName && freelancerProfile?.lastName
                    ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
                    : freelancer?.email || 'Unknown';

                  return (
                    <tr
                      key={proposal.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => handleViewProposal(proposal)}
                    >
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-xs text-slate-300">
                          {new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="text-sm text-white font-medium truncate max-w-[150px]">{freelancerName}</div>
                        {freelancerProfile?.title && (
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{freelancerProfile.title}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-sm text-white truncate line-clamp-1 max-w-[200px]">
                          {job?.title || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <span className="text-sm text-white font-semibold">${proposal.proposedRate}/hr</span>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                          {proposal.tokenBid}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        {proposal.aiScore !== undefined && proposal.aiScore !== null ? (
                          <Badge
                            className={`text-xs ${
                              proposal.aiScore >= 80
                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                : proposal.aiScore >= 60
                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                : 'bg-red-500/20 text-red-300 border-red-500/30'
                            }`}
                          >
                            {proposal.aiScore}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-500">N/A</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <Badge className={`text-xs ${getStatusColor(proposal.status as ProposalStatus)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {proposal.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 align-top">
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProposal(proposal);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {proposals.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <p className="text-lg font-medium mb-1">No proposals found</p>
                <p className="text-sm text-slate-500">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compact Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-slate-500">
            Page {page} of {totalPages} • {totalProposals} proposals
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/5 h-7 px-3 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Proposal Detail Modal */}
      <ProposalDetailModal
        proposal={selectedProposal}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProposal(null);
        }}
        onAccept={handleAcceptProposal}
        onReject={handleRejectProposal}
      />
    </div>
  );
}
