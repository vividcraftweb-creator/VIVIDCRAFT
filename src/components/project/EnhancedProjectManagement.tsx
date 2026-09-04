'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { MAX_FILE_SIZE_MB, isValidFileSize, getFileSizeErrorMessage, formatFileSize } from '@/lib/constants/file-upload';
import { toast } from 'sonner';
import {
  FolderOpen,
  Plus,
  Crown,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Download,
  Share2,
  BarChart3,
  Flag,
  User,
  Edit3,
  Target,
  Activity,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCalendarDateToISO, parseISOToCalendarDate, getTodayCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  completedAt?: string;
  attachments: number;
}

interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  category: 'design' | 'document' | 'code' | 'other';
}

interface MilestoneFormState {
  title: string;
  description: string;
  dueDate: DateValue | null;
  priority: Milestone['priority'];
  status: Milestone['status'];
}

interface ProjectMilestoneRecord {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status?: string | null;
  priority?: string | null;
  assignedToUser?: {
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
  completedAt?: string | null;
}

interface ProjectFileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  category?: string | null;
  uploader?: {
    email?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  } | null;
}

interface ProjectActivityRecord {
  id: string;
  description: string;
  createdAt: string;
}

const isMilestoneStatus = (value: unknown): value is Milestone['status'] =>
  typeof value === 'string' && ['pending', 'in-progress', 'completed', 'overdue'].includes(value);

const isMilestonePriority = (value: unknown): value is Milestone['priority'] =>
  typeof value === 'string' && ['low', 'medium', 'high'].includes(value);

const isProjectMilestoneRecord = (value: unknown): value is ProjectMilestoneRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.title === 'string' && typeof record.dueDate === 'string';
};

const isProjectFileRecord = (value: unknown): value is ProjectFileRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.name === 'string' && typeof record.mimeType === 'string';
};

const isProjectActivityRecord = (value: unknown): value is ProjectActivityRecord => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.description === 'string' && typeof record.createdAt === 'string';
};

const isProjectFileCategory = (value: unknown): value is ProjectFile['category'] =>
  typeof value === 'string' && ['design', 'document', 'code', 'other'].includes(value);

const formatFullName = (firstName?: string | null, lastName?: string | null) => {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : undefined;
};

const toMilestone = (record: ProjectMilestoneRecord): Milestone => {
  const status = isMilestoneStatus(record.status) ? record.status : 'pending';
  const priority = isMilestonePriority(record.priority) ? record.priority : 'medium';
  const assignedName = record.assignedToUser?.profile
    ? formatFullName(record.assignedToUser.profile.firstName, record.assignedToUser.profile.lastName)
    : undefined;

  return {
    id: record.id,
    title: record.title,
    description: record.description ?? '',
    dueDate: record.dueDate,
    status,
    priority,
    assignedTo: assignedName,
    completedAt: record.completedAt ?? undefined,
    attachments: 0,
  };
};

const toProjectFile = (record: ProjectFileRecord): ProjectFile => {
  const category = isProjectFileCategory(record.category) ? record.category : 'other';
  const uploadedAt = record.uploadedAt ?? record.createdAt ?? new Date().toISOString();

  // Try to get full name from profile, otherwise use email as fallback
  let uploaderName: string;
  if (record.uploader?.profile) {
    const fullName = formatFullName(record.uploader.profile.firstName, record.uploader.profile.lastName);
    uploaderName = fullName ?? record.uploader.email ?? 'Unknown';
  } else if (record.uploader?.email) {
    uploaderName = record.uploader.email;
  } else {
    uploaderName = 'Unknown';
  }

  return {
    id: record.id,
    name: record.name,
    type: record.mimeType,
    size: formatFileSize(record.size ?? 0),
    uploadedBy: uploaderName,
    uploadedAt,
    category,
  };
};

type TabKey = 'overview' | 'milestones' | 'files' | 'timeline';

