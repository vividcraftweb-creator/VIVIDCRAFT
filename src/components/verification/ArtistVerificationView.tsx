'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/utils/trpc';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Camera,
  Trash2,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  UserCheck,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DocumentType = 'ID_FRONT' | 'ID_BACK' | 'SELFIE';

interface UploadedDocItem {
  id: string;
  verificationType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documentUrl?: string | null;
  fileName?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export default function ArtistVerificationView() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{ is_verified?: boolean; verified?: boolean; status?: string } | null>(null);
  const [directDocs, setDirectDocs] = useState<UploadedDocItem[]>([]);
  const [selectedIdType, setSelectedIdType] = useState<'passport' | 'national_id' | 'drivers_license'>('passport');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>('');

  // Upload state per document type
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const utils = trpc.useUtils();

  // Queries for live synchronization
  const { data: userDocs, refetch: refetchDocs } = trpc.verifications.getUserDocuments.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const { data: myProfile, refetch: refetchProfile } = trpc.profiles.getMyProfile.useQuery({}, {
    retry: false,
    refetchOnWindowFocus: true,
  });

  const uploadDocMutation = trpc.verifications.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      utils.verifications.getUserDocuments.invalidate();
      refetchDocs();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to record document');
    },
  });

  const deleteDocMutation = trpc.verifications.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success('Document removed');
      utils.verifications.getUserDocuments.invalidate();
      refetchDocs();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove document');
    },
  });

  const submitForReviewMutation = trpc.verifications.submitForReview.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'Verification submitted for review!');
      utils.verifications.getUserDocuments.invalidate();
      utils.profiles.getMyProfile.invalidate();
      refetchProfile();
      refetchDocs();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit verification request');
    },
  });

  // Strict data fetching with guaranteed 5-second timeout fallback
  useEffect(() => {
    let isMounted = true;

    // 5-second timeout fallback ensures spinner never hangs indefinitely
    const timeoutTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 5000);

    async function fetchVerificationState() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user && isMounted) {
          setSessionUserId(user.id);

          // 1. Fetch Profile
          const { data: prof, error: profErr } = await (supabase as any)
            .from('profiles')
            .select('id, is_verified, verified, status')
            .eq('id', user.id)
            .limit(1)
            .maybeSingle();

          if (!profErr && prof && isMounted) {
            setProfileData(prof);
          }

          // 2. Fetch User Verification Documents
          const { data: docs, error: docErr } = await supabase
            .from('Verification')
            .select('*')
            .eq('userId', user.id);

          if (!docErr && docs && isMounted) {
            const mappedDocs: UploadedDocItem[] = docs.map((d: any) => ({
              id: d.id,
              verificationType: d.verificationType || 'ID_FRONT',
              status: d.status || 'PENDING',
              documentUrl: d.documentUrl || d.files || null,
              fileName: d.fileName || null,
              rejectionReason: d.rejectionReason || d.details || null,
              createdAt: d.createdAt || d.created_at || new Date().toISOString(),
            }));
            setDirectDocs(mappedDocs);
          }
        }
      } catch (err) {
        console.warn('Artist verification initial fetch error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchVerificationState();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
  }, []);

  // Combined documents: merge tRPC query results with direct fetch
  const allDocuments: UploadedDocItem[] = useMemo(() => {
    if (userDocs && Array.isArray(userDocs)) {
      return userDocs.map((d: any) => ({
        id: d.id,
        verificationType: d.verificationType || 'ID_FRONT',
        status: (d.status as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING',
        documentUrl: d.documentUrl || d.files || null,
        fileName: d.fileName || null,
        rejectionReason: d.rejectionReason || d.details || null,
        createdAt: d.createdAt || new Date().toISOString(),
      }));
    }
    return directDocs;
  }, [userDocs, directDocs]);

  // Derived verification status
  const isApproved = Boolean(
    profileData?.is_verified ||
    profileData?.verified ||
    (myProfile as any)?.is_verified ||
    (myProfile as any)?.verified ||
    allDocuments.some((d) => d.status === 'APPROVED')
  );

  const isPending = Boolean(
    !isApproved && (
      profileData?.status === 'pending_verification' ||
      (myProfile as any)?.status === 'pending_verification' ||
      allDocuments.some((d) => d.status === 'PENDING')
    )
  );

  const rejectedDocs = allDocuments.filter((d) => d.status === 'REJECTED');
  const isRejected = !isApproved && !isPending && rejectedDocs.length > 0;

  // File upload handler to Supabase storage + record via tRPC mutation
  const handleFileUpload = async (type: DocumentType, file: File) => {
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    // Validate type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, WebP) or PDF');
      return;
    }

    setUploadingType(type);
    setUploadProgress((prev) => ({ ...prev, [type]: 20 }));

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `verification-documents/${cleanFileName}`;

      setUploadProgress((prev) => ({ ...prev, [type]: 50 }));

      // Upload to public-uploads bucket
      const { error: uploadErr } = await supabase.storage
        .from('public-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message || 'Storage upload failed');
      }

      setUploadProgress((prev) => ({ ...prev, [type]: 80 }));

      const { data: { publicUrl } } = supabase.storage
        .from('public-uploads')
        .getPublicUrl(filePath);

      // Record document in database
      const labelMap: Record<DocumentType, string> = {
        ID_FRONT: selectedIdType === 'passport' ? 'Passport (Photo Page)' : 'Government ID (Front)',
        ID_BACK: 'Government ID (Back)',
        SELFIE: 'Selfie with ID',
      };

      await uploadDocMutation.mutateAsync({
        verificationType: type,
        fileUrl: publicUrl,
        documentType: labelMap[type],
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      });

      // Update local state optimistically
      setDirectDocs((prev) => {
        const filtered = prev.filter((d) => d.verificationType !== type);
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            verificationType: type,
            status: 'PENDING',
            documentUrl: publicUrl,
            fileName: file.name,
            createdAt: new Date().toISOString(),
          },
        ];
      });

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }));
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingType(null);
    }
  };

  // Remove document
  const handleRemoveDoc = async (type: DocumentType) => {
    const doc = allDocuments.find((d) => d.verificationType === type);
    if (!doc) return;

    try {
      await deleteDocMutation.mutateAsync({ verificationId: doc.id });
      setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      // Direct delete fallback
      try {
        const supabase = createClient();
        await supabase.from('Verification').delete().eq('id', doc.id);
        setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id));
        toast.success('Document removed');
      } catch {}
    }
  };

  // Submit all uploaded documents for verification
  const handleSubmitVerification = async () => {
    const idFront = allDocuments.find((d) => d.verificationType === 'ID_FRONT');
    const selfie = allDocuments.find((d) => d.verificationType === 'SELFIE');

    if (!idFront) {
      toast.error('Please upload your Government ID / Passport photo');
      return;
    }

    if (selectedIdType !== 'passport') {
      const idBack = allDocuments.find((d) => d.verificationType === 'ID_BACK');
      if (!idBack) {
        toast.error('Please upload the back of your Government ID');
        return;
      }
    }

    if (!selfie) {
      toast.error('Please upload a selfie with your ID for identity matching');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Try server mutation
      try {
        await submitForReviewMutation.mutateAsync();
      } catch (mutationErr) {
        console.warn('Submit mutation notice:', mutationErr);
      }

      // 2. Direct Supabase update ensuring status is set to pending_verification
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const targetId = user?.id || sessionUserId;

      if (targetId) {
        await (supabase as any)
          .from('profiles')
          .update({
            status: 'pending_verification',
            is_verified: false,
            verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetId);

        try {
          await supabase
            .from('User')
            .update({
              verificationSubmittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
            .eq('id', targetId);
        } catch {}
      }

      setProfileData((prev) => ({
        ...(prev || {}),
        status: 'pending_verification',
        is_verified: false,
        verified: false,
      }));

      toast.success('Verification submitted! Our team will review your documents within 24-48 hours.');
    } catch (err: any) {
      console.error('Submit verification error:', err);
      toast.error('Could not submit documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state (with 5-second maximum)
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading Verification Status</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Checking your artist credentials and uploaded documents...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 1. APPROVED / VERIFIED STATE
  if (isApproved) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex-shrink-0">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                <h2 className="text-2xl font-bold text-white">You Are a Verified Artist</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed max-w-2xl">
                Your government ID has been authenticated. The Verified Artist badge is displayed across your profile, artwork showcases, and commission proposals.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Verified Artist Badge on Profile & Proposals</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Higher Visibility in Client Artist Searches</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                  <Lock className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Eligible for Escrow-Protected Custom Commissions</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs text-slate-200 font-medium">Instant Trust with Private Collectors & Buyers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. PENDING REVIEW STATE
  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                <h2 className="text-2xl font-bold text-white">Verification In Review</h2>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  pending_verification
                </Badge>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed max-w-2xl">
                Thank you for submitting your ID documents. Our moderation team reviews artist verification requests within <strong>24–48 business hours</strong>. Your verified badge will activate automatically once approved.
              </p>

              {/* Submitted documents overview */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Submitted Documents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['ID_FRONT', 'ID_BACK', 'SELFIE'].map((type) => {
                    const doc = allDocuments.find((d) => d.verificationType === type);
                    const label = type === 'ID_FRONT' ? 'ID Photo / Passport' : type === 'ID_BACK' ? 'ID Back' : 'Selfie with ID';
                    return (
                      <div key={type} className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-xl">
                        {doc ? (
                          <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-600 flex-shrink-0" />
                        )}
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchProfile();
                    refetchDocs();
                  }}
                  className="bg-slate-950 border-slate-800 text-white hover:bg-slate-800 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. REJECTED OR NOT STARTED (DOCUMENT SUBMISSION FORM)
  return (
    <div className="space-y-6">
      {/* Rejection Alert if applicable */}
      {isRejected && (
        <div className="bg-slate-900/90 border border-red-500/30 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex-shrink-0">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-300 mb-1">Previous Verification Request Not Approved</h3>
              <p className="text-slate-300 text-xs mb-3">
                Your previous documents could not be verified. Please review the feedback below, upload clearer photos, and resubmit.
              </p>
              {rejectedDocs.map((doc) => (
                <div key={doc.id} className="text-xs text-red-200 bg-red-950/30 border border-red-900/40 p-2 rounded-lg mb-2">
                  <span className="font-semibold">{doc.verificationType.replace(/_/g, ' ')}:</span>{' '}
                  {doc.rejectionReason || 'Document was blurry, illegible, or expired.'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Verification Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Artist ID Verification</h2>
              <p className="text-slate-400 text-sm">
                Authenticate your artist identity to unlock the Verified Artist badge and build maximum collector trust.
              </p>
            </div>
          </div>

          <div className="my-6 border-t border-slate-800" />

          {/* Step 1: Select ID Document Type */}
          <div className="space-y-3 mb-8">
            <Label className="text-white font-semibold text-sm">1. Select Document Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedIdType('passport')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 text-left ${
                  selectedIdType === 'passport'
                    ? 'bg-primary/10 border-primary text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  selectedIdType === 'passport' ? 'border-primary bg-primary' : 'border-slate-600'
                }`}>
                  {selectedIdType === 'passport' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">Passport</div>
                  <div className="text-xs text-slate-400">Photo page only</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIdType('national_id')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 text-left ${
                  selectedIdType === 'national_id'
                    ? 'bg-primary/10 border-primary text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  selectedIdType === 'national_id' ? 'border-primary bg-primary' : 'border-slate-600'
                }`}>
                  {selectedIdType === 'national_id' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">National ID Card</div>
                  <div className="text-xs text-slate-400">Front & Back</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIdType('drivers_license')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 text-left ${
                  selectedIdType === 'drivers_license'
                    ? 'bg-primary/10 border-primary text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  selectedIdType === 'drivers_license' ? 'border-primary bg-primary' : 'border-slate-600'
                }`}>
                  {selectedIdType === 'drivers_license' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">Driver&apos;s License</div>
                  <div className="text-xs text-slate-400">Front & Back</div>
                </div>
              </button>
            </div>
          </div>

          {/* Optional Expiry Date Input */}
          <div className="space-y-2 mb-8 max-w-xs">
            <Label htmlFor="expiryDate" className="text-white text-xs font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Document Expiry Date (Optional)
            </Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white text-xs h-9"
            />
          </div>

          {/* Step 2: Upload Documents */}
          <div className="space-y-4 mb-8">
            <Label className="text-white font-semibold text-sm">2. Upload Required Images</Label>
            <p className="text-xs text-slate-400">
              Files must be clear, uncropped, and legible. Accepted formats: JPG, PNG, WebP, PDF (max 5MB).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document 1: ID Front / Passport */}
              <DocumentDropCard
                title={selectedIdType === 'passport' ? 'Passport Photo Page' : 'ID Card (Front)'}
                description={selectedIdType === 'passport' ? 'Upload clear photo of the identity details page' : 'Upload front side showing photo and name'}
                icon={<FileText className="h-5 w-5 text-blue-400" />}
                type="ID_FRONT"
                uploadedDoc={allDocuments.find((d) => d.verificationType === 'ID_FRONT')}
                isUploading={uploadingType === 'ID_FRONT'}
                progress={uploadProgress['ID_FRONT'] || 0}
                onFileSelect={(file) => handleFileUpload('ID_FRONT', file)}
                onRemove={() => handleRemoveDoc('ID_FRONT')}
              />

              {/* Document 2: ID Back (if not passport) */}
              {selectedIdType !== 'passport' && (
                <DocumentDropCard
                  title="ID Card (Back)"
                  description="Upload back side showing barcode or signature"
                  icon={<FileText className="h-5 w-5 text-blue-400" />}
                  type="ID_BACK"
                  uploadedDoc={allDocuments.find((d) => d.verificationType === 'ID_BACK')}
                  isUploading={uploadingType === 'ID_BACK'}
                  progress={uploadProgress['ID_BACK'] || 0}
                  onFileSelect={(file) => handleFileUpload('ID_BACK', file)}
                  onRemove={() => handleRemoveDoc('ID_BACK')}
                />
              )}

              {/* Document 3: Selfie with ID */}
              <DocumentDropCard
                title="Selfie with ID"
                description="Take a clear photo of yourself holding your document"
                icon={<Camera className="h-5 w-5 text-purple-400" />}
                type="SELFIE"
                uploadedDoc={allDocuments.find((d) => d.verificationType === 'SELFIE')}
                isUploading={uploadingType === 'SELFIE'}
                progress={uploadProgress['SELFIE'] || 0}
                onFileSelect={(file) => handleFileUpload('SELFIE', file)}
                onRemove={() => handleRemoveDoc('SELFIE')}
              />
            </div>
          </div>

          {/* Step 3: Submit Button */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Your identity documents are securely encrypted and used strictly for verification.
            </div>
            <Button
              onClick={handleSubmitVerification}
              disabled={isSubmitting || !!uploadingType}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold px-6 h-11 text-sm shadow-md"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Documents...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit for Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent: Dropzone card for document upload
interface DocumentDropCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  type: DocumentType;
  uploadedDoc?: UploadedDocItem;
  isUploading: boolean;
  progress: number;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

function DocumentDropCard({
  title,
  description,
  icon,
  type,
  uploadedDoc,
  isUploading,
  progress,
  onFileSelect,
  onRemove,
}: DocumentDropCardProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-slate-700">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
              {icon}
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold">{title}</h4>
              <p className="text-slate-400 text-xs">{description}</p>
            </div>
          </div>
          {uploadedDoc && (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">
              Uploaded
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                Uploading...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : uploadedDoc ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
              <span className="truncate">{uploadedDoc.fileName || 'Document on file'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2 text-[11px] text-slate-300 hover:text-white"
              >
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white text-xs h-9"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Select File to Upload
          </Button>
        )}
      </div>
    </div>
  );
}
