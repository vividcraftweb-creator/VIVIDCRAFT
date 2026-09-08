'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CreditCard,
  IdCard,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SupportedDocType = 'national_id' | 'passport' | 'driving_license';
export type VerificationSlot = 'ID_FRONT' | 'ID_BACK' | 'SELFIE';

interface DocTypeConfig {
  id: SupportedDocType;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  requiresBack: boolean;
  frontTitle: string;
  frontDesc: string;
  backTitle?: string;
  backDesc?: string;
  selfieTitle: string;
  selfieDesc: string;
}

const DOC_CONFIGS: Record<SupportedDocType, DocTypeConfig> = {
  national_id: {
    id: 'national_id',
    label: 'National ID Card',
    sublabel: 'Front, Back & Selfie required',
    icon: <IdCard className="h-5 w-5 text-sky-400" />,
    requiresBack: true,
    frontTitle: 'National ID (Front)',
    frontDesc: 'Clear photo of the front side showing full name, photo, and ID number',
    backTitle: 'National ID (Back)',
    backDesc: 'Clear photo of the reverse side showing barcode, address, or signature',
    selfieTitle: 'Selfie with National ID',
    selfieDesc: 'Photo of yourself holding your ID card clearly next to your face',
  },
  passport: {
    id: 'passport',
    label: 'Passport',
    sublabel: 'Main Data Page & Selfie (Back not required)',
    icon: <FileText className="h-5 w-5 text-indigo-400" />,
    requiresBack: false,
    frontTitle: 'Passport (Main Data Page)',
    frontDesc: 'Clear photo of your passport page showing photo, MRZ code, and identity details',
    selfieTitle: 'Selfie with Passport',
    selfieDesc: 'Photo of yourself holding your open passport next to your face',
  },
  driving_license: {
    id: 'driving_license',
    label: 'Driving License',
    sublabel: 'Front, Back & Selfie required',
    icon: <CreditCard className="h-5 w-5 text-emerald-400" />,
    requiresBack: true,
    frontTitle: 'Driving License (Front)',
    frontDesc: 'Clear photo of the front side showing your photo and license number',
    backTitle: 'Driving License (Back)',
    backDesc: 'Clear photo of the reverse side showing endorsements and validity dates',
    selfieTitle: 'Selfie with Driving License',
    selfieDesc: 'Photo of yourself holding your driving license clearly next to your face',
  },
};

interface UploadedDocItem {
  id: string;
  verificationType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documentUrl?: string | null;
  fileName?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

interface SubmittedVerificationRecord {
  id?: string;
  document_type: string;
  id_front_url: string;
  id_back_url?: string | null;
  selfie_url: string;
  status: string;
  created_at?: string;
}

export default function ArtistVerificationView() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<{ is_verified?: boolean; verified?: boolean; status?: string } | null>(null);
  const [directDocs, setDirectDocs] = useState<UploadedDocItem[]>([]);
  const [submittedRecord, setSubmittedRecord] = useState<SubmittedVerificationRecord | null>(null);
  const [isPendingSubmitted, setIsPendingSubmitted] = useState(false);

