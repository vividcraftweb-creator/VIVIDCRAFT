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
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { DocumentViewerModal } from '@/components/admin/DocumentViewerModal';

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
  Profile?:
    | Array<{ firstName?: string | null; lastName?: string | null; companyName?: string | null }>
    | { firstName?: string | null; lastName?: string | null; companyName?: string | null }
    | null;
  Verification?: Document[];
};

export default function AdminVerificationsPage() {
  const { data: users, isLoading, refetch } = trpc.admin.getUsersWithVerifications.useQuery();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [rejectingDoc, setRejectingDoc] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{
    url: string;
    type: string;
    userName: string;
  } | null>(null);

  // Helper function to convert relative paths to full Supabase storage URLs
  const getFullDocumentUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Construct Supabase storage URL
    // Files are stored in the 'public-uploads' bucket
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    let cleanPath = url.startsWith('/') ? url.slice(1) : url;

    // Fix path mapping: database has 'uploads/documents/' but actual storage uses 'verification-documents/'
    // Also remove user ID subfolder if present (e.g., uploads/documents/{userId}/ -> verification-documents/)
    if (cleanPath.startsWith('uploads/documents/')) {
      // Extract just the filename from the path
      const pathParts = cleanPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      cleanPath = `verification-documents/${filename}`;
    }

    // Return Supabase storage public URL
    return `${supabaseUrl}/storage/v1/object/public/public-uploads/${cleanPath}`;
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const approveMutation = trpc.verifications.approveVerification.useMutation({
    onSuccess: () => {
      toast.success('Document approved');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to approve document');
    },
  });

  const rejectMutation = trpc.verifications.rejectVerification.useMutation({
    onSuccess: () => {
      toast.success('Document rejected');
      setRejectingDoc(null);
      setRejectionReason('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reject document');
    },
  });

  const usersData: UserWithVerifications[] = Array.isArray(users)
    ? (users as any as UserWithVerifications[])
    : [];

  // Calculate stats
  const allDocs = usersData.flatMap((user) => user.Verification || []);
  const pendingDocs = allDocs.filter((doc) => doc.status === 'PENDING');
  const approvedDocs = allDocs.filter((doc) => doc.status === 'APPROVED');
  const rejectedDocs = allDocs.filter((doc) => doc.status === 'REJECTED');

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersData.filter((user) => {
      const profile = Array.isArray(user.Profile) ? user.Profile[0] : user.Profile;
      const displayName =
        user.role === 'CLIENT'
          ? user.clientType === 'BUSINESS'
            ? profile?.companyName || 'Business Client'
            : profile
            ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Individual Client'
            : 'Individual Client'
          : profile
          ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Freelancer'
          : 'Freelancer';

      // Search filter
      const matchesSearch =
        !searchQuery ||
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      // User type filter
      const matchesUserType =
        userTypeFilter === 'ALL' ||
        (userTypeFilter === 'CLIENT' && user.role === 'CLIENT') ||
        (userTypeFilter === 'FREELANCER' && user.role === 'FREELANCER') ||
        (userTypeFilter === 'INDIVIDUAL' && user.clientType === 'INDIVIDUAL') ||
        (userTypeFilter === 'BUSINESS' && user.clientType === 'BUSINESS');

      // Status filter
      const userDocs = user.Verification || [];
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && userDocs.some((doc) => doc.status === 'PENDING')) ||
        (statusFilter === 'APPROVED' && userDocs.some((doc) => doc.status === 'APPROVED')) ||
        (statusFilter === 'REJECTED' && userDocs.some((doc) => doc.status === 'REJECTED'));

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
    switch (status) {
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
                  {usersData.filter((u) => u.Verification?.some((d) => d.status === 'PENDING')).length} users
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
                <SelectItem value="FREELANCER">Freelancers</SelectItem>
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
                const isClient = user.role === 'CLIENT';
                const displayName = isClient
                  ? user.clientType === 'BUSINESS'
                    ? profile?.companyName || 'Business Client'
                    : profile
                    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
                      'Individual Client'
                    : 'Individual Client'
                  : profile
                  ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Freelancer'
                  : 'Freelancer';

                const userDocs = user.Verification || [];
                const isExpanded = expandedUsers.has(user.id);
                const pendingCount = userDocs.filter((doc) => doc.status === 'PENDING').length;
                const approvedCount = userDocs.filter((doc) => doc.status === 'APPROVED').length;
                const rejectedCount = userDocs.filter((doc) => doc.status === 'REJECTED').length;

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
                          <Badge variant="outline" className="text-xs">
                            {isClient
                              ? user.clientType || 'INDIVIDUAL'
                              : 'FREELANCER'}
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
                        <span className="text-slate-500 ml-2">{userDocs.length} docs</span>
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
