'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Star,
  MessageSquare,
  Mail,
  CheckCircle2,
  TrendingUp,
  Eye,
  Plus,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type TrackingStatus =
  | 'new'
  | 'contacted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer_sent'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

const STATUS_OPTIONS: { value: TrackingStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'interview_completed', label: 'Interview Done', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'offer_sent', label: 'Offer Sent', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
];

interface FreelancerProfile {
  firstName?: string | null;
  lastName?: string | null;
  slug?: string | null;
}

interface TrackedFreelancer {
  email?: string | null;
  subscriptionPlan?: string | null;
  profile?: FreelancerProfile | null;
}

interface TrackedProposalDetails {
  proposedRate?: number | null;
  tokenBid?: number | null;
  aiScore?: number | null;
  aiAnalysis?: string | null;
}

interface TrackedJob {
  title?: string | null;
}

interface TrackedProposalRecord {
  id: string;
  status: TrackingStatus;
  freelancerId?: string | null;
  freelancer?: TrackedFreelancer | null;
  job?: TrackedJob | null;
  proposal?: TrackedProposalDetails | null;
  rating?: number | null;
  tags?: string[] | null;
  notes?: string | null;
}

const isTrackedProposalRecord = (value: unknown): value is TrackedProposalRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.status === 'string';
};

