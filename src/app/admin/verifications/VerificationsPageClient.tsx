'use client';

import { trpc } from '@/utils/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  Building,
  User,
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  Search,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  UserCheck,
  Shield,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DocumentViewerModal } from '@/components/admin/DocumentViewerModal';
import { formatRole } from '@/lib/utils';

type Document = {
  id: string;
  verificationType: string;
  status: string;
  documentUrl?: string | null;
  files?: string | null; // Old schema: comma-separated URLs
  fileName?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
};

type UserWithVerifications = {
  id: string;
  email: string;
  role?: string;
  clientType?: string | null;
  createdAt: string;
  isVerified?: boolean;
  is_verified?: boolean;
  Profile?:
    | Array<{ firstName?: string | null; lastName?: string | null; companyName?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }>
    | { firstName?: string | null; lastName?: string | null; companyName?: string | null; full_name?: string | null; first_name?: string | null; last_name?: string | null }
    | null;
  Verification?: Document[];
};

export default function AdminVerificationsPage() {
  const utils = trpc.useUtils();

  // Auto-Fetch / Poll Fallback: periodic refetch every 5s & window focus refetch
  // Disable Caching on Admin Query: cacheTime: 0, staleTime: 0, refetchOnMount: 'always'
  const { data: users, isLoading, refetch } = trpc.admin.getVerifications.useQuery(undefined, {
    cacheTime: 0,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  } as any);

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    type: string;
    userName: string;
  } | null>(null);

  // Optimistic UI state overrides: respond instantly without waiting for server roundtrip
  const [optimisticDocStatus, setOptimisticDocStatus] = useState<Record<string, { status: string; rejectionReason?: string }>>({});
  const [optimisticUserVerified, setOptimisticUserVerified] = useState<Record<string, boolean>>({});

  // Helper function to convert relative paths to full Supabase storage URLs
  const getFullDocumentUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Construct Supabase storage URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    let cleanPath = url.startsWith('/') ? url.slice(1) : url;

    // Route paths in verification-documents to 'verifications' bucket
    if (cleanPath.startsWith('verification-documents/')) {
      return `${supabaseUrl}/storage/v1/object/public/verifications/${cleanPath}`;
    }

    if (cleanPath.startsWith('uploads/documents/')) {
      // Extract filename
      const pathParts = cleanPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      cleanPath = `verification-documents/${filename}`;
      return `${supabaseUrl}/storage/v1/object/public/verifications/${cleanPath}`;
    }

    // Default fallback to public-uploads bucket
    return `${supabaseUrl}/storage/v1/object/public/public-uploads/${cleanPath}`;
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamically normalize either flat verifications records or grouped user records
  const rawUsersData: UserWithVerifications[] = useMemo(() => {
    if (!Array.isArray(users)) return [];

    if (users.length > 0 && Array.isArray((users[0] as any).Verification)) {
      return users as UserWithVerifications[];
    }

    const userMap = new Map<string, UserWithVerifications>();

    for (const v of users as any[]) {
      const uid = v.user_id || v.userId || v.id;
      if (!uid) continue;

      const prof = v.profiles || v.user?.Profile?.[0] || v.Profile?.[0] || v.user || {};
      const fullName = prof.full_name || v.user?.full_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Artist';
      const email = prof.email || v.user?.email || v.email || 'User';
      const rawRole = (prof.role || v.user?.role || v.role || 'ARTIST').toUpperCase();
      const role = rawRole === 'FREELANCER' || rawRole === 'ARTIST' ? 'ARTIST' : rawRole;
      const clientType = prof.client_type || v.clientType || null;
      const isVerified = Boolean(prof.is_verified ?? v.isVerified ?? false);

      const status = (v.status || 'pending').toUpperCase();
      const docType = v.document_type || v.documentType || 'ID Document';
      const createdAt = v.created_at || v.createdAt || new Date().toISOString();
      const rejectionReason = v.rejection_reason || v.rejectionReason || null;

      const frontUrl = v.id_front_url || v.front_url || v.document_url || v.documentUrl || v.files || null;
      const backUrl = v.id_back_url || v.back_url || null;
      const selfieUrl = v.selfie_url || null;

      const docs: Document[] = [];
      if (frontUrl) {
        docs.push({
          id: `${v.id}-front`,
          verificationType: 'ID_FRONT',
          documentType: `${docType} (Front)`,
          documentUrl: frontUrl,
          files: frontUrl,
          fileName: `${docType} - Front`,
          status,
          createdAt,
          rejectionReason,
        });
      }
      if (backUrl) {
        docs.push({
          id: `${v.id}-back`,
          verificationType: 'ID_BACK',
          documentType: `${docType} (Back)`,
          documentUrl: backUrl,
          files: backUrl,
          fileName: `${docType} - Back`,
          status,
          createdAt,
          rejectionReason,
        });
      }
      if (selfieUrl) {
        docs.push({
          id: `${v.id}-selfie`,
          verificationType: 'SELFIE',
          documentType: `Selfie with ${docType}`,
          documentUrl: selfieUrl,
          files: selfieUrl,
          fileName: `Selfie with ${docType}`,
          status,
          createdAt,
          rejectionReason,
        });
      }
      if (docs.length === 0) {
        docs.push({
          id: v.id,
          verificationType: 'ID_FRONT',
          documentType: docType,
          documentUrl: frontUrl || backUrl || selfieUrl || null,
          files: frontUrl || backUrl || selfieUrl || null,
          fileName: docType,
          status,
          createdAt,
          rejectionReason,
        });
      }

      const existing = userMap.get(uid);
      if (existing) {
        existing.Verification = [...(existing.Verification || []), ...docs];
      } else {
        userMap.set(uid, {
          id: uid,
          email,
          role,
          clientType,
          createdAt,
          isVerified,
          is_verified: isVerified,
          Profile: [
            {
              firstName: prof.first_name || fullName.split(' ')[0] || '',
              lastName: prof.last_name || fullName.split(' ').slice(1).join(' ') || '',
              companyName: prof.company_name || null,
              full_name: fullName,
              first_name: prof.first_name || '',
              last_name: prof.last_name || '',
            },
          ],
          Verification: docs,
        });
      }
    }

    return Array.from(userMap.values());
  }, [users]);

  const approveMutation = trpc.verifications.approveVerification.useMutation({
    onMutate: async ({ verificationId }) => {
      // Optimistic UI: immediately mark document as APPROVED
      setOptimisticDocStatus((prev) => ({
        ...prev,
        [verificationId]: { status: 'APPROVED' },
      }));
      const targetUser = rawUsersData.find((u) =>
        u.Verification?.some((d) => d.id === verificationId)
      );
      if (targetUser) {
        setOptimisticUserVerified((prev) => ({
          ...prev,
          [targetUser.id]: true,
        }));
      }
    },
    onSuccess: async () => {
      toast.success('Document approved');
      // Cache Invalidation on Action
      try {
        await Promise.all([
          utils.verification.getAllPending.invalidate(),
          utils.verifications.getAllPending.invalidate(),
          utils.admin.getUsers.invalidate(),
          utils.admin.getUsersWithVerifications.invalidate(),
          utils.admin.users.getUsers.invalidate(),
          utils.admin.users.getOverview.invalidate(),
          utils.verifications.getUserDocuments.invalidate(),
        ]);
      } catch (err) {
        console.warn('Cache invalidation notice:', err);
      }
      refetch();
    },
    onError: (error, { verificationId }) => {
      setOptimisticDocStatus((prev) => {
        const copy = { ...prev };
        delete copy[verificationId];
        return copy;
      });
      toast.error(error.message || 'Failed to approve document');
    },
  });

  const rejectMutation = trpc.verifications.rejectVerification.useMutation({
    onMutate: async ({ verificationId, reason }) => {
      // Optimistic UI: immediately mark document as REJECTED with reason
      setOptimisticDocStatus((prev) => ({
        ...prev,
        [verificationId]: { status: 'REJECTED', rejectionReason: reason },
      }));
      setRejectingDoc(null);
      setRejectionReason('');
    },
    onSuccess: async () => {
      toast.success('Document rejected');
      // Cache Invalidation on Action
      try {
        await Promise.all([
          utils.verification.getAllPending.invalidate(),
          utils.verifications.getAllPending.invalidate(),
          utils.admin.getUsers.invalidate(),
          utils.admin.getUsersWithVerifications.invalidate(),
          utils.admin.users.getUsers.invalidate(),
          utils.admin.users.getOverview.invalidate(),
          utils.verifications.getUserDocuments.invalidate(),
        ]);
      } catch (err) {
        console.warn('Cache invalidation notice:', err);
      }
      refetch();
    },
    onError: (error, { verificationId }) => {
      setOptimisticDocStatus((prev) => {
        const copy = { ...prev };
        delete copy[verificationId];
        return copy;
      });
      toast.error(error.message || 'Failed to reject document');
    },
  });

  const userVerifyMutation = trpc.admin.users.verifyUser.useMutation({
    onMutate: async ({ userId }) => {
      setOptimisticUserVerified((prev) => ({ ...prev, [userId]: true }));
    },
    onSuccess: async (data) => {
      toast.success(data?.message || 'User verified successfully');
      try {
        await Promise.all([
          utils.admin.getUsers.invalidate(),
          utils.admin.getUsersWithVerifications.invalidate(),
          utils.admin.users.getUsers.invalidate(),
          utils.verification.getAllPending.invalidate(),
          utils.verifications.getAllPending.invalidate(),
        ]);
      } catch (err) {}
      refetch();
    },
    onError: (error, { userId }) => {
      setOptimisticUserVerified((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      toast.error(error.message || 'Failed to verify user');
    },
  });

  const userUnverifyMutation = trpc.admin.users.unverifyUser.useMutation({
    onMutate: async ({ userId }) => {
      setOptimisticUserVerified((prev) => ({ ...prev, [userId]: false }));
    },
    onSuccess: async (data) => {
      toast.success(data?.message || 'User unverified successfully');
      try {
        await Promise.all([
          utils.admin.getUsers.invalidate(),
          utils.admin.getUsersWithVerifications.invalidate(),
          utils.admin.users.getUsers.invalidate(),
          utils.verification.getAllPending.invalidate(),
          utils.verifications.getAllPending.invalidate(),
        ]);
      } catch (err) {}
      refetch();
    },
    onError: (error, { userId }) => {
      setOptimisticUserVerified((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      toast.error(error.message || 'Failed to unverify user');
    },
  });

  // Apply optimistic status updates immediately across all users and documents
  const usersData: UserWithVerifications[] = useMemo(() => {
    return rawUsersData.map((user) => {
      const userOptimistic = optimisticUserVerified[user.id];
      const updatedUser = {
        ...user,
        isVerified: userOptimistic !== undefined ? userOptimistic : Boolean((user as any).isVerified || (user as any).is_verified),
        is_verified: userOptimistic !== undefined ? userOptimistic : Boolean((user as any).isVerified || (user as any).is_verified),
      };

      if (user.Verification && Array.isArray(user.Verification)) {
        updatedUser.Verification = user.Verification.map((doc) => {
          const override = optimisticDocStatus[doc.id];
          if (override) {
            return {
              ...doc,
              status: override.status,
              rejectionReason: override.rejectionReason !== undefined ? override.rejectionReason : doc.rejectionReason,
            };
          }
          return doc;
        });
      }

      return updatedUser;
    });
  }, [rawUsersData, optimisticDocStatus, optimisticUserVerified]);

  // Calculate stats
  const allDocs = usersData.flatMap((user) => user.Verification || []);
  const pendingDocs = allDocs.filter((doc) => (doc.status || '').toUpperCase() === 'PENDING');
  const approvedDocs = allDocs.filter((doc) => (doc.status || '').toUpperCase() === 'APPROVED');
  const rejectedDocs = allDocs.filter((doc) => (doc.status || '').toUpperCase() === 'REJECTED');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersData.filter((user) => {
      const profile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
      const fullName =
        (profile as any)?.full_name ||
        `${(profile as any)?.first_name || profile?.firstName || ''} ${(profile as any)?.last_name || profile?.lastName || ''}`.trim();
      const displayName =
        user.role === 'CLIENT'
          ? user.clientType === 'BUSINESS'
            ? profile?.companyName || 'Business Client'
            : fullName || 'Individual Client'
          : fullName || 'Artist';

      // Search filter
      const matchesSearch =
        !searchQuery ||
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());

      // User type filter
      const matchesUserType =
        userTypeFilter === 'ALL' ||
        (userTypeFilter === 'CLIENT' && user.role === 'CLIENT') ||
        (userTypeFilter === 'FREELANCER' && (user.role === 'FREELANCER' || user.role === 'ARTIST')) ||
        (userTypeFilter === 'INDIVIDUAL' && user.clientType === 'INDIVIDUAL') ||
        (userTypeFilter === 'BUSINESS' && user.clientType === 'BUSINESS');

      // Status filter
      const userDocs = user.Verification || [];
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && userDocs.some((doc) => (doc.status || '').toUpperCase() === 'PENDING')) ||
        (statusFilter === 'APPROVED' && userDocs.some((doc) => (doc.status || '').toUpperCase() === 'APPROVED')) ||
        (statusFilter === 'REJECTED' && userDocs.some((doc) => (doc.status || '').toUpperCase() === 'REJECTED'));

      return matchesSearch && matchesUserType && matchesStatus;
    });
  }, [usersData, searchQuery, userTypeFilter, statusFilter]);

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ID_FRONT: 'ID Front',
      ID_BACK: 'ID Back',
      SELFIE: 'Selfie with ID',
      BUSINESS_REGISTRATION: 'Business Registration',
      PROOF_OF_ADDRESS: 'Proof of Address',
      TAX_DOCUMENT: 'Tax Document',
      BUSINESS_LICENSE: 'Business License',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const DocumentThumbnail = ({ url, type, fileName, onOpenNewTab }: { url: string; type: string; fileName?: string | null; onOpenNewTab: () => void }) => {
    const [imageError, setImageError] = useState(false);

    // Check if URL is an image by trying to detect common patterns
    const urlLower = url?.toLowerCase() || '';
    const isPdf = urlLower.includes('.pdf') || urlLower.includes('application/pdf');

    // For Supabase storage URLs or any URL that's not explicitly PDF, try to render as image
    // The onError handler will catch if it's not actually an image
    const shouldTryImage = !isPdf;

    return (
      <div className="relative w-full h-48 rounded border border-white/10 overflow-hidden bg-black/20 flex items-center justify-center group/thumbnail">
        {shouldTryImage && !imageError ? (
          <img
            src={url}
            alt={type}
            className="w-full h-full object-cover"
            loading="lazy"
            crossOrigin="anonymous"
            onError={(e) => {
              setImageError(true);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center p-4">
            <FileText className="h-16 w-16 text-slate-400 mb-2" />
            <p className="text-xs text-slate-400 mb-1">PDF Document</p>
            {fileName && <p className="text-xs text-slate-300 break-all text-center px-2">{fileName}</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <FileCheck className="h-16 w-16 text-slate-400 mb-2" />
            <p className="text-xs text-slate-400 mb-1">Document</p>
            {fileName && <p className="text-xs text-slate-300 break-all text-center px-2">{fileName}</p>}
          </div>
        )}

        {/* Hover overlay with action buttons */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenNewTab();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open in New Tab
          </Button>
          <p className="text-white text-xs">or click anywhere to preview</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Verification Queue</h1>
        <p className="text-slate-400 mt-1">
          Review and approve user identity verification documents
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-yellow-400 font-medium">Pending Review</div>
                <div className="text-2xl font-bold text-white mt-1">{pendingDocs.length}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {usersData.filter((u) => u.Verification?.some((d) => (d.status || '').toUpperCase() === 'PENDING')).length} users
                </div>
              </div>
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-400 font-medium">Approved</div>
                <div className="text-2xl font-bold text-white mt-1">{approvedDocs.length}</div>
                <div className="text-xs text-slate-400 mt-1">docs</div>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-400 font-medium">Rejected</div>
                <div className="text-2xl font-bold text-white mt-1">{rejectedDocs.length}</div>
                <div className="text-xs text-slate-400 mt-1">docs</div>
              </div>
              <XCircle className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-400 font-medium">Total Users</div>
                <div className="text-2xl font-bold text-white mt-1">{usersData.length}</div>
                <div className="text-xs text-slate-400 mt-1">{allDocs.length} docs</div>
              </div>
              <User className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-slate-950 border-slate-800 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-slate-950 border-slate-800 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CLIENT">Clients</SelectItem>
                <SelectItem value="FREELANCER">Artists</SelectItem>
                <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Verifications List */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading verifications...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <FileCheck className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">No verifications found</h3>
              <p className="text-slate-400">
                {searchQuery || statusFilter !== 'ALL' || userTypeFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'No pending verifications to review'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredUsers.map((user) => {
                const profile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
                const fullName =
                  (profile as any)?.full_name ||
                  `${(profile as any)?.first_name || profile?.firstName || ''} ${(profile as any)?.last_name || profile?.lastName || ''}`.trim();
                const isClient = user.role === 'CLIENT';
                const displayName = isClient
                  ? user.clientType === 'BUSINESS'
                    ? profile?.companyName || 'Business Client'
                    : fullName || 'Individual Client'
                  : fullName || 'Artist';

                const userDocs = user.Verification || [];
                const isExpanded = expandedUsers.has(user.id);
                const pendingCount = userDocs.filter((doc) => (doc.status || '').toUpperCase() === 'PENDING').length;
                const approvedCount = userDocs.filter((doc) => (doc.status || '').toUpperCase() === 'APPROVED').length;
                const rejectedCount = userDocs.filter((doc) => (doc.status || '').toUpperCase() === 'REJECTED').length;

                return (
                  <div key={user.id} className="hover:bg-white/5 transition-colors">
                    {/* User Row */}
                    <div
                      className="p-4 cursor-pointer flex items-center gap-4"
                      onClick={() => toggleUserExpansion(user.id)}
                    >
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isClient ? (
                          user.clientType === 'BUSINESS' ? (
                            <Building className="h-5 w-5 text-blue-400" />
                          ) : (
                            <User className="h-5 w-5 text-green-400" />
                          )
                        ) : (
                          <User className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">{displayName}</h3>
                          <Badge variant="outline" className={`text-xs font-semibold ${
                            !isClient
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {isClient
                              ? user.clientType || 'INDIVIDUAL'
                              : 'ARTIST'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2 text-sm">
                        {pendingCount > 0 && (
                          <Badge className="bg-yellow-500/20 text-yellow-300">
                            {pendingCount} pending
                          </Badge>
                        )}
                        {approvedCount > 0 && (
                          <Badge className="bg-green-500/20 text-green-300">
                            {approvedCount} approved
                          </Badge>
                        )}
                        {rejectedCount > 0 && (
                          <Badge className="bg-red-500/20 text-red-300">
                            {rejectedCount} rejected
                          </Badge>
                        )}
                        <span className="text-slate-500 ml-1 mr-2">{userDocs.length} docs</span>

                        {/* Direct 1-Click Manual Verify / Unverify Toggle */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const isUserVerified = Boolean(user.isVerified);
                            if (isUserVerified) {
                              userUnverifyMutation.mutate({ userId: user.id });
                            } else {
                              userVerifyMutation.mutate({ userId: user.id, isVerified: true });
                            }
                          }}
                          disabled={userVerifyMutation.isPending || userUnverifyMutation.isPending}
                          title="1-click manual verification toggle"
                          className={`h-7 px-2.5 text-xs font-medium transition-all ${
                            user.isVerified
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300'
                          }`}
                        >
                          {user.isVerified ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3 mr-1 text-slate-400" />
                              Verify User
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex-shrink-0 text-xs text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Expanded Documents - Grid Layout */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {userDocs.map((doc) => {
                            // Handle both old schema (files) and new schema (documentUrl)
                            const rawUrl = doc.documentUrl || (doc.files?.split(',')[0]?.trim());
                            const docUrl = getFullDocumentUrl(rawUrl);
                            const extractedFileName = rawUrl ? rawUrl.split('/').pop()?.split('?')[0] : null;
                            const displayFileName = doc.fileName || extractedFileName;

                            return (
                            <div
                              key={doc.id}
                              className="border border-white/10 rounded-lg p-3 bg-black/20 hover:bg-black/30 transition-colors"
                            >
                              {/* Thumbnail */}
                              {docUrl ? (
                                <div
                                  className="cursor-pointer mb-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingDocument({
                                      url: docUrl,
                                      type: doc.verificationType,
                                      userName: displayName,
                                    });
                                  }}
                                  title="Click to preview document"
                                >
                                  <DocumentThumbnail
                                    url={docUrl}
                                    type={doc.verificationType}
                                    fileName={displayFileName}
                                    onOpenNewTab={() => {
                                      window.open(docUrl, '_blank', 'noopener,noreferrer');
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-48 rounded border border-white/10 bg-black/20 flex items-center justify-center mb-3">
                                  <div className="text-center p-4">
                                    <FileCheck className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                                    {displayFileName ? (
                                      <>
                                        <p className="text-xs text-slate-400 mb-1">File:</p>
                                        <p className="text-xs text-slate-300 break-all px-2">{displayFileName}</p>
                                      </>
                                    ) : (
                                      <p className="text-xs text-slate-500">No document uploaded</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Document Info */}
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <h4 className="text-white font-medium text-sm">
                                    {getDocumentTypeLabel(doc.verificationType)}
                                  </h4>
                                  {getStatusBadge(doc.status)}
                                </div>
                                <p className="text-xs text-slate-400">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </p>

                                {doc.rejectionReason && (
                                  <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                                    <p className="text-xs text-red-300">
                                      <span className="font-semibold">Rejected:</span>{' '}
                                      {doc.rejectionReason}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                {doc.status === 'PENDING' && (
                                  <>
                                    {rejectingDoc === doc.id ? (
                                      <div className="space-y-2">
                                        <Textarea
                                          placeholder="Rejection reason..."
                                          value={rejectionReason}
                                          onChange={(e) => setRejectionReason(e.target.value)}
                                          className="min-h-[60px] text-sm bg-black/20 border-white/10 text-white"
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              if (rejectionReason.trim()) {
                                                rejectMutation.mutate({
                                                  verificationId: doc.id,
                                                  reason: rejectionReason.trim(),
                                                });
                                              } else {
                                                toast.error('Please provide a rejection reason');
                                              }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-xs flex-1"
                                            disabled={rejectMutation.isPending}
                                          >
                                            Confirm
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setRejectingDoc(null);
                                              setRejectionReason('');
                                            }}
                                            className="border-white/10 text-xs flex-1"
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            approveMutation.mutate({ verificationId: doc.id })
                                          }
                                          className="bg-green-600 hover:bg-green-700 text-xs flex-1"
                                          disabled={approveMutation.isPending}
                                        >
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setRejectingDoc(doc.id)}
                                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs flex-1"
                                          disabled={rejectMutation.isPending}
                                        >
                                          <XCircle className="h-3 w-3 mr-1" />
                                          Reject
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}

                                {doc.status !== 'PENDING' && docUrl && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setViewingDocument({
                                        url: docUrl,
                                        type: doc.verificationType,
                                        userName: displayName,
                                      })
                                    }
                                    className="border-white/10 hover:bg-white/10 text-xs w-full"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View Document
                                  </Button>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerModal
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
          documentUrl={viewingDocument.url}
          documentType={viewingDocument.type}
          userName={viewingDocument.userName}
        />
      )}
    </div>
  );
}