export default function EnhancedProjectManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [showEditMilestone, setShowEditMilestone] = useState(false);
  const [showDeleteMilestone, setShowDeleteMilestone] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [showDeleteFile, setShowDeleteFile] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormState>({
    title: '',
    description: '',
    dueDate: null,
    priority: 'medium',
    status: 'pending',
  });

  const { data: planSummary } = trpc.user.getPlanFeatures.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
  });

  const hasEnhancedProjectManagement = planSummary?.permissions?.hasEnhancedProjectManagement ?? false;
  const planTag = planSummary?.plan === 'CLIENT_ENTERPRISE'
    ? 'Enterprise Suite'
    : planSummary?.plan === 'CLIENT_BUSINESS'
      ? 'Business Plan'
      : 'Upgrade Required';

  // Fetch real data from backend
  const utils = trpc.useUtils();
  const { data: projectMilestones, isLoading: milestonesLoading } = trpc.projectMilestones.list.useQuery({}, {
    enabled: hasEnhancedProjectManagement,
  });

  const { data: projectFilesData, isLoading: filesLoading } = trpc.projectFiles.list.useQuery({}, {
    enabled: hasEnhancedProjectManagement,
  });

  const { data: stats } = trpc.projectMilestones.getStats.useQuery(undefined, {
    enabled: hasEnhancedProjectManagement,
  });

  const { data: activity } = trpc.projectMilestones.getActivity.useQuery({ limit: 10 }, {
    enabled: hasEnhancedProjectManagement,
  });

  // Mutations
  const createMilestoneMutation = trpc.projectMilestones.create.useMutation({
    onSuccess: () => {
      utils.projectMilestones.list.invalidate();
      utils.projectMilestones.getStats.invalidate();
      utils.projectMilestones.getActivity.invalidate();
      setShowCreateMilestone(false);
      setMilestoneForm({
        title: '',
        description: '',
        dueDate: null,
        priority: 'medium',
        status: 'pending',
      });
    },
  });

  const updateMilestoneMutation = trpc.projectMilestones.update.useMutation({
    onSuccess: () => {
      utils.projectMilestones.list.invalidate();
      utils.projectMilestones.getStats.invalidate();
      utils.projectMilestones.getActivity.invalidate();
      setShowEditMilestone(false);
      setSelectedMilestoneId(null);
      setMilestoneForm({
        title: '',
        description: '',
        dueDate: null,
        priority: 'medium',
        status: 'pending',
      });
    },
  });

  const deleteMilestoneMutation = trpc.projectMilestones.delete.useMutation({
    onSuccess: () => {
      utils.projectMilestones.list.invalidate();
      utils.projectMilestones.getStats.invalidate();
      utils.projectMilestones.getActivity.invalidate();
      setShowDeleteMilestone(false);
      setSelectedMilestoneId(null);
    },
  });

  const uploadFileMutation = trpc.projectFiles.create.useMutation({
    onSuccess: () => {
      utils.projectFiles.list.invalidate();
      utils.projectMilestones.getActivity.invalidate();
      setShowUploadFile(false);
      setSelectedFile(null);
      setUploadError('');
      toast.success('File uploaded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to upload file', {
        description: error.message,
      });
    },
  });

  const deleteFileMutation = trpc.projectFiles.delete.useMutation({
    onSuccess: () => {
      utils.projectFiles.list.invalidate();
      utils.projectMilestones.getActivity.invalidate();
      setShowDeleteFile(false);
      setSelectedFileId(null);
      toast.success('File deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete file', {
        description: error.message,
      });
    },
  });

  // Transform backend data to match UI interface
  const milestoneRecords = Array.isArray(projectMilestones)
    ? projectMilestones.filter(isProjectMilestoneRecord)
    : [];
  const milestones: Milestone[] = milestoneRecords.map(toMilestone);

  const projectFileRecords = Array.isArray(projectFilesData)
    ? projectFilesData.filter(isProjectFileRecord)
    : [];
  const projectFiles: ProjectFile[] = projectFileRecords.map(toProjectFile);

  const activityItems = Array.isArray(activity)
    ? activity.filter(isProjectActivityRecord)
    : [];

  const handleCreateMilestone = () => {
    if (!milestoneForm.title || !milestoneForm.dueDate) {
      return;
    }

    createMilestoneMutation.mutate({
      title: milestoneForm.title,
      description: milestoneForm.description,
      dueDate: formatCalendarDateToISO(milestoneForm.dueDate) || '',
      priority: milestoneForm.priority,
    });
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setSelectedMilestoneId(milestone.id);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description,
      dueDate: parseISOToCalendarDate(milestone.dueDate),
      priority: milestone.priority,
      status: milestone.status,
    });
    setShowEditMilestone(true);
  };

  const handleUpdateMilestone = () => {
    if (!selectedMilestoneId || !milestoneForm.title || !milestoneForm.dueDate) {
      return;
    }

    updateMilestoneMutation.mutate({
      id: selectedMilestoneId,
      title: milestoneForm.title,
      description: milestoneForm.description,
      dueDate: formatCalendarDateToISO(milestoneForm.dueDate) || '',
      priority: milestoneForm.priority,
      status: milestoneForm.status,
    });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
    setShowDeleteMilestone(true);
  };

  const confirmDeleteMilestone = () => {
    if (!selectedMilestoneId) return;
    deleteMilestoneMutation.mutate({ id: selectedMilestoneId });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (!isValidFileSize(file.size)) {
      const errorMsg = getFileSizeErrorMessage(file.size);
      setUploadError(errorMsg);
      setSelectedFile(null);
      return;
    }

    setUploadError('');
    setSelectedFile(file);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    // Note: In a real implementation, you would upload the actual file to storage
    // (e.g., Supabase Storage, AWS S3, etc.) and get back a file path
    // For now, we'll create a placeholder implementation

    const fileCategory = selectedFile.type.includes('image') ? 'design' :
                        selectedFile.type.includes('pdf') || selectedFile.type.includes('document') ? 'document' :
                        selectedFile.type.includes('code') || selectedFile.type.includes('text') ? 'code' :
                        'other';

    uploadFileMutation.mutate({
      name: selectedFile.name,
      originalName: selectedFile.name,
      mimeType: selectedFile.type,
      size: selectedFile.size,
      category: fileCategory,
      filePath: `/uploads/projects/${Date.now()}_${selectedFile.name}`, // Placeholder path
      description: '',
      isPublic: false,
    });
  };

  const handleDownloadFile = (file: ProjectFile) => {
    // In a real implementation, this would download from storage
    // For now, show a toast message
    toast.info('Download functionality', {
      description: `${file.name} will be available once storage is configured`,
    });
  };

  const handleShareFile = (file: ProjectFile) => {
    // Copy file link to clipboard (placeholder implementation)
    const fileUrl = `${window.location.origin}/files/${file.id}`;
    navigator.clipboard.writeText(fileUrl).then(() => {
      toast.success('Link copied to clipboard!', {
        description: 'Share this link with your team members',
      });
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handleDeleteFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setShowDeleteFile(true);
  };

  const confirmDeleteFile = () => {
    if (!selectedFileId) return;
    deleteFileMutation.mutate({ id: selectedFileId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20';
      case 'overdue': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  if (!hasEnhancedProjectManagement) {
    return (
      <div className="glass-card p-8 rounded-2xl text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Enhanced Project Management</h3>
        <p className="text-muted-foreground mb-6">
          Upgrade to Business Plan to access advanced project management features including file storage, task tracking, and timeline views.
        </p>
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Unlimited file storage and sharing</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Target className="h-4 w-4" />
            <span>Advanced milestone and task tracking</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Project timeline and progress analytics</span>
          </div>
        </div>
        <Link 
          href="/dashboard?tab=subscription"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors font-medium"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Business Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Enhanced Project Management</h2>
          <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-600 border-yellow-500/40">
            {planTag}
          </Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
        <div className="flex space-x-1">
          {([
            { key: 'overview' as TabKey, label: 'Overview', icon: Activity },
            { key: 'milestones' as TabKey, label: 'Milestones', icon: Target },
            { key: 'files' as TabKey, label: 'Files', icon: FileText },
            { key: 'timeline' as TabKey, label: 'Timeline', icon: Calendar }
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Explanatory Banner */}
          <div className="glass-card p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  What is Enhanced Project Management?
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Organize and track your freelance projects with powerful tools designed for clients. Create milestones to break down projects into manageable tasks, upload and share files with your freelancers, and monitor progress through detailed timelines and activity logs.
                </p>
                <div className="grid md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    <span>Set project milestones and deadlines</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Upload and organize project files</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span>Track progress with visual timeline</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Progress */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Project Progress</h3>
              <span className="text-xs text-muted-foreground">Based on milestone completion</span>
            </div>

            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Completion</span>
                  <span className="text-lg font-bold text-foreground">
                    {stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200/20 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.completed || 0} of {stats?.total || 0} milestones completed
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl bg-green-500/10 border-green-500/20">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats?.completed || 0}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </div>
                </div>
                <div className="glass-card p-4 rounded-xl bg-blue-500/10 border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400 mb-1">{stats?.inProgress || 0}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    In Progress
                  </div>
                </div>
                <div className="glass-card p-4 rounded-xl bg-gray-500/10 border-gray-500/20">
                  <div className="text-2xl font-bold text-gray-400 mb-1">{stats?.pending || 0}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Pending
                  </div>
                </div>
                <div className="glass-card p-4 rounded-xl bg-purple-500/10 border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400 mb-1">{projectFiles.length}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Files
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
            {activityItems.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {activityItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h4 className="text-base font-medium text-foreground mb-2">No Activity Yet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by creating milestones or uploading files to track your project progress
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('milestones')}
                    className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm"
                  >
                    Create Milestone
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="px-4 py-2 bg-white/5 text-foreground rounded-lg hover:bg-white/10 transition-colors text-sm"
                  >
                    Upload Files
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-foreground">Milestones ({milestones.length})</h3>
            <button
              onClick={() => setShowCreateMilestone(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>
          </div>

          {milestonesLoading ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading milestones...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Milestones Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create milestones to track progress on your active projects.
              </p>
              <button
                onClick={() => setShowCreateMilestone(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create First Milestone
              </button>
            </div>
          ) : (
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div key={milestone.id} className="glass-card p-6 rounded-2xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-foreground">{milestone.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('-', ' ')}
                      </span>
                      <Flag className={`h-4 w-4 ${getPriorityColor(milestone.priority)}`} />
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{milestone.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                      </div>
                      {milestone.assignedTo && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{milestone.assignedTo}</span>
                        </div>
                      )}
                      {milestone.attachments > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{milestone.attachments} files</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMilestone(milestone)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit milestone"
                    >
                      <Edit3 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete milestone"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Project Files ({projectFiles.length})</h3>
              <p className="text-xs text-muted-foreground mt-1">Maximum file size: {MAX_FILE_SIZE_MB}MB per file</p>
            </div>
            <button
              onClick={() => setShowUploadFile(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
          </div>

          {filesLoading ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading files...</p>
            </div>
          ) : projectFiles.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Files Uploaded</h3>
              <p className="text-muted-foreground mb-4">
                Upload and share project files, designs, and documents with your team.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Maximum file size: {MAX_FILE_SIZE_MB}MB per file
              </p>
              <button
                onClick={() => setShowUploadFile(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            </div>
          ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {projectFiles.map((file) => (
              <div key={file.id} className="glass-card p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      file.category === 'design' ? 'bg-purple-500/20' :
                      file.category === 'document' ? 'bg-blue-500/20' :
                      file.category === 'code' ? 'bg-green-500/20' :
                      'bg-gray-500/20'
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        file.category === 'design' ? 'text-purple-400' :
                        file.category === 'document' ? 'text-blue-400' :
                        file.category === 'code' ? 'text-green-400' :
                        'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">{file.name}</h4>
                      <p className="text-xs text-muted-foreground">{file.type} • {file.size}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        by {file.uploadedBy} • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Download file"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleShareFile(file)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Share file"
                    >
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-1 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-6">Project Timeline</h3>
          {milestonesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Building timeline...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Timeline Data</h3>
              <p className="text-muted-foreground">
                Create milestones to visualize your project timeline
              </p>
            </div>
          ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-glass-border"></div>

            <div className="space-y-8">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="relative flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    milestone.status === 'completed' ? 'bg-green-500/20 border-green-500' :
                    milestone.status === 'in-progress' ? 'bg-blue-500/20 border-blue-500' :
                    'bg-gray-500/20 border-gray-500'
                  }`}>
                    {milestone.status === 'completed' ? 
                      <CheckCircle2 className="h-4 w-4 text-green-400" /> :
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-foreground">{milestone.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                    <div className="text-xs text-muted-foreground">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                      {milestone.completedAt && (
                        <> • Completed: {new Date(milestone.completedAt).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Create Milestone Modal */}
      {showCreateMilestone && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6">Create Milestone</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  placeholder="Milestone title"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  placeholder="Describe this milestone"
                  rows={3}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Due Date *</label>
                  <DatePicker
                    value={milestoneForm.dueDate}
                    onChange={(date) => setMilestoneForm({ ...milestoneForm, dueDate: date })}
                    placeholder="Select due date"
                    minValue={getTodayCalendarDate()}
                    required
                    className="w-full bg-white/5 border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                  <select
                    value={milestoneForm.priority}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      priority: e.target.value as Milestone['priority'],
                    })
                  }
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateMilestone(false)}
                disabled={createMilestoneMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMilestone}
                disabled={createMilestoneMutation.isPending || !milestoneForm.title || !milestoneForm.dueDate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMilestoneMutation.isPending ? 'Creating...' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {showEditMilestone && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6">Edit Milestone</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                <input
                  type="text"
                  placeholder="Milestone title"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  placeholder="Describe this milestone"
                  rows={3}
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={milestoneForm.status}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      status: e.target.value as Milestone['status'],
                    })
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Due Date *</label>
                  <DatePicker
                    value={milestoneForm.dueDate}
                    onChange={(date) => setMilestoneForm({ ...milestoneForm, dueDate: date })}
                    placeholder="Select due date"
                    minValue={getTodayCalendarDate()}
                    required
                    className="w-full bg-white/5 border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                  <select
                    value={milestoneForm.priority}
                    onChange={(e) =>
                      setMilestoneForm({
                        ...milestoneForm,
                        priority: e.target.value as Milestone['priority'],
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditMilestone(false);
                  setSelectedMilestoneId(null);
                }}
                disabled={updateMilestoneMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMilestone}
                disabled={updateMilestoneMutation.isPending || !milestoneForm.title || !milestoneForm.dueDate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updateMilestoneMutation.isPending ? 'Updating...' : 'Update Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Milestone Confirmation Modal */}
      {showDeleteMilestone && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">Delete Milestone</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this milestone? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteMilestone(false);
                  setSelectedMilestoneId(null);
                }}
                disabled={deleteMilestoneMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMilestone}
                disabled={deleteMilestoneMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMilestoneMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-6">Upload File</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select File (Max {MAX_FILE_SIZE_MB}MB)
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                />
              </div>

              {selectedFile && (
                <div className="p-4 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{uploadError}</p>
                </div>
              )}

              {selectedFile && !uploadError && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    File will be automatically categorized based on type
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadFile(false);
                  setSelectedFile(null);
                  setUploadError('');
                }}
                disabled={uploadFileMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadFile}
                disabled={uploadFileMutation.isPending || !selectedFile || !!uploadError}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploadFileMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal */}
      {showDeleteFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-foreground mb-4">Delete File</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteFile(false);
                  setSelectedFileId(null);
                }}
                disabled={deleteFileMutation.isPending}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                disabled={deleteFileMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteFileMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
