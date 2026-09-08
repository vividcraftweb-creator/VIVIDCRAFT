'use client';

import { useMemo, useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, Trash2, Clock, Info, Calendar, DollarSign, MapPin, Layers, Timer, Target, Clock4 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminJobsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'PAUSED' | 'CLOSED'>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'approved' | 'pending' | 'rejected'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'budget' | 'deadline'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [selectedJob, setSelectedJob] = useState<JobEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectJob, setRejectJob] = useState<JobEntry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteJobTarget, setDeleteJobTarget] = useState<JobEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const handleStatusChange = (value: 'ALL' | 'OPEN' | 'PAUSED' | 'CLOSED') => setStatus(value);
  const handleApprovalFilterChange = (value: 'ALL' | 'approved' | 'pending' | 'rejected') => setApprovalFilter(value);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status, approvalFilter, sortBy, sortOrder, pageSize]);

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.admin.jobs.getJobs.useQuery({
    search: debouncedSearch || undefined,
    status,
    isApproved: approvalFilter,
    limit: pageSize,
    offset: page * pageSize,
    sortBy,
    sortOrder,
  });

  const { data: stats } = trpc.admin.jobs.getJobStats.useQuery();

  const approveMutation = trpc.admin.jobs.approveJob.useMutation({
    onSuccess: (updatedJob, variables) => {
      toast.success('Job approved successfully');
      refetch();
      utils.admin.jobs.getJobStats.invalidate();
      setSelectedJob((prev) => (prev && prev.id === variables.jobId ? { ...prev, isApproved: true } : prev));
    },
    onError: (error) => {
      toast.error('Failed to approve job', { description: error.message });
    },
  });

  const rejectMutation = trpc.admin.jobs.rejectJob.useMutation({
    onSuccess: (updatedJob, variables) => {
      toast.success('Job rejected');
      refetch();
      utils.admin.jobs.getJobStats.invalidate();
      setSelectedJob((prev) => (prev && prev.id === variables.jobId ? { ...prev, isApproved: false } : prev));
    },
    onError: (error) => {
      toast.error('Failed to reject job', { description: error.message });
    },
  });

  const deleteMutation = trpc.admin.jobs.deleteJob.useMutation({
    onSuccess: (_, variables) => {
      toast.success('Job deleted');
      refetch();
      utils.admin.jobs.getJobStats.invalidate();
      setSelectedJob((prev) => (prev && prev.id === variables.jobId ? null : prev));
      setDetailOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to delete job', { description: error.message });
    },
  });

  const updateJobMutation = trpc.admin.jobs.updateJob.useMutation({
    onSuccess: () => {
      toast.success('Job updated');
      refetch();
      utils.admin.jobs.getJobStats.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to update job', { description: error.message });
    },
  });

  type ClientProfile = {
    firstName?: string | null;
    lastName?: string | null;
  };

  type ClientRecord = {
    email?: string | null;
    Profile?: ClientProfile | ClientProfile[] | null;
  };

  type JobEntry = {
    id: string;
    title?: string | null;
    description?: string | null;
    status?: string | null;
    isApproved?: boolean | null;
    budget?: number | null;
    createdAt?: string | Date | null;
    client?: ClientRecord | ClientRecord[] | null;
    deadline?: string | Date | null;
    category?: string | null;
    experienceLevel?: string | null;
    projectDuration?: string | null;
    projectGoal?: string | null;
    jobType?: string | null;
    paymentType?: string | null;
    hourlyRateMin?: number | null;
    hourlyRateMax?: number | null;
    companyLocation?: string | null;
    preferredLocations?: unknown;
    screeningQuestions?: unknown;
    tags?: string | null;
  };

  const jobs = useMemo<JobEntry[]>(() => (Array.isArray(data?.jobs) ? data.jobs as JobEntry[] : []), [data?.jobs]);
  const totalJobs = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const startItem = totalJobs === 0 ? 0 : page * pageSize + 1;
  const endItem = totalJobs === 0 ? 0 : Math.min(totalJobs, page * pageSize + jobs.length);

  const parseStringList = (value: string | null | undefined): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
            return item.name;
          }
          return String(item ?? '').trim();
        }).filter(Boolean);
      }
    } catch {
      // fall back to comma separation below
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const parseUnknownList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            if ('question' in item && typeof (item as { question?: unknown }).question === 'string') {
              return (item as { question: string }).question;
            }
            if ('text' in item && typeof (item as { text?: unknown }).text === 'string') {
              return (item as { text: string }).text;
            }
            if ('name' in item && typeof (item as { name?: unknown }).name === 'string') {
              return (item as { name: string }).name;
            }
          }
          return '';
        })
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parseUnknownList(parsed);
      } catch {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const selectedJobTags = selectedJob ? parseStringList(selectedJob.tags) : [];
  const selectedJobPreferredLocations = selectedJob ? parseUnknownList(selectedJob.preferredLocations) : [];
  const selectedJobScreeningQuestions = selectedJob ? parseUnknownList(selectedJob.screeningQuestions) : [];

  useEffect(() => {
    if (page > 0 && jobs.length === 0 && totalJobs > 0) {
      setPage((prev) => Math.max(prev - 1, 0));
    }
  }, [jobs.length, totalJobs, page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Job Moderation</h1>
        <p className="text-slate-400 mt-1">Review, approve, and manage job postings</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-blue-400 font-medium">Total Jobs</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.totalJobs}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-green-400 font-medium">Open</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.openJobs}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-red-400 font-medium">Closed</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.closedJobs}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-yellow-400 font-medium">Pending</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.pendingApproval}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-green-400 font-medium">Approved</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.approvedJobs}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-4">
              <div className="text-xs text-red-400 font-medium">Rejected</div>
              <div className="text-2xl font-bold text-white mt-1">{stats.rejectedJobs}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={handleApprovalFilterChange}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-400">
            {totalJobs === 0 ? 'No jobs found' : `Showing ${startItem}-${endItem} of ${totalJobs} job${totalJobs === 1 ? '' : 's'}`}
          </div>
          <div className="flex flex-wrap gap-2 sm:items-center">
            <Select value={`${pageSize}`} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[140px] bg-slate-950 border-slate-800 text-white text-sm">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'createdAt' | 'budget' | 'deadline') => setSortBy(value)}>
              <SelectTrigger className="w-[150px] bg-slate-950 border-slate-800 text-white text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="createdAt">Created Date</SelectItem>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-[120px] bg-slate-950 border-slate-800 text-white text-sm">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-400 min-w-[80px] text-center">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((prev) => prev + 1)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-8 text-center text-slate-400">Loading jobs...</CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
            <CardContent className="p-8 text-center text-slate-400">No jobs found</CardContent>
          </Card>
        ) : (
          jobs.map((job) => {
            const clientCollection = job.client;
            const client = Array.isArray(clientCollection) ? clientCollection[0] : clientCollection;
            const profileData = client?.Profile;
            const profile = Array.isArray(profileData) ? profileData[0] : profileData ?? null;

            return (
              <Card key={job.id} className="bg-slate-900/80 border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{job.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge className="bg-blue-500/20 text-blue-300">
                              ${job.budget !== undefined && job.budget !== null ? job.budget.toLocaleString() : 'N/A'}
                            </Badge>
                            <Badge className={job.status === 'OPEN' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                              {job.status}
                            </Badge>
                            {job.category && (
                              <Badge className="bg-purple-500/20 text-purple-200">
                                {job.category}
                              </Badge>
                            )}
                            {job.experienceLevel && (
                              <Badge className="bg-teal-500/20 text-teal-200">
                                {job.experienceLevel}
                              </Badge>
                            )}
                            {parseStringList(job.tags).slice(0, 3).map((tag) => (
                              <Badge key={`${job.id}-${tag}`} className="bg-white/10 text-slate-200 border border-white/10">
                                {tag}
                              </Badge>
                            ))}
                            {job.isApproved === true && (
                              <Badge className="bg-green-500/20 text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {job.isApproved === false && (
                              <Badge className="bg-red-500/20 text-red-300">
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            {job.isApproved === null && (
                              <Badge className="bg-yellow-500/20 text-yellow-300">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending Review
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Posted by {profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || client?.email : client?.email || 'Unknown client'} • {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-slate-300 hover:bg-white/5"
                        onClick={() => {
                          setSelectedJob(job);
                          setDetailOpen(true);
                        }}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {job.isApproved === null && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ jobId: job.id })}
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {approveMutation.isPending ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectJob(job);
                              setRejectReason('');
                            }}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeleteJobTarget(job);
                          setDeleteReason('');
                        }}
                        className="border-white/10 text-slate-300 hover:bg-white/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={detailOpen && Boolean(selectedJob)}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedJob(null);
          }
        }}
      >
        {selectedJob && (
          <DialogContent className="bg-slate-950/95 border-white/10 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white">{selectedJob.title}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Posted on {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString() : 'Unknown date'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 text-slate-300">
                <DollarSign className="h-4 w-4 mt-1 text-blue-300" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Budget</p>
                  <p className="text-sm font-semibold text-white">${selectedJob.budget !== undefined && selectedJob.budget !== null ? selectedJob.budget.toLocaleString() : 'N/A'}</p>
                  {selectedJob.paymentType && (
                    <p className="text-xs text-slate-400 mt-1">{selectedJob.paymentType}</p>
                  )}
                  {selectedJob.hourlyRateMin && selectedJob.hourlyRateMax && (
                    <p className="text-xs text-slate-400">Hourly range: ${selectedJob.hourlyRateMin}-{selectedJob.hourlyRateMax}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 text-slate-300">
                <Calendar className="h-4 w-4 mt-1 text-teal-300" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Deadline</p>
                  <p className="text-sm font-semibold text-white">{selectedJob.deadline ? new Date(selectedJob.deadline).toLocaleDateString() : 'Not set'}</p>
                  {selectedJob.projectDuration && (
                    <p className="text-xs text-slate-400 mt-1">Duration: {selectedJob.projectDuration}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 text-slate-300">
                <Layers className="h-4 w-4 mt-1 text-purple-300" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Category</p>
                  <p className="text-sm font-semibold text-white">{selectedJob.category || 'N/A'}</p>
                  {selectedJob.experienceLevel && (
                    <p className="text-xs text-slate-400 mt-1">Experience: {selectedJob.experienceLevel}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 text-slate-300">
                <MapPin className="h-4 w-4 mt-1 text-emerald-300" />
                <div>
                  <p className="text-xs uppercase text-slate-500">Location</p>
                  <p className="text-sm font-semibold text-white">{selectedJob.companyLocation || 'Remote / Not specified'}</p>
                  {selectedJobPreferredLocations.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Preferred: {selectedJobPreferredLocations.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Label className="text-xs uppercase text-slate-500">Job Description</Label>
              <div className="max-h-64 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-200 whitespace-pre-line">
                {selectedJob.description || 'No description provided.'}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mt-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-500 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-cyan-300" /> Project Goal
                </Label>
                <p className="text-sm text-slate-200 bg-white/5 border border-white/10 rounded-md p-3 min-h-[52px]">
                  {selectedJob.projectGoal || 'Not provided'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-slate-500 flex items-center gap-2">
                  <Target className="h-4 w-4 text-pink-300" /> Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedJobTags.length > 0 ? (
                    selectedJobTags.map((tag) => (
                      <Badge key={tag} className="bg-white/10 border border-white/10 text-slate-200">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">No tags</span>
                  )}
                </div>
              </div>
            </div>

            {selectedJobScreeningQuestions.length > 0 && (
              <div className="mt-6 space-y-2">
                <Label className="text-xs uppercase text-slate-500 flex items-center gap-2">
                  <Clock4 className="h-4 w-4 text-yellow-300" /> Screening Questions
                </Label>
                <ul className="space-y-2 text-sm text-slate-200 bg-white/5 border border-white/10 rounded-md p-3">
                  {selectedJobScreeningQuestions.map((question, index) => (
                    <li key={`${question}-${index}`} className="flex gap-2">
                      <span className="text-slate-500">{index + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter className="mt-6">
              <div className="flex flex-col gap-3 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={selectedJob.status ?? 'OPEN'}
                    onValueChange={(value: 'OPEN' | 'PAUSED' | 'CLOSED') => {
                      updateJobMutation.mutate({ jobId: selectedJob.id, status: value });
                      setSelectedJob((prev) => (prev ? { ...prev, status: value } : prev));
                    }}
                    disabled={updateJobMutation.isPending}
                  >
                    <SelectTrigger className="w-[190px] bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedJob.isApproved === null && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMutation.mutate({ jobId: selectedJob.id })}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectJob(selectedJob);
                          setRejectReason('');
                        }}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <AlertDialog open={Boolean(rejectJob)} onOpenChange={(open) => {
        if (!open) {
          setRejectJob(null);
          setRejectReason('');
        }
      }}>
        <AlertDialogContent className="bg-slate-950/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject job posting</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a short reason the client will see in their notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Reason for rejection"
            className="bg-white/5 border-white/10 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (!rejectJob) return;
                const reason = rejectReason.trim() || 'No reason provided';
                rejectMutation.mutate({ jobId: rejectJob.id, reason });
                setRejectJob(null);
                setRejectReason('');
              }}
            >
              Reject Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteJobTarget)} onOpenChange={(open) => {
        if (!open) {
          setDeleteJobTarget(null);
          setDeleteReason('');
        }
      }}>
        <AlertDialogContent className="bg-slate-950/95 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job posting</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The client will be notified with the reason below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            placeholder="Reason for deletion"
            className="bg-white/5 border-white/10 text-white"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteJobTarget) return;
                const reason = deleteReason.trim() || 'Removed by admin';
                deleteMutation.mutate({ jobId: deleteJobTarget.id, reason });
                setDeleteJobTarget(null);
                setDeleteReason('');
              }}
            >
              Delete Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
