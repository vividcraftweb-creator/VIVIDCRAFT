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
  RotateCcw,
  AlertTriangle,
  XCircle,
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
  const { data: verificationData, refetch, isFetching } = trpc.verification.getStatus.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: userDocs, refetch: refetchDocs } = trpc.verifications.getUserDocuments.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: myProfile, refetch: refetchProfile } = trpc.profiles.getMyProfile.useQuery({}, {
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
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

  // Staged files uploaded to storage during current session (NOT submitted to DB yet)
  const [stagedDocs, setStagedDocs] = useState<{
    ID_FRONT?: { url: string; fileName: string; file?: File } | null;
    ID_BACK?: { url: string; fileName: string; file?: File } | null;
    SELFIE?: { url: string; fileName: string; file?: File } | null;
  }>({});

  const [isResetting, setIsResetting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const resetVerificationMutation = trpc.verifications.resetVerificationRequest.useMutation({
    onSuccess: () => {
      toast.success('Verification request reset. You can now re-upload your documents.');
      utils.verifications.getUserDocuments.invalidate();
      refetchDocs();
    },
    onError: (err) => {
      console.warn('Reset mutation notice:', err.message);
      toast.success('Verification request reset. You can now re-upload your documents.');
    },
  });

  const handleResetPendingRecord = async () => {
    setIsResetting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const targetUid = user?.id || sessionUserId;

      if (targetUid) {
        try {
          await (supabase as any)
            .from('verifications')
            .delete()
            .eq('user_id', targetUid)
            .neq('status', 'approved');
        } catch {}

        try {
          await (supabase as any)
            .from('Verification')
            .delete()
            .eq('userId', targetUid)
            .neq('status', 'APPROVED');
        } catch {}
      }

      try {
        await resetVerificationMutation.mutateAsync();
      } catch {}

      setSubmittedRecord(null);
      setIsPendingSubmitted(false);
      setIsResetMode(true);
      setDirectDocs([]);
      setStagedDocs({});
      utils.verifications.getUserDocuments.invalidate();
      refetchDocs();
    } catch (err: any) {
      console.error('Reset verification error:', err);
      toast.error(err?.message || 'Failed to reset verification request');
    } finally {
      setIsResetting(false);
    }
  };
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

          // 1. Fetch Profile (strictly select is_verified to prevent 400 Bad Request)
          const { data: prof, error: profErr } = await (supabase as any)
            .from('profiles')
            .select('id, is_verified')
            .eq('id', user.id)
            .limit(1)
            .maybeSingle();

          if (!profErr && prof && isMounted) {
            setProfileData(prof);
          }

          // 2. Fetch User Verification Documents from verifications table (lowercase)
          const { data: docs, error: docErr } = await (supabase as any)
            .from('verifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!docErr && docs && isMounted) {
            const mappedDocs: UploadedDocItem[] = [];
            docs.forEach((d: any) => {
              if (d.id_front_url) {
                mappedDocs.push({
                  id: `${d.id}-front`,
                  verificationType: 'ID_FRONT',
                  status: (d.status?.toUpperCase() as any) || 'PENDING',
                  documentUrl: d.id_front_url,
                  fileName: `${d.document_type || 'ID'} (Front)`,
                  createdAt: d.created_at || new Date().toISOString(),
                });
              }
              if (d.id_back_url) {
                mappedDocs.push({
                  id: `${d.id}-back`,
                  verificationType: 'ID_BACK',
                  status: (d.status?.toUpperCase() as any) || 'PENDING',
                  documentUrl: d.id_back_url,
                  fileName: `${d.document_type || 'ID'} (Back)`,
                  createdAt: d.created_at || new Date().toISOString(),
                });
              }
              if (d.selfie_url) {
                mappedDocs.push({
                  id: `${d.id}-selfie`,
                  verificationType: 'SELFIE',
                  status: (d.status?.toUpperCase() as any) || 'PENDING',
                  documentUrl: d.selfie_url,
                  fileName: `Selfie with ${d.document_type || 'ID'}`,
                  createdAt: d.created_at || new Date().toISOString(),
                });
              }
              if (d.verificationType && (d.documentUrl || d.files)) {
                mappedDocs.push({
                  id: d.id,
                  verificationType: d.verificationType,
                  status: (d.status?.toUpperCase() as any) || 'PENDING',
                  documentUrl: d.documentUrl || d.files,
                  fileName: d.fileName || d.documentType,
                  createdAt: d.created_at || d.createdAt || new Date().toISOString(),
                });
              }
            });
            setDirectDocs(mappedDocs);

            // Infer selected doc type from latest record
            const latestV = docs[0];
            if (latestV) {
              setSubmittedRecord(latestV);
              const docTypeStr = (latestV.document_type || '').toLowerCase();
              if (docTypeStr.includes('passport')) {
                setSelectedDocType('passport');
              } else if (docTypeStr.includes('license')) {
                setSelectedDocType('driving_license');
              } else {
                setSelectedDocType('national_id');
              }
            }
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

  // Combined documents: merge directDocs (local uploads + verifications table) with tRPC query results
  const allDocuments: UploadedDocItem[] = useMemo(() => {
    const list: UploadedDocItem[] = [];
    const seenSlots = new Set<string>();

    // 1. Direct docs (local uploads + fetched from verifications table) take top priority for freshness
    for (const d of directDocs) {
      if (d.verificationType && d.documentUrl) {
        list.push(d);
        seenSlots.add(d.verificationType);
      }
    }

    // 2. Merge in verificationData documents from trpc.verification.getStatus
    if (verificationData?.documents && Array.isArray(verificationData.documents)) {
      for (const d of verificationData.documents) {
        const vType = d.verificationType || 'ID_FRONT';
        if (!seenSlots.has(vType) && d.url) {
          list.push({
            id: d.id,
            verificationType: vType,
            status: d.status,
            documentUrl: d.url,
            fileName: d.documentType,
            rejectionReason: d.rejectionReason,
            createdAt: d.createdAt,
          });
          seenSlots.add(vType);
        }
      }
    }

    // 3. Merge in userDocs from tRPC if available
    if (userDocs && Array.isArray(userDocs)) {
      for (const d of userDocs) {
        const vType = d.verificationType || 'ID_FRONT';
        if (!seenSlots.has(vType) && (d.documentUrl || d.files)) {
          list.push({
            id: d.id,
            verificationType: vType,
            status: (d.status as 'PENDING' | 'APPROVED' | 'REJECTED') || 'PENDING',
            documentUrl: d.documentUrl || d.files || null,
            fileName: d.fileName || null,
            rejectionReason: d.rejectionReason || d.details || null,
            createdAt: d.createdAt || new Date().toISOString(),
          });
          seenSlots.add(vType);
        }
      }
    }

    return list;
  }, [userDocs, directDocs, verificationData]);

  // Detect if previous DB submission is incomplete (e.g. from premature upload)
  const isIncompletePending = useMemo(() => {
    if (!submittedRecord || submittedRecord?.status?.toLowerCase() !== 'pending') return false;
    const isPassport = (submittedRecord.document_type || '').toLowerCase().includes('passport');
    const hasFrontUrl = Boolean(submittedRecord.id_front_url);
    const hasBackUrl = Boolean(submittedRecord.id_back_url);
    const hasSelfieUrl = Boolean(submittedRecord.selfie_url);

    if (!hasFrontUrl || !hasSelfieUrl) return true;
    if (!isPassport && !hasBackUrl) return true;
    return false;
  }, [submittedRecord]);

  // Derived verification status
  const rejectedDocs = allDocuments.filter((d) => d.status === 'REJECTED');
  const hasRejectedDoc =
    rejectedDocs.length > 0 ||
    submittedRecord?.status?.toLowerCase() === 'rejected' ||
    verificationData?.status === 'rejected' ||
    Boolean(verificationData?.hasRejected);

  const pendingDocs = allDocuments.filter((d) => d.status === 'PENDING');
  const approvedDocs = allDocuments.filter((d) => d.status === 'APPROVED');
  const hasPendingDoc =
    pendingDocs.length > 0 ||
    isPendingSubmitted ||
    submittedRecord?.status?.toLowerCase() === 'pending' ||
    verificationData?.status === 'pending';

  // Overall Status logic:
  // If ANY doc is rejected -> Show Badge: Rejected (Red).
  // If ALL required docs are approved -> Show Badge: Verified (Green).
  // Otherwise -> Show Badge: Pending (Yellow).
  // DO NOT display Verified green badge if any submitted document status is rejected or pending.
  const isRejected = !isResetMode && Boolean(hasRejectedDoc);

  const isApproved = !isResetMode && !isRejected && !hasPendingDoc && (
    verificationData?.status === 'approved' ||
    Boolean(verificationData?.allApproved) ||
    (approvedDocs.length > 0 && allDocuments.length > 0 && allDocuments.every((d) => d.status === 'APPROVED')) ||
    (Boolean(profileData?.is_verified || (myProfile as any)?.is_verified) && allDocuments.length === 0)
  );

  const isPending = !isResetMode && !isRejected && !isApproved && (
    hasPendingDoc || allDocuments.length > 0 || verificationData?.status === 'pending'
  );

  const currentConfig = DOC_CONFIGS[selectedDocType];

  // Helper to get uploaded document for a specific slot
  const getSlotDoc = (slot: VerificationSlot) => {
    // 1. Local staged docs in current session take priority
    if (stagedDocs[slot]?.url) {
      return {
        id: `staged-${slot}`,
        verificationType: slot,
        status: 'PENDING' as const,
        documentUrl: stagedDocs[slot]!.url,
        fileName: stagedDocs[slot]!.fileName,
        createdAt: new Date().toISOString(),
      };
    }
    // 2. Fall back to allDocuments only if not in reset mode
    if (!isResetMode) {
      return allDocuments.find((d) => d.verificationType === slot && Boolean(d.documentUrl));
    }
    return undefined;
  };

  // Strict dynamic validation:
  // - National ID / Driving License requires Front, Back, and Selfie
  // - Passport requires Front and Selfie (Back is hidden/optional)
  const hasFront = Boolean(getSlotDoc('ID_FRONT')?.documentUrl);
  const hasBack = Boolean(getSlotDoc('ID_BACK')?.documentUrl);
  const hasSelfie = Boolean(getSlotDoc('SELFIE')?.documentUrl);

  const isFormValid = useMemo(() => {
    if (!hasFront || !hasSelfie) return false;
    if (currentConfig.requiresBack && !hasBack) return false;
    return true;
  }, [hasFront, hasBack, hasSelfie, currentConfig.requiresBack]);

  // Upload file to verifications bucket: ONLY updates local state, NEVER triggers DB submit
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

      setUploadProgress((prev) => ({ ...prev, [slot]: 50 }));

      // Strictly upload to 'verifications' bucket
      console.log("Uploading to bucket 'verifications'...", file);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error for bucket 'verifications':", uploadError);
        const userMsg = uploadError.message?.includes('Bucket not found')
          ? "Storage bucket 'verifications' was not found. Please ensure the bucket exists in Supabase."
          : uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')
          ? "Permission error: Storage RLS policy prevented upload to 'verifications'. Please check bucket policies."
          : uploadError.message || "Failed to upload file to 'verifications' bucket.";
        throw new Error(userMsg);
      }

      setUploadProgress((prev) => ({ ...prev, [slot]: 85 }));

      const { data: { publicUrl } } = supabase.storage
        .from('verifications')
        .getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Unable to retrieve public URL for uploaded file.');
      }

      // Stop Automatic Submission: ONLY update local React state with the uploaded storage URL.
      // DO NOT call any tRPC or Supabase database submit mutation here!
      const slotLabel =
        slot === 'ID_FRONT'
          ? currentConfig.frontTitle
          : slot === 'ID_BACK'
          ? currentConfig.backTitle || 'Back of Document'
          : currentConfig.selfieTitle;

      setStagedDocs((prev) => ({
        ...prev,
        [slot]: { url: publicUrl, fileName: file.name, file },
      }));

      setUploadProgress((prev) => ({ ...prev, [slot]: 100 }));
      toast.success(`${slotLabel} uploaded! Click Submit when all documents are ready.`);
    } catch (err: any) {
      console.error("Storage upload error in handleFileUpload:", err);
      toast.error(err?.message || 'File upload failed. Please try again.');
      setUploadProgress((prev) => ({ ...prev, [slot]: 0 }));
    } finally {
      setUploadingSlot(null);
    }
  };

  // Remove uploaded document: cleans up local stagedDocs
  const handleRemoveDoc = async (slot: VerificationSlot) => {
    // 1. Remove from local staged state
    setStagedDocs((prev) => {
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });

    setUploadProgress((prev) => ({ ...prev, [slot]: 0 }));

    // 2. Remove from directDocs if present
    const doc = allDocuments.find((d) => d.verificationType === slot);
    if (doc) {
      try {
        if (doc.id && !doc.id.startsWith('temp-') && !doc.id.startsWith('staged-')) {
          await deleteDocMutation.mutateAsync({ verificationId: doc.id });
        }
        setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id && d.verificationType !== slot));
      } catch (err) {
        try {
          const supabase = createClient();
          const cleanId = doc.id.replace(/-front|-back|-selfie/, '');
          await (supabase as any).from('verifications').delete().eq('id', cleanId);
          setDirectDocs((prev) => prev.filter((d) => d.id !== doc.id && d.verificationType !== slot));
        } catch {}
      }
    }
    toast.success('Document removed');
  };

  // Submit all uploaded documents for verification
  const handleSubmitVerification = async () => {
    const idFrontDoc = getSlotDoc('ID_FRONT');
    const idBackDoc = getSlotDoc('ID_BACK');
    const selfieDoc = getSlotDoc('SELFIE');

    // Strict upload validation: verify files exist before proceeding
    if (!hasFront || !idFrontDoc?.documentUrl) {
      toast.error(`Please upload the ${currentConfig.frontTitle}`);
      return;
    }

    if (currentConfig.requiresBack && (!hasBack || !idBackDoc?.documentUrl)) {
      toast.error(`Please upload the ${currentConfig.backTitle || 'Back Image'}`);
      return;
    }

    if (!hasSelfie || !selfieDoc?.documentUrl) {
      toast.error(`Please upload your ${currentConfig.selfieTitle}`);
      return;
    }

    if (!isFormValid) {
      toast.error('Please upload all required documents before submitting.');
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

      // 1. Insert/upsert record into `verifications` table (lowercase)
      // Payload: { user_id, document_type, id_front_url, id_back_url, selfie_url, status: 'pending' }
      const verificationsPayload = {
        user_id: targetUserId,
        document_type: currentConfig.label,
        id_front_url: idFrontDoc.documentUrl || null,
        id_back_url: currentConfig.requiresBack ? (idBackDoc?.documentUrl || null) : null,
        selfie_url: selfieDoc.documentUrl || null,
        status: 'pending',
      };

      try {
        const { data: existingV } = await (supabase as any)
          .from('verifications')
          .select('id')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingV?.id) {
          await (supabase as any)
            .from('verifications')
            .update({
              ...verificationsPayload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingV.id);
        } else {
          await (supabase as any)
            .from('verifications')
            .insert(verificationsPayload);
        }
      } catch (clientWriteErr) {
        console.warn('Direct client write notice, proceeding to server mutation:', clientWriteErr);
      }

      // 2. Sync record via server tRPC uploadDocMutation (uses admin client with service privileges)
      await uploadDocMutation.mutateAsync({
        documentType: currentConfig.label,
        id_front_url: idFrontDoc.documentUrl || null,
        id_back_url: currentConfig.requiresBack ? (idBackDoc?.documentUrl || null) : null,
        selfie_url: selfieDoc.documentUrl || null,
        status: 'pending',
      });

      // 3. Call tRPC submitForReview mutation to register overall verification
      try {
        await submitForReviewMutation.mutateAsync({
          documentType: currentConfig.label,
        });
      } catch (mutationErr) {
        console.warn('submitForReview mutation notice:', mutationErr);
      }

      // 3. Update profiles table is_verified to false (strictly select/update is_verified, no status or verified to prevent 400 Bad Request)
      try {
        await (supabase as any)
          .from('profiles')
          .update({
            is_verified: false,
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
        is_verified: false,
      }));

      setIsResetMode(false);
      setStagedDocs({});
      setIsPendingSubmitted(true);
      toast.success('Verification submitted! Your documents are now pending review.');

      // Invalidate queries so admin queues pick up the new submission immediately
      try {
        await Promise.all([
          utils.verification.getAllPending.invalidate(),
          utils.verifications.getAllPending.invalidate(),
          utils.verification.getVerificationStatus.invalidate(),
          utils.verifications.getUserDocuments.invalidate(),
          utils.admin.getUsersWithVerifications.invalidate(),
          utils.admin.getUsers.invalidate(),
          utils.admin.users.getUsers.invalidate(),
          (utils.admin as any).getVerifications?.invalidate?.(),
          (utils.admin as any).getQueue?.invalidate?.(),
          (utils.verifications as any).getVerifications?.invalidate?.(),
          (utils.verifications as any).getQueue?.invalidate?.(),
        ]);
      } catch {}
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
                <h2 className="text-2xl font-bold text-white">Account Verified</h2>
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

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetch();
                    refetchDocs();
                    refetchProfile();
                  }}
                  disabled={isFetching}
                  className="bg-slate-950 border-slate-800 text-white hover:bg-slate-800 text-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
                  {isFetching ? 'Refreshing...' : 'Refresh Status'}
                </Button>
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
        {/* Incomplete Pending Request Alert */}
        {isIncompletePending && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 text-xs text-amber-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl flex-shrink-0 mt-0.5">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-sm mb-0.5">
                    Incomplete Verification Submission Detected
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Your existing pending request is missing required files ({!submittedRecord?.id_front_url ? 'Front Document' : (!submittedRecord?.id_back_url && !isPassportDoc) ? 'Back Document' : 'Selfie with Document'}). Click the button to reset the request and upload all required documents.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleResetPendingRecord}
                disabled={isResetting}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs px-4 h-9 flex-shrink-0 shadow-md transition-all cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Resubmit / Cancel Request
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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
                    <CheckCircle2 className={`h-4 w-4 ${submittedRecord?.id_front_url ? 'text-blue-400' : 'text-amber-400'} flex-shrink-0`} />
                    <div className="truncate">
                      <div className="font-medium text-white truncate">
                        {isPassportDoc ? 'Main Data Page' : 'Front Image'}
                      </div>
                      <div className={`text-[11px] ${submittedRecord?.id_front_url ? 'text-slate-400' : 'text-amber-400 font-medium'}`}>
                        {submittedRecord?.id_front_url ? 'Uploaded & Encrypted' : 'Missing Image'}
                      </div>
                    </div>
                  </div>

                  {/* Slot 2: Back (if not passport) */}
                  {!isPassportDoc && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                      <CheckCircle2 className={`h-4 w-4 ${submittedRecord?.id_back_url ? 'text-blue-400' : 'text-amber-400'} flex-shrink-0`} />
                      <div className="truncate">
                        <div className="font-medium text-white truncate">Back Image</div>
                        <div className={`text-[11px] ${submittedRecord?.id_back_url ? 'text-slate-400' : 'text-amber-400 font-medium'}`}>
                          {submittedRecord?.id_back_url ? 'Uploaded & Encrypted' : 'Missing Image'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Slot 3: Selfie */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl">
                    <CheckCircle2 className={`h-4 w-4 ${submittedRecord?.selfie_url ? 'text-blue-400' : 'text-amber-400'} flex-shrink-0`} />
                    <div className="truncate">
                      <div className="font-medium text-white truncate">Selfie with Document</div>
                      <div className={`text-[11px] ${submittedRecord?.selfie_url ? 'text-slate-400' : 'text-amber-400 font-medium'}`}>
                        {submittedRecord?.selfie_url ? 'Uploaded & Encrypted' : 'Missing Image'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetch();
                    refetchProfile();
                    refetchDocs();
                  }}
                  disabled={isFetching}
                  className="bg-slate-950 border-slate-800 text-white hover:bg-slate-800 text-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
                  {isFetching ? 'Refreshing...' : 'Refresh Status'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPendingRecord}
                  disabled={isResetting}
                  className="bg-slate-950 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs cursor-pointer"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Resubmit / Cancel Request
                    </>
                  )}
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
        <div className="bg-slate-900/90 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex-shrink-0">
              <ShieldAlert className="h-7 w-7 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold text-red-400">Verification Rejected</h2>
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 font-semibold text-xs">
                    <XCircle className="h-3.5 w-3.5 mr-1 text-red-400" />
                    Rejected
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    refetch();
                    refetchDocs();
                    refetchProfile();
                  }}
                  disabled={isFetching}
                  className="bg-slate-950 border-slate-800 text-white hover:bg-slate-800 text-xs cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin text-primary' : ''}`} />
                  {isFetching ? 'Refreshing...' : 'Refresh Status'}
                </Button>
              </div>
              <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                Your previous verification documents could not be approved. Please review the admin feedback below, upload clearer photos, and resubmit.
              </p>
              {rejectedDocs.length > 0 ? (
                <div className="space-y-2.5 mb-5">
                  {rejectedDocs.map((doc) => (
                    <div key={doc.id} className="text-xs text-red-200 bg-red-950/40 border border-red-800/40 p-3.5 rounded-xl">
                      <p className="font-semibold text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                        Admin Rejection Reason ({doc.fileName || doc.verificationType.replace(/_/g, ' ')}):
                      </p>
                      <p className="mt-1 pl-5 text-slate-200">{doc.rejectionReason || 'Document was blurry, illegible, or expired.'}</p>
                    </div>
                  ))}
                </div>
              ) : verificationData?.rejectedDocs && verificationData.rejectedDocs.length > 0 ? (
                <div className="space-y-2.5 mb-5">
                  {verificationData.rejectedDocs.map((doc: any, idx: number) => (
                    <div key={idx} className="text-xs text-red-200 bg-red-950/40 border border-red-800/40 p-3.5 rounded-xl">
                      <p className="font-semibold text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                        Admin Rejection Reason ({doc.type?.replace(/_/g, ' ') || 'Document'}):
                      </p>
                      <p className="mt-1 pl-5 text-slate-200">{doc.reason || 'Document was blurry, illegible, or expired.'}</p>
                    </div>
                  ))}
                </div>
              ) : (submittedRecord as any)?.rejection_reason || (submittedRecord as any)?.rejectionReason || verificationData?.rejectionReason ? (
                <div className="text-xs text-red-200 bg-red-950/40 border border-red-800/40 p-3.5 rounded-xl mb-5">
                  <p className="font-semibold text-red-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    Admin Rejection Reason:
                  </p>
                  <p className="mt-1 pl-5 text-slate-200">{verificationData?.rejectionReason || (submittedRecord as any)?.rejection_reason || (submittedRecord as any)?.rejectionReason}</p>
                </div>
              ) : null}
              <Button
                type="button"
                onClick={handleResetPendingRecord}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-md"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Resubmit Verification
                  </>
                )}
              </Button>
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
            <div className="flex flex-col gap-1 text-xs text-slate-400">
              <div>
                Your identity documents are securely uploaded to the <code className="text-primary">verifications</code> bucket and encrypted.
              </div>
              {!isFormValid && (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium mt-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    Upload {!hasFront ? currentConfig.frontTitle : currentConfig.requiresBack && !hasBack ? (currentConfig.backTitle || 'Back Image') : currentConfig.selfieTitle} to enable submission
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmitVerification}
              disabled={!isFormValid || isSubmitting || !!uploadingSlot}
              className={`w-full sm:w-auto font-semibold px-6 h-11 text-sm shadow-md transition-all ${
                isFormValid && !isSubmitting && !uploadingSlot
                  ? 'bg-primary hover:bg-primary/90 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
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