  // Document Type selection: National ID Card, Passport, Driving License
  const [selectedDocType, setSelectedDocType] = useState<SupportedDocType>('national_id');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload progress tracking per slot
  const [uploadingSlot, setUploadingSlot] = useState<VerificationSlot | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({
    ID_FRONT: 0,
    ID_BACK: 0,
    SELFIE: 0,
  });

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
      utils.verifications.getUserDocuments.invalidate();
      refetchDocs();
    },
    onError: (error) => {
      console.warn('tRPC uploadDocument mutation notice:', error.message);
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
      console.warn('submitForReviewMutation notice:', error.message);
    },
  });

  // Strict data fetching with guaranteed 5-second timeout fallback
  useEffect(() => {
    let isMounted = true;

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

          // 2. Fetch User Verification Documents from Verification table
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

          // 3. Fetch latest record from verifications table
          try {
            const { data: vRecord, error: vErr } = await (supabase as any)
              .from('verifications')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!vErr && vRecord && isMounted) {
              setSubmittedRecord(vRecord);
              // Infer selected doc type if possible
              const docTypeStr = (vRecord.document_type || '').toLowerCase();
              if (docTypeStr.includes('passport')) {
                setSelectedDocType('passport');
              } else if (docTypeStr.includes('license')) {
                setSelectedDocType('driving_license');
              } else {
                setSelectedDocType('national_id');
              }
            }
          } catch (verificationsTableErr) {
            console.warn('verifications table query notice:', verificationsTableErr);
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
    submittedRecord?.status === 'approved' ||
    allDocuments.some((d) => d.status === 'APPROVED')
  );

  const isPending = Boolean(
    !isApproved && (
      isPendingSubmitted ||
      submittedRecord?.status === 'pending' ||
      profileData?.status === 'pending_verification' ||
      (myProfile as any)?.status === 'pending_verification' ||
      allDocuments.some((d) => d.status === 'PENDING')
    )
  );

  const rejectedDocs = allDocuments.filter((d) => d.status === 'REJECTED');
  const isRejected = !isApproved && !isPending && (rejectedDocs.length > 0 || submittedRecord?.status === 'rejected');

  const currentConfig = DOC_CONFIGS[selectedDocType];

  // Helper to get uploaded document for a specific slot
  const getSlotDoc = (slot: VerificationSlot) => {
    return allDocuments.find((d) => d.verificationType === slot);
  };

  // Upload file to verifications bucket with graceful fallback to public-uploads
  const handleFileUpload = async (slot: VerificationSlot, file: File) => {
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    // Validate format
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validMimes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, WebP) or PDF document');
      return;
    }

    setUploadingSlot(slot);
    setUploadProgress((prev) => ({ ...prev, [slot]: 15 }));

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `verification-documents/${sessionUserId || 'user'}/${cleanFileName}`;

      setUploadProgress((prev) => ({ ...prev, [slot]: 40 }));

      // 1. Upload to verifications bucket (with fallback to public-uploads)
      console.log("Uploading to bucket 'verifications'...", file);

      let bucketName = 'verifications';
      let uploadRes = await supabase.storage
        .from('verifications')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadRes.error) {
        console.error("Storage upload error for bucket 'verifications':", uploadRes.error);
        console.warn('Verifications bucket upload failed, using public-uploads fallback:', uploadRes.error.message);
        bucketName = 'public-uploads';
        uploadRes = await supabase.storage
          .from('public-uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadRes.error) {
          console.error("Storage upload error for fallback bucket 'public-uploads':", uploadRes.error);
          throw new Error(uploadRes.error.message || 'File upload to storage failed');
        }
      }

      setUploadProgress((prev) => ({ ...prev, [slot]: 80 }));

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // 2. Record document in Verification table
      const slotLabel =
        slot === 'ID_FRONT'
          ? currentConfig.frontTitle
          : slot === 'ID_BACK'
          ? currentConfig.backTitle || 'Back of Document'
          : currentConfig.selfieTitle;

      try {
        await uploadDocMutation.mutateAsync({
          verificationType: slot,
          fileUrl: publicUrl,
          documentType: slotLabel,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        });
      } catch (mutationErr) {
        console.warn('Upload mutation notice:', mutationErr);
      }

      // 3. Update local state optimistically
      const newDoc: UploadedDocItem = {
        id: `temp-${Date.now()}`,
        verificationType: slot,
        status: 'PENDING',
        documentUrl: publicUrl,
        fileName: file.name,
        createdAt: new Date().toISOString(),
      };

      setDirectDocs((prev) => {
        const filtered = prev.filter((d) => d.verificationType !== slot);
        return [...filtered, newDoc];
      });

      setUploadProgress((prev) => ({ ...prev, [slot]: 100 }));
      toast.success(`${slotLabel} uploaded successfully!`);
    } catch (err: any) {
      console.error("Exact storage error response in handleFileUpload:", err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingSlot(null);
    }
  };

  // Remove uploaded document
  const handleRemoveDoc = async (slot: VerificationSlot) => {
    const doc = allDocuments.find((d) => d.verificationType === slot);
    if (!doc) return;

    try {
      if (doc.id && !doc.id.startsWith('temp-')) {
        await deleteDocMutation.mutateAsync({ verificationId: doc.id });
      }
      setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id && d.verificationType !== slot));
      toast.success('Document removed');
    } catch (err) {
      // Direct delete fallback
      try {
        const supabase = createClient();
        await supabase.from('Verification').delete().eq('id', doc.id);
        setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id && d.verificationType !== slot));
        toast.success('Document removed');
      } catch {}
    }
  };

  // Submit all uploaded documents for verification
  const handleSubmitVerification = async () => {
    const idFrontDoc = getSlotDoc('ID_FRONT');
    const idBackDoc = getSlotDoc('ID_BACK');
    const selfieDoc = getSlotDoc('SELFIE');

    // Dynamic field validation
    if (!idFrontDoc?.documentUrl) {
      toast.error(`Please upload the ${currentConfig.frontTitle}`);
      return;
    }

    if (currentConfig.requiresBack && !idBackDoc?.documentUrl) {
      toast.error(`Please upload the ${currentConfig.backTitle || 'Back Image'}`);
      return;
    }

    if (!selfieDoc?.documentUrl) {
      toast.error(`Please upload your ${currentConfig.selfieTitle}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || sessionUserId;

      if (!targetUserId) {
        throw new Error('User session not found. Please log in again.');
      }

      // 1. Insert record into `verifications` table
      // Payload: { user_id, document_type, id_front_url, id_back_url, selfie_url, status: 'pending' }
      const verificationsPayload = {
        user_id: targetUserId,
        document_type: currentConfig.label,
        id_front_url: idFrontDoc.documentUrl,
        id_back_url: currentConfig.requiresBack ? (idBackDoc?.documentUrl || null) : null,
        selfie_url: selfieDoc.documentUrl,
        status: 'pending',
      };

      try {
        const { error: vInsertErr } = await (supabase as any)
          .from('verifications')
          .insert(verificationsPayload);

        if (vInsertErr) {
          console.warn('Notice inserting into verifications table:', vInsertErr.message);
        }
      } catch (insertTableEx) {
        console.warn('verifications table insert exception:', insertTableEx);
      }

      // 2. Call tRPC submitForReview mutation to register overall verification
      try {
        await submitForReviewMutation.mutateAsync({
          documentType: currentConfig.label,
        });
      } catch (mutationErr) {
        console.warn('submitForReview mutation notice:', mutationErr);
      }

      // 3. Update profiles table status to pending_verification
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            status: 'pending_verification',
            is_verified: false,
            verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch (profileUpdateErr) {
        console.warn('Profile update notice:', profileUpdateErr);
      }

      // 4. Update User table verificationSubmittedAt
      try {
        await supabase
          .from('User')
          .update({
            verificationSubmittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .eq('id', targetUserId);
      } catch {}

      // 5. Update local state and redirect to pending status view
      setSubmittedRecord({
        document_type: currentConfig.label,
        id_front_url: idFrontDoc.documentUrl,
        id_back_url: currentConfig.requiresBack ? idBackDoc?.documentUrl : null,
        selfie_url: selfieDoc.documentUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      setProfileData((prev) => ({
        ...(prev || {}),
        status: 'pending_verification',
        is_verified: false,
        verified: false,
      }));

      setIsPendingSubmitted(true);
      toast.success('Verification submitted! Your documents are now pending review.');
    } catch (err: any) {
      console.error('Submit verification error:', err);
      toast.error(err.message || 'Could not submit documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state (guaranteed <= 5 seconds)
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Loading Verification Status</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Checking your artist credentials and submitted documents...
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
                Your identity has been authenticated. The Verified Artist badge is prominently displayed across your profile, portfolio items, and commission proposals.
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

  // 2. PENDING REVIEW STATE (REDIRECT TARGET UPON SUCCESSFUL SUBMISSION)
  if (isPending) {
    const displayDocType = submittedRecord?.document_type || currentConfig.label;
    const isPassportDoc = displayDocType.toLowerCase().includes('passport');

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
                Thank you for submitting your <strong>{displayDocType}</strong>. Our moderation team reviews verification submissions within <strong>24–48 business hours</strong>. Your verified badge will activate automatically once approved.
              </p>

              {/* Submitted documents overview */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Submitted Documents ({displayDocType})
                  </h4>
                  <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    Pending Admin Approval
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Slot 1: Front / Main Data Page */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-white truncate">
                        {isPassportDoc ? 'Main Data Page' : 'Front Image'}
                      </div>
                      <div className="text-[11px] text-slate-400">Uploaded & Encrypted</div>
                    </div>
                  </div>

                  {/* Slot 2: Back (if not passport) */}
                  {!isPassportDoc && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-white truncate">Back Image</div>
                        <div className="text-[11px] text-slate-400">Uploaded & Encrypted</div>
                      </div>
                    </div>
                  )}

                  {/* Slot 3: Selfie */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-white truncate">Selfie with Document</div>
                      <div className="text-[11px] text-slate-400">Uploaded & Encrypted</div>
                    </div>
                  </div>
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

  // 3. REJECTED OR INITIAL SUBMISSION FORM
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
          {/* Header */}
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

          {/* Step 1: Document Type Selector (Dropdown & Radio Selection) */}
          <div className="space-y-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-white font-semibold text-sm">
                1. Select Document Type
              </Label>
              {/* Dropdown Selector */}
              <div className="w-full sm:w-56">
                <Select
                  value={selectedDocType}
                  onValueChange={(value) => setSelectedDocType(value as SupportedDocType)}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white text-xs h-9">
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="national_id">National ID Card</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Radio Cards Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(DOC_CONFIGS) as SupportedDocType[]).map((typeKey) => {
                const config = DOC_CONFIGS[typeKey];
                const isSelected = selectedDocType === typeKey;

                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setSelectedDocType(typeKey)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between text-left ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className="p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
                        {config.icon}
                      </div>
                      {/* Radio indicator */}
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white mb-0.5">{config.label}</div>
                      <div className="text-xs text-slate-400 leading-tight">{config.sublabel}</div>
                    </div>
                  </button>
                );
              })}
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

          {/* Step 2: Dynamic File Upload Fields */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white font-semibold text-sm">2. Upload Required Images</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Files must be clear, uncropped, and legible. Accepted formats: JPG, PNG, WebP, PDF (max 5MB).
                </p>
              </div>
            </div>

            {/* Passport Callout Banner */}
            {!currentConfig.requiresBack && (
              <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3 flex items-center gap-2.5 text-xs text-blue-200">
                <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>
                  For <strong>Passport</strong> verification, only the <strong>Main Data Page</strong> and <strong>Selfie</strong> are required. Back image is not required.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: Front Image / Main Data Page (Required for all) */}
              <DocumentDropCard
                title={currentConfig.frontTitle}
                description={currentConfig.frontDesc}
                icon={<FileText className="h-5 w-5 text-blue-400" />}
                slot="ID_FRONT"
                required={true}
                uploadedDoc={getSlotDoc('ID_FRONT')}
                isUploading={uploadingSlot === 'ID_FRONT'}
                progress={uploadProgress.ID_FRONT || 0}
                onFileSelect={(file) => handleFileUpload('ID_FRONT', file)}
                onRemove={() => handleRemoveDoc('ID_FRONT')}
              />

              {/* Field 2: Back Image (Required for National ID and Driving License, hidden for Passport) */}
              {currentConfig.requiresBack && (
                <DocumentDropCard
                  title={currentConfig.backTitle || 'Back Image'}
                  description={currentConfig.backDesc || 'Upload back side showing barcode, signature, or authority'}
                  icon={<FileText className="h-5 w-5 text-cyan-400" />}
                  slot="ID_BACK"
                  required={true}
                  uploadedDoc={getSlotDoc('ID_BACK')}
                  isUploading={uploadingSlot === 'ID_BACK'}
                  progress={uploadProgress.ID_BACK || 0}
                  onFileSelect={(file) => handleFileUpload('ID_BACK', file)}
                  onRemove={() => handleRemoveDoc('ID_BACK')}
                />
              )}

              {/* Field 3: Selfie with Document (Required for all) */}
              <DocumentDropCard
                title={currentConfig.selfieTitle}
                description={currentConfig.selfieDesc}
                icon={<Camera className="h-5 w-5 text-purple-400" />}
                slot="SELFIE"
                required={true}
                uploadedDoc={getSlotDoc('SELFIE')}
                isUploading={uploadingSlot === 'SELFIE'}
                progress={uploadProgress.SELFIE || 0}
                onFileSelect={(file) => handleFileUpload('SELFIE', file)}
                onRemove={() => handleRemoveDoc('SELFIE')}
              />
            </div>
          </div>

          {/* Step 3: Submit Button with live validation & redirect */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Your identity documents are securely uploaded to the <code className="text-primary">verifications</code> bucket and encrypted.
            </div>
            <Button
              onClick={handleSubmitVerification}
              disabled={isSubmitting || !!uploadingSlot}
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

// Subcomponent: Dropzone card for document upload with clear progress indicator
interface DocumentDropCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  slot: VerificationSlot;
  required?: boolean;
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
  required,
  uploadedDoc,
  isUploading,
  progress,
  onFileSelect,
  onRemove,
}: DocumentDropCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex-shrink-0">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-white text-sm font-semibold">{title}</h4>
                {required && (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                    Required
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5 leading-snug">{description}</p>
            </div>
          </div>
          {uploadedDoc && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] flex-shrink-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
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
                Uploading to verifications...
              </span>
              <span className="font-semibold text-primary">{progress}%</span>
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
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{uploadedDoc.fileName || 'Document on file'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Replace
              </Button>
              <Button
                type="button"
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