export default function ProposalTrackingCRM() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | 'all'>('all');
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const utils = trpc.useUtils();

  // Check plan access
  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, { retry: false });
  const hasCRMAccess = planSummary?.permissions.hasTeamCollaboration ?? false;

  // Queries
  const { data: trackedProposals, isLoading } = trpc.proposalTracking.list.useQuery({}, {
    enabled: hasCRMAccess,
    retry: false,
  });
  const { data: stats } = trpc.proposalTracking.getStats.useQuery(undefined, {
    enabled: hasCRMAccess,
    retry: false,
  });

  // Mutations
  const updateStatusMutation = trpc.proposalTracking.updateStatus.useMutation({
    onSuccess: () => {
      toast.success('Status updated successfully');
      utils.proposalTracking.list.invalidate();
      utils.proposalTracking.getStats.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update status', {
        description: error.message,
      });
    },
  });

  const addNoteMutation = trpc.proposalTracking.addNote.useMutation({
    onSuccess: () => {
      toast.success('Note added successfully');
      setNoteText('');
      utils.proposalTracking.list.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to add note', {
        description: error.message,
      });
    },
  });

  const getStatusColor = (status: TrackingStatus) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.color || STATUS_OPTIONS[0].color;
  };

  const getStatusLabel = (status: TrackingStatus) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  };

  const trackedProposalList = Array.isArray(trackedProposals)
    ? trackedProposals.filter(isTrackedProposalRecord)
    : [];

  const handleStatusFilterChange = (value: string) => {
    if (value === 'all') {
      setStatusFilter('all');
      return;
    }

    if (STATUS_OPTIONS.some((option) => option.value === value)) {
      setStatusFilter(value as TrackingStatus);
    }
  };

  const lowercaseQuery = searchQuery.trim().toLowerCase();

  const filteredProposals = trackedProposalList.filter((proposal) => {
    const freelancer = proposal.freelancer;
    const profile = freelancer?.profile;
    const freelancerFirst = profile?.firstName?.toLowerCase() ?? '';
    const freelancerLast = profile?.lastName?.toLowerCase() ?? '';
    const freelancerEmail = freelancer?.email?.toLowerCase() ?? '';
    const jobTitle = proposal.job?.title?.toLowerCase() ?? '';

    const matchesSearch =
      lowercaseQuery.length === 0 ||
      freelancerFirst.includes(lowercaseQuery) ||
      freelancerLast.includes(lowercaseQuery) ||
      freelancerEmail.includes(lowercaseQuery) ||
      jobTitle.includes(lowercaseQuery);

    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Show upgrade prompt for free users
  if (!hasCRMAccess) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Proposal Tracking CRM</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Upgrade to Business or Enterprise plan to track freelancers, manage proposals, and organize your hiring pipeline.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>Track proposal status</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>Add notes & ratings</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>Pipeline analytics</span>
              </div>
            </div>
            <Link href="/dashboard?tab=subscription">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600">
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade to Business Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Loading proposal tracking...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Proposal Tracking CRM</h2>
          <p className="text-slate-400 mt-1">
            Track and manage freelancers who submitted proposals
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">New</p>
                  <p className="text-2xl font-bold text-gray-300">{stats.new}</p>
                </div>
                <Plus className="h-8 w-8 text-gray-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Contacted</p>
                  <p className="text-2xl font-bold text-blue-300">{stats.contacted}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Interviews</p>
                  <p className="text-2xl font-bold text-purple-300">
                    {stats.interview_scheduled + stats.interview_completed}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Accepted</p>
                  <p className="text-2xl font-bold text-green-300">{stats.accepted}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Artists
              </Label>
              <Input
                placeholder="Search by name, email, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Status
              </Label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proposal List */}
      {!filteredProposals || filteredProposals.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No Tracked Proposals
              </h3>
              <p className="text-slate-400 mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? 'No proposals match your filters'
                  : 'Start tracking freelancers who submit proposals to your jobs'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProposals.map((tracked) => {
            const freelancerProfile = tracked.freelancer?.profile;
            const freelancerSlug = freelancerProfile?.slug || '';
            const ratingCount =
              typeof tracked.rating === 'number' ? Math.max(0, Math.round(tracked.rating)) : 0;

            return (
              <Card
              key={tracked.id}
              className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Freelancer Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {[freelancerProfile?.firstName, freelancerProfile?.lastName]
                              .filter(Boolean)
                              .join(' ') || 'Artist'}
                          </h3>
                          <Badge className={getStatusColor(tracked.status)}>
                            {getStatusLabel(tracked.status)}
                          </Badge>
                          {tracked.freelancer?.subscriptionPlan === 'FREELANCER_ELITE' && (
                            <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30">
                              Elite
                            </Badge>
                          )}
                          {tracked.freelancer?.subscriptionPlan === 'FREELANCER_PRO' && (
                            <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                              Pro
                            </Badge>
                          )}
                          {ratingCount > 0 && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(ratingCount, 5) }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{tracked.freelancer?.email || 'No email provided'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>Job: {tracked.job?.title}</span>
                          </div>
                          {typeof tracked.proposal?.proposedRate === 'number' && (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-400">
                                ${tracked.proposal.proposedRate}
                              </span>
                              <span>• Proposed rate</span>
                            </div>
                          )}
                          {typeof tracked.proposal?.tokenBid === 'number' && tracked.proposal.tokenBid > 0 && (
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-300" />
                              <span>
                                Bid: {tracked.proposal.tokenBid} token{tracked.proposal.tokenBid === 1 ? '' : 's'}
                              </span>
                            </div>
                          )}
                          {tracked.proposal?.aiScore !== null && tracked.proposal?.aiScore !== undefined && (
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-primary fill-primary" />
                              <span className="font-semibold text-primary">
                                AI Score: {tracked.proposal.aiScore}/100
                              </span>
                              {tracked.proposal.aiScore >= 80 && <span className="text-green-400">• Highly recommended</span>}
                              {tracked.proposal.aiScore >= 60 && tracked.proposal.aiScore < 80 && <span className="text-yellow-400">• Good match</span>}
                              {tracked.proposal.aiScore < 60 && <span className="text-orange-400">• Moderate fit</span>}
                            </div>
                          )}
                        </div>

                        {tracked.tags && tracked.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {tracked.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs bg-primary/10 text-primary border-primary/30"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {tracked.proposal?.aiAnalysis && (
                          <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                            <p className="text-xs text-primary mb-1 flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              AI Analysis:
                            </p>
                            <p className="text-sm text-slate-300">
                              {tracked.proposal.aiAnalysis}
                            </p>
                          </div>
                        )}
                        {tracked.notes && (
                          <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-xs text-slate-500 mb-1">Notes:</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                              {tracked.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <select
                      value={tracked.status}
                      onChange={(e) =>
                        updateStatusMutation.mutate({
                          id: tracked.id,
                          status: e.target.value as TrackingStatus,
                        })
                      }
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={updateStatusMutation.isPending}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedProposal(selectedProposal === tracked.id ? null : tracked.id)
                      }
                      className="text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {selectedProposal === tracked.id ? 'Hide' : 'Add'} Note
                    </Button>

                    <Link href={`/freelancers/${freelancerSlug}`}>
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Note Input */}
                {selectedProposal === tracked.id && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Label className="text-slate-300 mb-2">Add Note</Label>
                    <Textarea
                      placeholder="Add a note about this freelancer..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 mb-2"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const trimmedNote = noteText.trim();
                          if (!trimmedNote) {
                            return;
                          }
                          addNoteMutation.mutate({
                            id: tracked.id,
                            note: trimmedNote,
                          });
                        }}
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                      >
                        {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProposal(null);
                          setNoteText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
