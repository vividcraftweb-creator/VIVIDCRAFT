"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Upload, FileText, Image as ImageIcon, CheckCircle, X, Loader2, AlertCircle, Camera, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/utils/trpc';
import { formatCalendarDateToISO, getTodayCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';

interface DocumentUploadCardProps {
  verificationType:
    | 'ID_FRONT'
    | 'ID_BACK'
    | 'SELFIE'
    | 'BUSINESS_REGISTRATION'
    | 'PROOF_OF_ADDRESS'
    | 'TAX_DOCUMENT'
    | 'BUSINESS_LICENSE';
  title: string;
  description: string;
  icon: React.ReactNode;
  required?: boolean;
  acceptedTypes?: string;
  onUploadSuccess?: () => void;
  existingDocument?: {
    id: string;
    files: string;
    status: string;
  };
  documentType?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  ID_FRONT: 'Government ID (Front)',
  ID_BACK: 'Government ID (Back)',
  SELFIE: 'Selfie with ID',
  BUSINESS_REGISTRATION: 'Business Registration Certificate',
  PROOF_OF_ADDRESS: 'Proof of Business Address',
  TAX_DOCUMENT: 'Tax ID / EIN Certificate',
  BUSINESS_LICENSE: 'Business License',
};

export default function DocumentUploadCard({
  verificationType,
  title,
  description,
  icon,
  required = false,
  acceptedTypes = 'image/*,.pdf',
  onUploadSuccess,
  existingDocument,
  documentType: passedDocumentType,
}: DocumentUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<DateValue | null>(null);
  const [expiryDateError, setExpiryDateError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const supabase = createClient();
  const utils = trpc.useUtils();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const requiresExpiryDate = verificationType === 'ID_FRONT' || verificationType === 'ID_BACK';

  const uploadDocument = trpc.verifications.uploadDocument.useMutation({
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      utils.verifications.getUserDocuments.invalidate();
      onUploadSuccess?.();
      // Reset state (keep expiry date for IDs as it's displayed in uploaded state)
      setSelectedFile(null);
      setFilePreview(null);
      if (!requiresExpiryDate) {
        setExpiryDate(null);
      }
      setExpiryDateError('');
      setUploadProgress(0);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload document');
      setUploading(false);
      setUploadProgress(0);
    },
  });

  const deleteDocument = trpc.verifications.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success('Document deleted successfully');
      utils.verifications.getUserDocuments.invalidate();
      onUploadSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });

  const isUploaded = !!existingDocument;
  const hasFileSelected = !!selectedFile;

  // Drag & drop functionality
  const { isDragging, dragHandlers } = useFileDragDrop({
    onFileDrop: (file) => {
      // Create synthetic event to reuse existing validation logic
      const syntheticEvent = {
        target: {
          files: [file],
          value: '',
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    },
    accept: acceptedTypes,
    maxSize: 2 * 1024 * 1024, // 2MB
    disabled: uploading || isUploaded || hasFileSelected,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      e.target.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG) or PDF file');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null); // PDF - no preview
    }

    // Auto-upload if expiry date not required, or if already filled
    if (!requiresExpiryDate || expiryDate) {
      handleUpload(file, expiryDate);
    }
  };

  const handleUpload = async (file?: File, expiry?: DateValue | null) => {
    const fileToUpload = file || selectedFile;
    const expiryToUse = expiry || expiryDate;

    if (!fileToUpload) {
      toast.error('Please select a file');
      return;
    }

    // Validate expiry date for ID documents
    if (requiresExpiryDate && !expiryToUse) {
      toast.error('Please enter the document expiry date');
      return;
    }

    // Validate expiry date is in the future (HeroUI DatePicker with minValue handles this)
    // No need to validate isFutureDate as the DatePicker enforces it

    setUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `verification-documents/${fileName}`;

      setUploadProgress(30);

      console.log("Uploading to bucket 'verifications'...", fileToUpload);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error for bucket 'verifications':", uploadError);
        const userMsg = uploadError.message?.includes('Bucket not found')
          ? "Storage bucket 'verifications' was not found. Please ensure the bucket exists in Supabase."
          : uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')
          ? "Permission error: Storage RLS policy prevented upload to 'verifications'."
          : uploadError.message || "Failed to upload file to 'verifications' bucket.";
        throw new Error(userMsg);
      }

      setUploadProgress(60);

      const {
        data: { publicUrl },
      } = supabase.storage.from('verifications').getPublicUrl(filePath);

      if (!publicUrl) {
        throw new Error('Unable to retrieve public URL for uploaded file.');
      }

      setUploadProgress(80);

      // Upload document via tRPC
      await uploadDocument.mutateAsync({
        verificationType,
        fileUrl: publicUrl,
        documentType: passedDocumentType || DOCUMENT_TYPE_LABELS[verificationType],
        expiryDate: formatCalendarDateToISO(expiryToUse),
      });

      setUploadProgress(100);
    } catch (error: any) {
      console.error("Exact storage error response in DocumentUploadCard:", error);
      toast.error(error?.message || 'Failed to upload document');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = () => {
    if (!existingDocument?.id) return;
    if (confirm('Are you sure you want to delete this document?')) {
      deleteDocument.mutate({ verificationId: existingDocument.id });
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setExpiryDateError('');
  };

  const validateExpiryDate = (date: DateValue | null): boolean => {
    if (!date) return false;

    // DatePicker with minValue already enforces future date, but we can add extra validation
    const today = getTodayCalendarDate();
    if (date.compare(today) <= 0) {
      setExpiryDateError('Expiry date must be in the future');
      return false;
    }

    setExpiryDateError('');
    return true;
  };

  // Auto-upload when expiry date is filled and valid (if file already selected)
  useEffect(() => {
    if (selectedFile && requiresExpiryDate && expiryDate && !uploading && !expiryDateError) {
      // Validate before auto-upload
      if (validateExpiryDate(expiryDate)) {
        handleUpload();
      }
    }
  }, [expiryDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'REJECTED':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const canUpload = hasFileSelected && (!requiresExpiryDate || (!!expiryDate && !expiryDateError));
  const needsExpiryDate = hasFileSelected && requiresExpiryDate && !expiryDate;
  const hasExpiryError = hasFileSelected && requiresExpiryDate && !!expiryDate && !!expiryDateError;

  // Determine card state
  let cardStyle = 'bg-white/5 border-white/10';
  if (isUploaded) {
    cardStyle = 'bg-green-500/10 border-green-500/20';
  } else if (hasFileSelected && canUpload) {
    cardStyle = 'bg-blue-500/10 border-blue-500/20';
  } else if (needsExpiryDate) {
    cardStyle = 'bg-amber-500/10 border-amber-500/20';
  }

  return (
    <div className={`glass-card p-4 sm:p-6 rounded-2xl border transition-all ${cardStyle}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${
            isUploaded ? 'bg-green-500/20' :
            hasFileSelected ? 'bg-blue-500/20' :
            'bg-slate-500/20'
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
              {title}
              {required && <span className="text-red-400 ml-1">*</span>}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">{description}</p>
          </div>
        </div>

        {isUploaded && (
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        )}
        {canUpload && !isUploaded && (
          <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
        )}
      </div>

      {/* Upload Interface */}
      {!isUploaded && !uploading && !hasFileSelected && (
        <div className="space-y-3">
          {/* Expiry Date Field - Always visible for IDs */}
          {requiresExpiryDate && (
            <div>
              <Label htmlFor={`expiry-${verificationType}`} className="text-white text-sm mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expiry Date <span className="text-red-400">*</span>
              </Label>
              <DatePicker
                value={expiryDate}
                onChange={(date) => setExpiryDate(date)}
                placeholder="Select ID expiry date"
                minValue={getTodayCalendarDate()}
                required
                className="bg-white/5 border-white/10"
              />
              <p className="text-xs text-slate-400 mt-1">
                Enter the expiry date shown on your ID
              </p>
            </div>
          )}

          {/* File Upload Buttons */}
          <div className="space-y-2">
            <input
              type="file"
              id={`file-${verificationType}`}
              accept={acceptedTypes}
              capture={isMobile ? "environment" : undefined}
              onChange={handleFileSelect}
              className="sr-only"
            />

            {/* Desktop: Single upload button */}
            {!isMobile && (
              <Label
                htmlFor={`file-${verificationType}`}
                {...dragHandlers}
                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 hover:border-blue-400/50 hover:bg-blue-500/10'
                }`}
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">
                  {isDragging ? 'Drop file here' : 'Click to upload or drag & drop'}
                </span>
              </Label>
            )}

            {/* Mobile: Camera + Upload buttons */}
            {isMobile && (
              <div className="grid grid-cols-2 gap-2">
                <Label
                  htmlFor={`file-${verificationType}`}
                  {...dragHandlers}
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/20 hover:border-blue-400/50 hover:bg-blue-500/10'
                  }`}
                >
                  <Camera className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {isDragging ? 'Drop here' : 'Take Photo'}
                  </span>
                </Label>
                <input
                  type="file"
                  id={`file-upload-${verificationType}`}
                  accept={acceptedTypes}
                  onChange={handleFileSelect}
                  className="sr-only"
                />
                <Label
                  htmlFor={`file-upload-${verificationType}`}
                  {...dragHandlers}
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-white/20 hover:border-blue-400/50 hover:bg-blue-500/10'
                  }`}
                >
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {isDragging ? 'Drop here' : 'Upload File'}
                  </span>
                </Label>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              PDF, JPG, PNG up to 2MB
            </p>
          </div>
        </div>
      )}

      {/* File Selected - Awaiting Expiry Date */}
      {hasFileSelected && !uploading && !isUploaded && (
        <div className="space-y-3">
          {/* File Preview */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {selectedFile?.name}
              </p>
              <p className="text-xs text-slate-400">
                {(selectedFile!.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {needsExpiryDate && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Please enter the expiry date below to continue
                </p>
              )}
              {hasExpiryError && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid expiry date - please correct it below
                </p>
              )}
              {canUpload && (
                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Ready to upload
                </p>
              )}
            </div>
            <Button
              onClick={handleCancelSelection}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Expiry Date Field (always show if required, even with errors) */}
          {requiresExpiryDate && (
            <div>
              <Label htmlFor={`expiry-${verificationType}-2`} className="text-white text-sm mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expiry Date <span className="text-red-400">*</span>
              </Label>
              <DatePicker
                value={expiryDate}
                onChange={(date) => {
                  setExpiryDate(date);
                  if (date) {
                    validateExpiryDate(date);
                  } else {
                    setExpiryDateError('');
                  }
                }}
                placeholder="Select ID expiry date"
                minValue={getTodayCalendarDate()}
                required
                className={`bg-white/5 ${
                  expiryDateError ? 'border-red-500/50' : 'border-white/10'
                }`}
              />
              {expiryDateError ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {expiryDateError}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Enter the expiry date shown on your ID
                </p>
              )}
            </div>
          )}

          {/* Manual Upload Button */}
          <Button
            onClick={() => handleUpload()}
            disabled={!canUpload}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={needsExpiryDate ? "Please enter expiry date first" : ""}
          >
            <Upload className="h-4 w-4 mr-2" />
            {requiresExpiryDate && !expiryDate ? 'Enter Expiry Date to Upload' : 'Upload Document'}
          </Button>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-400 font-medium">Uploading...</p>
              <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded State */}
      {isUploaded && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-white font-medium">Document uploaded</p>
                <p className="text-xs text-slate-400">Ready for review</p>
              </div>
            </div>
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="sm"
              disabled={deleteDocument.isPending}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {deleteDocument.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>

          {existingDocument.status === 'REJECTED' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-red-300 font-medium">Document Rejected</p>
                  <p className="text-xs text-red-200/70 mt-1">
                    Please upload a new document to continue verification.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
