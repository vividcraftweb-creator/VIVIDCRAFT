'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Briefcase,
  DollarSign,
  Clock,
  Calendar,
  FileText,
  Award,
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Building,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';

type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

interface Freelancer {
  id: string;
  email: string;
  Profile?: Array<{
    firstName?: string;
    lastName?: string;
    title?: string;
  }> | {
    firstName?: string;
    lastName?: string;
    title?: string;
  };
}

interface Client {
  id: string;
  email: string;
  Profile?: Array<{
    firstName?: string;
    lastName?: string;
    companyName?: string;
  }> | {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
}

interface Job {
  id: string;
  title: string;
  budget?: number;
  client?: Array<Client> | Client;
}

interface ScreeningAnswer {
  question: string;
  answer: string;
}

interface ProposalData {
  id: string;
  status: ProposalStatus;
  proposedRate: number;
  tokenBid: number;
  coverLetter?: string;
  estimatedDuration?: string;
  aiScore?: number;
  aiAnalysis?: string;
  screeningAnswers?: ScreeningAnswer[];
  createdAt: string;
  updatedAt?: string;
  freelancer?: Array<Freelancer> | Freelancer;
  job?: Array<Job> | Job;
}

interface ProposalDetailModalProps {
  proposal: ProposalData | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (proposalId: string) => void;
  onReject?: (proposalId: string) => void;
}

export default function ProposalDetailModal({
  proposal,
  isOpen,
  onClose,
  onAccept,
  onReject,
}: ProposalDetailModalProps) {
  if (!proposal) return null;

  const freelancer = Array.isArray(proposal.freelancer)
    ? proposal.freelancer[0]
    : proposal.freelancer;
  const job = Array.isArray(proposal.job)
    ? proposal.job[0]
    : proposal.job;
  const client = job && (Array.isArray(job.client)
    ? job.client[0]
    : job.client);

  const freelancerProfile = freelancer?.Profile
    ? (Array.isArray(freelancer.Profile) ? freelancer.Profile[0] : freelancer.Profile)
    : null;

  const clientProfile = client?.Profile
    ? (Array.isArray(client.Profile) ? client.Profile[0] : client.Profile)
    : null;

  const freelancerName = freelancerProfile?.firstName && freelancerProfile?.lastName
    ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`
    : freelancer?.email || 'Unknown';

  const clientName = clientProfile?.companyName ||
    (clientProfile?.firstName && clientProfile?.lastName
      ? `${clientProfile.firstName} ${clientProfile.lastName}`
      : client?.email || 'Unknown');

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

  const StatusIcon = getStatusIcon(proposal.status);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-400" />
            Proposal Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and Actions Bar */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <Badge className={`${getStatusColor(proposal.status)} text-sm px-3 py-1`}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {proposal.status}
            </Badge>

            {proposal.status === 'PENDING' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => onAccept?.(proposal.id)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Proposal
                </Button>
                <Button
                  onClick={() => onReject?.(proposal.id)}
                  size="sm"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Proposal
                </Button>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card border-white/10 bg-blue-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Proposed Rate</p>
                    <p className="text-xl font-bold text-white">${proposal.proposedRate}/hr</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 bg-purple-500/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Award className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Token Bid</p>
                    <p className="text-xl font-bold text-white">{proposal.tokenBid} tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {proposal.estimatedDuration && (
              <Card className="glass-card border-white/10 bg-green-500/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Clock className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Duration</p>
                      <p className="text-xl font-bold text-white">{proposal.estimatedDuration}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {proposal.aiScore !== undefined && proposal.aiScore !== null && (
              <Card className={`glass-card border-white/10 ${proposal.aiScore >= 80 ? 'bg-green-500/10' : proposal.aiScore >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${proposal.aiScore >= 80 ? 'bg-green-500/20' : proposal.aiScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'} rounded-lg`}>
                      <Brain className="h-5 w-5 text-current" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">AI Score</p>
                      <p className={`text-xl font-bold ${getScoreColor(proposal.aiScore)}`}>
                        {proposal.aiScore}/100
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Freelancer and Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" />
                  Freelancer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-white font-medium">{freelancerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{freelancer?.email}</span>
                </div>
                {freelancerProfile?.title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{freelancerProfile.title}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Building className="h-4 w-4 text-green-400" />
                  Client & Job
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="text-white font-medium">{clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{client?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{job?.title || 'N/A'}</span>
                </div>
                {job?.budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Budget: ${job.budget}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cover Letter */}
          {proposal.coverLetter && (
            <Card className="glass-card border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Cover Letter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {proposal.coverLetter}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {proposal.aiAnalysis && (
            <Card className="glass-card border-white/10 bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  AI Analysis
                  {proposal.aiScore !== undefined && proposal.aiScore !== null && (
                    <Badge className={getScoreBadge(proposal.aiScore)}>
                      Score: {proposal.aiScore}/100
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 leading-relaxed">{proposal.aiAnalysis}</p>
              </CardContent>
            </Card>
          )}

          {/* Screening Answers */}
          {proposal.screeningAnswers && proposal.screeningAnswers.length > 0 && (
            <Card className="glass-card border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Screening Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proposal.screeningAnswers.map((qa, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-sm font-medium text-white mb-2">Q: {qa.question}</p>
                    <p className="text-sm text-slate-300 pl-4 border-l-2 border-blue-500/50">
                      {qa.answer}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="glass-card border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-400" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Submitted</span>
                <span className="text-white">
                  {new Date(proposal.createdAt).toLocaleString()}
                </span>
              </div>
              {proposal.updatedAt && proposal.updatedAt !== proposal.createdAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="text-white">
                    {new Date(proposal.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
