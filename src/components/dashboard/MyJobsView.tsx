'use client';

import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Eye,
  Mail,
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Loader2,
  AlertCircle,
  HelpCircle,
  Award,
  Brain,
} from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { analytics } from '@/utils/analytics';
import ScheduleInterviewModal from '@/components/interviews/ScheduleInterviewModal';

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

type Proposal = {
  id: string;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  status: ProposalStatus;
  createdAt: string;
  experience?: string | null;
  approach?: string | null;
  portfolioLinks?: string[] | null;
  availability?: string | null;
  milestones?: string | null;
  whyMe?: string | null;
  questionsOrConcerns?: string | null;
  screeningAnswers?: Array<{
    question: string;
    answer: string;
  }> | null;
  tokenBid?: number | null;
  aiScore?: number | null;
  aiAnalysis?: string | null;
  freelancer?: {
    id: string;
    email: string;
    Profile?: Array<{
      firstName?: string | null;
      lastName?: string | null;
      title?: string | null;
      bio?: string | null;
      skills?: string[] | null;
      profilePicture?: string | null;
    }> | null;
  };
};

export default function MyJobsView() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiScoreFilter, setAiScoreFilter] = useState<string>('all');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [proposalPages, setProposalPages] = useState<{ [jobId: string]: number }>({});
  const [expandedProposalsJobIds, setExpandedProposalsJobIds] = useState<Set<string>>(new Set());
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewData, setInterviewData] = useState<{
    freelancerId: string;
    freelancerName: string;
    jobId: string;
    jobTitle: string;
    proposalId: string;
  } | null>(null);

  const { data: jobs, isLoading, refetch } = trpc.jobs.getJobsForClient.useQuery();
  const acceptProposal = trpc.proposals.acceptProposal.useMutation();
  const declineProposal = trpc.proposals.declineProposal.useMutation();
  const reopenJob = trpc.jobs.reopenJob.useMutation();

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs.map(job => {
      // Filter by job status
      if (statusFilter !== 'all' && job.status !== statusFilter.toUpperCase()) {
        return null;
      }

      // Filter proposals by AI score
      let filteredProposals = job.proposals || [];

      if (aiScoreFilter !== 'all') {
        filteredProposals = filteredProposals.filter((proposal: Proposal) => {
          const score = proposal.aiScore;

          switch (aiScoreFilter) {
            case '80+':
              return score !== null && score !== undefined && score >= 80;
            case '70+':
              return score !== null && score !== undefined && score >= 70;
            case '60+':
              return score !== null && score !== undefined && score >= 60;
            case 'with-ai':
              return score !== null && score !== undefined;
            default:
              return true;
          }
        });
      }

      return {
        ...job,
        proposals: filteredProposals,
      };
    }).filter(Boolean) as typeof jobs;
  }, [jobs, statusFilter, aiScoreFilter]);

  // Auto-expand first job with proposals
  useEffect(() => {
    if (filteredJobs.length > 0 && !expandedJobId) {
      const firstJobWithProposals = filteredJobs.find(job => job.proposals && job.proposals.length > 0);
      if (firstJobWithProposals) {
        setExpandedJobId(firstJobWithProposals.id);
      }
    }
  }, [filteredJobs, expandedJobId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Open</Badge>;
      case 'CLOSED':
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Closed</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Paused</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{status}</Badge>;
    }
  };

  const getProposalStatusBadge = (status: ProposalStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
    }
  };

  const getAiScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 70) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (score >= 60) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const toggleProposalsExpansion = (jobId: string) => {
    setExpandedProposalsJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const getFreelancerName = (freelancer: Proposal['freelancer']) => {
    if (!freelancer) return 'Unknown Freelancer';

    const profile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }

    return freelancer.email || 'Unknown Freelancer';
  };

  const getFreelancerTitle = (freelancer: Proposal['freelancer']) => {
    if (!freelancer) return null;

    const profile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
    return profile?.title || null;
  };

  const getFreelancerBio = (freelancer: Proposal['freelancer']) => {
    if (!freelancer) return null;

    const profile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
    return profile?.bio || null;
  };

  const getFreelancerSkills = (freelancer: Proposal['freelancer']) => {
    if (!freelancer) return [];

    const profile = Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile;
    const skills = profile?.skills;

    // Ensure we always return an array
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;

    // If skills is a string or other type, return empty array
    return [];
  };

  // Parse proposal sections from cover letter
  const parseProposalSections = (coverLetter: string) => {
    const sections: { [key: string]: string } = {};
    const sectionRegex = /\*\*\s*([A-Z\s]+)\s*\*\*/g;

    let lastIndex = 0;
    let lastSection = 'intro';
    let match;

    while ((match = sectionRegex.exec(coverLetter)) !== null) {
      const sectionContent = coverLetter.substring(lastIndex, match.index).trim();
      if (sectionContent && lastSection) {
        sections[lastSection] = sectionContent;
      }
      lastSection = match[1].trim().toLowerCase();
      lastIndex = match.index + match[0].length;
    }

    // Get remaining content
    const finalContent = coverLetter.substring(lastIndex).trim();
    if (finalContent && lastSection) {
      sections[lastSection] = finalContent;
    }

    return sections;
  };

  // Clean proposal preview text
  const getCleanPreview = (coverLetter: string, maxLength: number = 150) => {
    // Remove markdown section markers
    let cleaned = coverLetter.replace(/\*\*\s*([A-Z\s]+)\s*\*\*/g, '');
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Truncate to maxLength
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength) + '...';
    }
    return cleaned;
  };

  // Pagination helpers
  const getProposalPage = (jobId: string) => proposalPages[jobId] || 1;
  const setProposalPage = (jobId: string, page: number) => {
    setProposalPages(prev => ({ ...prev, [jobId]: page }));
  };

  // Action handlers
  const handleAcceptProposal = async (proposalId: string) => {
    setActionMessage(null);
    try {
      await acceptProposal.mutateAsync({ proposalId });

      // Track proposal accepted event
      analytics.proposalAccepted(proposalId);

      setActionMessage({
        type: 'success',
        text: 'Proposal accepted successfully! The freelancer has been notified.'
      });
      setTimeout(() => {
        setSelectedProposal(null);
        setActionMessage(null);
      }, 2000);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept proposal. Please try again.';
      setActionMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  const handleDeclineProposal = async (proposalId: string) => {
    setActionMessage(null);
    try {
      await declineProposal.mutateAsync({ proposalId });
      setActionMessage({
        type: 'success',
        text: 'Proposal declined. The freelancer has been notified.'
      });
      setTimeout(() => {
        setSelectedProposal(null);
        setActionMessage(null);
      }, 2000);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to decline proposal. Please try again.';
      setActionMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  const handleSendMessage = (freelancerId: string, jobId?: string, proposalId?: string) => {
    setSelectedProposal(null); // Close modal first
    setTimeout(() => {
      let url = `/dashboard?tab=messages&userId=${freelancerId}`;
      if (jobId) url += `&jobId=${jobId}`;
      if (proposalId) url += `&proposalId=${proposalId}`;
      window.location.href = url;
    }, 100);
  };

  const handleScheduleInterview = (freelancerId: string, freelancerName: string, jobId: string, jobTitle: string, proposalId: string) => {
    setInterviewData({
      freelancerId,
      freelancerName,
      jobId,
      jobTitle,
      proposalId
    });
    setInterviewModalOpen(true);
  };

  const handleViewProfile = (freelancerId: string) => {
    setSelectedProposal(null); // Close modal first
    setTimeout(() => {
      window.location.href = `/freelancers/${freelancerId}`;
    }, 100);
  };

  const handleReopenJob = async (jobId: string) => {
    setActionMessage(null);
    try {
      await reopenJob.mutateAsync({ jobId });
      setActionMessage({
        type: 'success',
        text: 'Job reopened successfully! It is now visible to freelancers again.'
      });
      setTimeout(() => {
        setActionMessage(null);
      }, 3000);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reopen job. Please try again.';
      setActionMessage({
        type: 'error',
        text: errorMessage
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-32 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-32 bg-white/10 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-primary" />
            My Jobs
          </h2>
          <p className="text-slate-400 mt-2">
            Manage your job postings and review proposals from freelancers
          </p>
        </div>
        <Link href="/jobs/create">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card bg-white/5 border-white/10 p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="text-sm text-slate-400 font-medium">Filter by Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all" className="text-white">All Jobs</SelectItem>
              <SelectItem value="open" className="text-white">Open</SelectItem>
              <SelectItem value="closed" className="text-white">Closed</SelectItem>
              <SelectItem value="paused" className="text-white">Paused</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <span className="text-sm text-slate-400 font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Score:
          </span>
          <Select value={aiScoreFilter} onValueChange={setAiScoreFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all" className="text-white">All Scores</SelectItem>
              <SelectItem value="80+" className="text-white">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  80+ (Excellent)
                </span>
              </SelectItem>
              <SelectItem value="70+" className="text-white">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  70+ (Good)
                </span>
              </SelectItem>
              <SelectItem value="60+" className="text-white">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  60+ (Qualified)
                </span>
              </SelectItem>
              <SelectItem value="with-ai" className="text-white">
                <span className="flex items-center gap-2">
                  <Brain className="h-3 w-3" />
                  With AI Analysis
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm text-slate-400">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
          </span>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && !selectedProposal && (
        <Alert className={actionMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
          <AlertCircle className={`h-4 w-4 ${actionMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`} />
          <AlertDescription className={actionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
            {actionMessage.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card className="glass-card bg-white/5 border-white/10 text-center py-12">
            <CardContent className="space-y-4">
              <Briefcase className="h-16 w-16 text-slate-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
                <p className="text-slate-400 mb-6">
                  {statusFilter === 'all'
                    ? "You haven't posted any jobs yet. Create your first job to start receiving proposals!"
                    : `No ${statusFilter} jobs found. Try adjusting your filter.`}
                </p>
                {statusFilter === 'all' && (
                  <Link href="/jobs/create">
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Job
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const proposals = job.proposals || [];
            const pendingProposals = proposals.filter((p: Proposal) => p.status === 'PENDING');
            const acceptedProposals = proposals.filter((p: Proposal) => p.status === 'ACCEPTED');
            const isExpanded = expandedJobId === job.id;

            return (
              <Card key={job.id} className="glass-card bg-white/5 border-white/10 hover:border-white/20 transition-all">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 bg-primary/20 rounded-lg mt-1">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-white text-xl mb-2">{job.title}</CardTitle>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${job.budget}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Posted {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                            {getStatusBadge(job.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.status === 'CLOSED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                          onClick={() => handleReopenJob(job.id)}
                          disabled={reopenJob.isPending}
                        >
                          {reopenJob.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Reopen Job
                        </Button>
                      )}
                      <Link href={`/jobs/${job.slug || job.id}`}>
                        <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10">
                          <Eye className="h-4 w-4 mr-2" />
                          View Job
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Closed Job Alert */}
                  {job.status === 'CLOSED' && (
                    <Alert className="bg-gray-500/10 border-gray-500/30">
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                      <AlertDescription className="text-gray-300">
                        This job is currently closed and not visible to freelancers. A candidate has been accepted for this position. You can reopen it if you need to accept additional candidates.
                      </AlertDescription>
                    </Alert>
                  )}
                  {/* Proposal Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass-card bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Total Proposals</p>
                          <p className="text-2xl font-bold text-white">{proposals.length}</p>
                        </div>
                        <Mail className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                    <div className="glass-card bg-white/5 p-4 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Pending Review</p>
                          <p className="text-2xl font-bold text-yellow-300">{pendingProposals.length}</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-400" />
                      </div>
                    </div>
                    <div className="glass-card bg-white/5 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Accepted</p>
                          <p className="text-2xl font-bold text-green-300">{acceptedProposals.length}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      </div>
                    </div>
                  </div>

                  {/* Proposals List - Always Visible */}
                  {proposals.length > 0 && (
                    <>
                      <div className="space-y-3 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Submitted Proposals
                          </h4>
                          {!isExpanded && proposals.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:bg-primary/10"
                              onClick={() => toggleJobExpansion(job.id)}
                            >
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Collapse
                            </Button>
                          )}
                        </div>

                        {(() => {
                          const isProposalsExpanded = expandedProposalsJobIds.has(job.id);
                          const MAX_INITIAL_PROPOSALS = 3;
                          const PROPOSALS_PER_PAGE = 10;

                          // Determine which proposals to show
                          let displayProposals: Proposal[];
                          if (!isProposalsExpanded && proposals.length > MAX_INITIAL_PROPOSALS) {
                            // Show only first 3 if not expanded
                            displayProposals = proposals.slice(0, MAX_INITIAL_PROPOSALS);
                          } else if (isProposalsExpanded) {
                            // Show paginated proposals when expanded
                            const currentPage = getProposalPage(job.id);
                            const startIndex = (currentPage - 1) * PROPOSALS_PER_PAGE;
                            const endIndex = startIndex + PROPOSALS_PER_PAGE;
                            displayProposals = proposals.slice(startIndex, endIndex);
                          } else {
                            // Show all if 3 or fewer
                            displayProposals = proposals;
                          }

                          const totalPages = Math.ceil(proposals.length / PROPOSALS_PER_PAGE);
                          const currentPage = getProposalPage(job.id);

                          return (
                            <>
                              {displayProposals.map((proposal: Proposal) => {
                                const freelancerSkills = getFreelancerSkills(proposal.freelancer);

                                return (
                                  <div key={proposal.id} className="glass-card bg-white/5 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                      <div className="flex-1 space-y-3">
                                        {/* Freelancer Header */}
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-primary/30 flex items-center justify-center text-lg font-bold border-2 border-primary/50">
                                              {getFreelancerName(proposal.freelancer).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <h5 className="text-white font-semibold flex items-center gap-2">
                                                {getFreelancerName(proposal.freelancer)}

                                                {proposal.aiScore !== null && proposal.aiScore !== undefined && (
                                                  <Badge className={`${getAiScoreBadgeColor(proposal.aiScore)} text-xs`}>
                                                    <Brain className="h-3 w-3 mr-1" />
                                                    {proposal.aiScore}
                                                  </Badge>
                                                )}
                                              </h5>
                                              {getFreelancerTitle(proposal.freelancer) && (
                                                <p className="text-sm text-slate-400">{getFreelancerTitle(proposal.freelancer)}</p>
                                              )}
                                            </div>
                                          </div>
                                          {getProposalStatusBadge(proposal.status)}
                                        </div>

                                        {/* Skills Tags */}
                                        {freelancerSkills.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                            {freelancerSkills.slice(0, 5).map((skill, idx) => (
                                              <Badge key={idx} className="bg-primary/10 text-primary border-primary/20 text-xs">
                                                {skill}
                                              </Badge>
                                            ))}
                                            {freelancerSkills.length > 5 && (
                                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                                +{freelancerSkills.length - 5} more
                                              </Badge>
                                            )}
                                          </div>
                                        )}

                                        {/* Clean Preview */}
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                          {getCleanPreview(proposal.coverLetter, 200)}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                          <span className="flex items-center gap-1 text-green-400 font-semibold">
                                            <DollarSign className="h-4 w-4" />
                                            ${proposal.proposedRate}
                                          </span>
                                          <span className="flex items-center gap-1 text-blue-400">
                                            <Clock className="h-4 w-4" />
                                            {proposal.timeline}
                                          </span>
                                          <span className="flex items-center gap-1 text-slate-400">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(proposal.createdAt).toLocaleDateString()}
                                          </span>
                                          {proposal.screeningAnswers && proposal.screeningAnswers.length > 0 && (
                                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                              <HelpCircle className="h-3 w-3 mr-1" />
                                              {proposal.screeningAnswers.length} screening {proposal.screeningAnswers.length === 1 ? 'answer' : 'answers'}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                                          onClick={() => setSelectedProposal(proposal)}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Show All Button */}
                              {!isProposalsExpanded && proposals.length > MAX_INITIAL_PROPOSALS && (
                                <div className="pt-4 border-t border-white/10 flex items-center justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-primary/30 text-primary hover:bg-primary/10"
                                    onClick={() => toggleProposalsExpansion(job.id)}
                                  >
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                    Show All {proposals.length} Proposals
                                  </Button>
                                </div>
                              )}

                              {/* Show Less Button */}
                              {isProposalsExpanded && proposals.length > MAX_INITIAL_PROPOSALS && (
                                <div className="pt-4 border-t border-white/10 flex items-center justify-center">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-white/10 text-white hover:bg-white/10"
                                    onClick={() => toggleProposalsExpansion(job.id)}
                                  >
                                    <ChevronUp className="h-4 w-4 mr-2" />
                                    Show Less
                                  </Button>
                                </div>
                              )}

                              {/* Pagination - Only show when expanded and there are more than PROPOSALS_PER_PAGE */}
                              {isProposalsExpanded && totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                  <p className="text-sm text-slate-400">
                                    Showing {((currentPage - 1) * PROPOSALS_PER_PAGE) + 1}-{Math.min(currentPage * PROPOSALS_PER_PAGE, proposals.length)} of {proposals.length} proposals
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-white/10 text-white hover:bg-white/10"
                                      onClick={() => setProposalPage(job.id, currentPage - 1)}
                                      disabled={currentPage === 1}
                                    >
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Previous
                                    </Button>
                                    <span className="text-sm text-slate-300 px-3">
                                      Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-white/10 text-white hover:bg-white/10"
                                      onClick={() => setProposalPage(job.id, currentPage + 1)}
                                      disabled={currentPage === totalPages}
                                    >
                                      Next
                                      <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}

                  {proposals.length === 0 && (
                    <div className="text-center py-6 text-slate-400">
                      <Mail className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm">No proposals received yet for this job.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Proposal Details Modal - Enhanced */}
      <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white !w-[95vw] sm:!w-[90vw] md:!w-[85vw] lg:!w-[80vw] !max-w-[1400px] h-[95vh] overflow-hidden p-0" showCloseButton={false}>
          {selectedProposal && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Proposal from {getFreelancerName(selectedProposal.freelancer)}</DialogTitle>
                <DialogDescription>
                  Review proposal details and take action on this freelancer application
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col h-[95vh]">
                {/* Header - Fixed */}
                <div className="border-b border-white/10 p-6 bg-slate-900/95 backdrop-blur-sm flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-16 w-16 rounded-full bg-primary/30 flex items-center justify-center text-2xl font-bold border-2 border-primary/50">
                        {getFreelancerName(selectedProposal.freelancer).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-1">
                          {getFreelancerName(selectedProposal.freelancer)}
                        </h2>
                        {getFreelancerTitle(selectedProposal.freelancer) && (
                          <p className="text-slate-400 mb-2">{getFreelancerTitle(selectedProposal.freelancer)}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="h-4 w-4" />
                            Submitted {new Date(selectedProposal.createdAt).toLocaleDateString()}
                          </span>
                          {getProposalStatusBadge(selectedProposal.status)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProposal(null)}
                      className="text-slate-400 hover:text-white transition-colors"
                      aria-label="Close modal"
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                  {/* Left Column - Proposal Details (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass-card bg-green-500/10 p-5 rounded-xl border border-green-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-green-200">Proposed Rate</p>
                          <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">${selectedProposal.proposedRate}</p>
                        <p className="text-xs text-green-300 mt-1">Per project</p>
                      </div>
                      <div className="glass-card bg-blue-500/10 p-5 rounded-xl border border-blue-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-200">Timeline</p>
                          <Clock className="h-5 w-5 text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{selectedProposal.timeline}</p>
                        <p className="text-xs text-blue-300 mt-1">Estimated duration</p>
                      </div>
                    </div>

                    {/* Parsed Proposal Sections */}
                    {(() => {
                      const sections = parseProposalSections(selectedProposal.coverLetter);

                      return (
                        <>
                          {/* Cover Letter / Introduction */}
                          {sections.intro && (
                            <Card className="glass-card bg-white/5 border-white/10">
                              <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-primary" />
                                  Cover Letter
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {sections.intro}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Experience Section */}
                          {sections.experience && (
                            <Card className="glass-card bg-white/5 border-white/10">
                              <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <Briefcase className="h-5 w-5 text-amber-400" />
                                  Relevant Experience
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {sections.experience}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Approach Section */}
                          {sections.approach && (
                            <Card className="glass-card bg-white/5 border-white/10">
                              <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <FileText className="h-5 w-5 text-cyan-400" />
                                  Proposed Approach
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {sections.approach}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Timeline Section */}
                          {sections.timeline && (
                            <Card className="glass-card bg-white/5 border-white/10">
                              <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-blue-400" />
                                  Project Timeline
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {sections.timeline}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Availability Section */}
                          {sections.availability && (
                            <Card className="glass-card bg-white/5 border-white/10">
                              <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                  <Calendar className="h-5 w-5 text-purple-400" />
                                  Availability
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {sections.availability}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </>
                      );
                    })()}

                    {/* Additional Experience (if separate from cover letter) */}
                    {selectedProposal.experience && !selectedProposal.coverLetter.includes('** EXPERIENCE **') && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-amber-400" />
                            Additional Experience
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedProposal.experience}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Additional Approach (if separate from cover letter) */}
                    {selectedProposal.approach && !selectedProposal.coverLetter.includes('** APPROACH **') && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <FileText className="h-5 w-5 text-cyan-400" />
                            Additional Approach Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedProposal.approach}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Portfolio Links */}
                    {(() => {
                      const links = selectedProposal.portfolioLinks;
                      return Array.isArray(links) && links.length > 0 && (
                        <Card className="glass-card bg-white/5 border-white/10">
                          <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                              <Eye className="h-5 w-5 text-primary" />
                              Portfolio & Work Samples
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {links.filter(Boolean).map((link, idx) => (
                                <a
                                  key={idx}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/30 transition-all"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="truncate">{link}</span>
                                </a>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Milestones */}
                    {selectedProposal.milestones && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            Proposed Milestones
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedProposal.milestones}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Why Choose Me */}
                    {selectedProposal.whyMe && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Why Choose Me
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedProposal.whyMe}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Questions or Concerns */}
                    {selectedProposal.questionsOrConcerns && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Questions or Concerns
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {selectedProposal.questionsOrConcerns}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Screening Questions */}
                    {selectedProposal.screeningAnswers && Array.isArray(selectedProposal.screeningAnswers) && selectedProposal.screeningAnswers.length > 0 && (
                      <Card className="glass-card bg-white/5 border-white/10">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-indigo-400" />
                            Screening Questions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {selectedProposal.screeningAnswers.map((qa, idx) => (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <span className="text-indigo-400 font-bold text-sm mt-1">Q{idx + 1}.</span>
                                  <p className="text-slate-200 font-medium flex-1">{qa.question}</p>
                                </div>
                                <div className="flex items-start gap-2 pl-6">
                                  <span className="text-green-400 font-bold text-sm mt-1">A:</span>
                                  <p className="text-slate-300 leading-relaxed flex-1 whitespace-pre-wrap">{qa.answer}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}


                  </div>

                  {/* Right Column - Freelancer Info & Actions (1/3 width) */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Freelancer Profile Card */}
                    <Card className="glass-card bg-primary/10 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">Freelancer Profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Bio */}
                        {getFreelancerBio(selectedProposal.freelancer) && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">About</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {getFreelancerBio(selectedProposal.freelancer)}
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        {(() => {
                          const skills = getFreelancerSkills(selectedProposal.freelancer);
                          return Array.isArray(skills) && skills.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {skills.map((skill, idx) => (
                                  <Badge key={idx} className="bg-primary/20 text-primary border-primary/30 text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Availability */}
                        {selectedProposal.availability && (
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Availability</p>
                            <p className="text-sm text-slate-300">{selectedProposal.availability}</p>
                          </div>
                        )}

                        {/* Contact Info */}
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Contact</p>
                          <p className="text-sm text-slate-300 break-all">
                            {selectedProposal.freelancer?.email || 'N/A'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions Card */}
                    <Card className="glass-card bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-lg text-white">Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Action Message Alert */}
                        {actionMessage && (
                          <Alert className={actionMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
                            <AlertCircle className={`h-4 w-4 ${actionMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`} />
                            <AlertDescription className={actionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                              {actionMessage.text}
                            </AlertDescription>
                          </Alert>
                        )}

                        {selectedProposal.status === 'PENDING' && (
                          <>
                            <Button
                              className="w-full bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 justify-start"
                              onClick={() => handleAcceptProposal(selectedProposal.id)}
                              disabled={acceptProposal.isPending}
                            >
                              {acceptProposal.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Accept Proposal
                            </Button>
                            <Button
                              className="w-full bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 justify-start"
                              onClick={() => handleDeclineProposal(selectedProposal.id)}
                              disabled={declineProposal.isPending}
                            >
                              {declineProposal.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Decline Proposal
                            </Button>
                          </>
                        )}
                        <Button
                          className="w-full bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 justify-start"
                          onClick={() => {
                            const job = jobs?.find(j => j.proposals?.some((p: Proposal) => p.id === selectedProposal.id));
                            handleSendMessage(
                              selectedProposal.freelancer?.id || '',
                              job?.id,
                              selectedProposal.id
                            );
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                        <Button
                          className="w-full bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 justify-start"
                          onClick={() => {
                            // Find the job this proposal belongs to
                            const job = jobs?.find(j => j.proposals?.some((p: Proposal) => p.id === selectedProposal.id));
                            if (job && selectedProposal.freelancer) {
                              const freelancerProfile = Array.isArray(selectedProposal.freelancer.Profile)
                                ? selectedProposal.freelancer.Profile[0]
                                : selectedProposal.freelancer.Profile;
                              const freelancerName = freelancerProfile
                                ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
                                : selectedProposal.freelancer.email;

                              handleScheduleInterview(
                                selectedProposal.freelancer.id,
                                freelancerName,
                                job.id,
                                job.title,
                                selectedProposal.id
                              );
                            }
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule Interview
                        </Button>
                        <Button
                          className="w-full bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 justify-start"
                          onClick={() => handleViewProfile(selectedProposal.freelancer?.id || '')}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Full Profile
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Next Steps Guide */}
                    <Card className="glass-card bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-sm text-white">Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-xs text-slate-400">
                          <div className="flex items-start gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-primary font-bold text-xs">1</span>
                            </div>
                            <p>Review the proposal details and freelancer profile</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-primary font-bold text-xs">2</span>
                            </div>
                            <p>Message the freelancer to discuss project details</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-primary font-bold text-xs">3</span>
                            </div>
                            <p>Schedule an interview to assess fit</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-primary font-bold text-xs">4</span>
                            </div>
                            <p>Accept the proposal and start the project</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Interview Scheduling Modal */}
      {interviewData && (
        <ScheduleInterviewModal
          open={interviewModalOpen}
          onOpenChange={(open) => {
            setInterviewModalOpen(open);
            if (!open) {
              setInterviewData(null);
            }
          }}
          freelancerId={interviewData.freelancerId}
          freelancerName={interviewData.freelancerName}
          jobId={interviewData.jobId}
          jobTitle={interviewData.jobTitle}
          proposalId={interviewData.proposalId}
        />
      )}
    </div>
  );
}
