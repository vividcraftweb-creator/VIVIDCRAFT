'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, FileText, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { JobFormData } from '../CreateJobWizard';
import { createClient } from '@/lib/supabase/client';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';

interface Props {
  formData: JobFormData;
  updateFormData: (data: Partial<JobFormData>) => void;
}

export default function Step8MediaUpload({ formData, updateFormData }: Props) {
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const supabase = createClient();

  // Drag & drop hooks for each upload type
  const { isDragging: isLogoDragging, dragHandlers: logoDragHandlers } = useFileDragDrop({
    onFileDrop: (file) => uploadFile(file, 'logo'),
    accept: 'image/*',
    maxSize: 2 * 1024 * 1024,
    disabled: uploading.logo || !!formData.company_logo,
  });

  const { isDragging: isThumbnailDragging, dragHandlers: thumbnailDragHandlers } = useFileDragDrop({
    onFileDrop: (file) => uploadFile(file, 'thumbnail'),
    accept: 'image/*',
    maxSize: 2 * 1024 * 1024,
    disabled: uploading.thumbnail || !!formData.job_thumbnail,
  });

  const { isDragging: isImageDragging, dragHandlers: imageDragHandlers } = useFileDragDrop({
    onFileDrop: (file) => uploadFile(file, 'image'),
    accept: 'image/*',
    maxSize: 2 * 1024 * 1024,
    disabled: uploading.image || formData.supporting_images.length >= 5,
  });

  const { isDragging: isFileDragging, dragHandlers: fileDragHandlers } = useFileDragDrop({
    onFileDrop: (file) => uploadFile(file, 'file'),
    maxSize: 2 * 1024 * 1024,
    disabled: uploading.file || formData.project_files.length >= 10,
  });

  const uploadFile = async (file: File, type: 'logo' | 'thumbnail' | 'image' | 'file') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `job-media/${fileName}`;

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      const { error: uploadError } = await supabase.storage
        .from('public-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-uploads')
        .getPublicUrl(filePath);

      // Update form data based on type
      if (type === 'logo') {
        updateFormData({ company_logo: publicUrl });
      } else if (type === 'thumbnail') {
        updateFormData({ job_thumbnail: publicUrl });
      } else if (type === 'image') {
        updateFormData({
          supporting_images: [...formData.supporting_images, publicUrl],
        });
      } else if (type === 'file') {
        updateFormData({
          project_files: [...formData.project_files, publicUrl],
        });
      }

      toast.success('File uploaded successfully!');
    } catch (error) {
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'thumbnail' | 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    // Validate file type
    if (type === 'logo' || type === 'thumbnail' || type === 'image') {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
    }

    uploadFile(file, type);
  };

  const removeImage = (url: string, type: 'image' | 'file') => {
    if (type === 'image') {
      updateFormData({
        supporting_images: formData.supporting_images.filter((img) => img !== url),
      });
    } else {
      updateFormData({
        project_files: formData.project_files.filter((file) => file !== url),
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Upload Media</h2>
        <p className="text-muted-foreground">
          Add visuals to make your job post more attractive (all optional)
        </p>
      </div>

      {/* Image Guidelines */}
      <div className="glass-card p-4 rounded-xl border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <ImageIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-primary">Recommended Image Sizes</p>
            <ul className="text-muted-foreground space-y-0.5 text-xs">
              <li>• <strong>Company Logo:</strong> 200x200px (square)</li>
              <li>• <strong>Job Thumbnail:</strong> 1200x630px (landscape)</li>
              <li>• <strong>Supporting Images:</strong> 800x600px (landscape or portrait)</li>
              <li>• All images should be under 2MB for best performance</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Company Logo */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Company Logo
        </Label>

        {formData.company_logo ? (
          <div className="glass-card p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center">
                <Image
                  src={formData.company_logo}
                  alt="Company logo"
                  width={64}
                  height={64}
                  className="object-contain rounded-lg"
                />
              </div>
              <div>
                <p className="text-sm font-medium">Logo uploaded</p>
                <p className="text-xs text-muted-foreground">Looks great!</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => updateFormData({ company_logo: '' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label
            {...logoDragHandlers}
            className={`glass-card p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer block ${
              isLogoDragging
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'logo')}
              className="hidden"
              disabled={uploading.logo}
            />
            <div className="flex flex-col items-center gap-2 text-center">
              {uploading.logo ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isLogoDragging ? 'Drop logo here' : 'Click to upload or drag & drop company logo'}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB (recommended: 200x200px square)</p>
                </>
              )}
            </div>
          </label>
        )}
      </div>

      {/* Job Thumbnail */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Job Thumbnail
        </Label>
        <p className="text-xs text-muted-foreground">
          A cover image that represents your project (will be shown in job listings)
        </p>

        {formData.job_thumbnail ? (
          <div className="glass-card p-4 rounded-xl">
            <div className="relative w-full h-64 bg-white/5 rounded-lg overflow-hidden">
              <Image
                src={formData.job_thumbnail}
                alt="Job thumbnail"
                fill
                className="object-contain"
                sizes="100vw"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => updateFormData({ job_thumbnail: '' })}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label
            {...thumbnailDragHandlers}
            className={`glass-card p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer block ${
              isThumbnailDragging
                ? 'border-primary bg-primary/10'
                : 'border-white/10 hover:border-primary/50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'thumbnail')}
              className="hidden"
              disabled={uploading.thumbnail}
            />
            <div className="flex flex-col items-center gap-2 text-center">
              {uploading.thumbnail ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isThumbnailDragging ? 'Drop thumbnail here' : 'Click to upload or drag & drop thumbnail'}
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB (recommended: 1200x630px landscape)</p>
                </>
              )}
            </div>
          </label>
        )}
      </div>

      {/* Supporting Images */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          Supporting Images ({formData.supporting_images.length}/5)
        </Label>
        <p className="text-xs text-muted-foreground">
          Add screenshots, mockups, or reference images
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {formData.supporting_images.map((url, index) => (
            <div key={index} className="glass-card p-2 rounded-xl relative group">
              <div className="relative w-full h-40 bg-white/5 rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={`Supporting image ${index + 1}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeImage(url, 'image')}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {formData.supporting_images.length < 5 && (
            <label
              {...imageDragHandlers}
              className={`glass-card p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center h-40 ${
                isImageDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-primary/50'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'image')}
                className="hidden"
                disabled={uploading.image}
              />
              <div className="flex flex-col items-center gap-2 text-center">
                {uploading.image ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {isImageDragging ? 'Drop image' : 'Click or drag to add'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">800x600px recommended</p>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Project Files */}
      <div className="space-y-3">
        <Label className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Project Files ({formData.project_files.length}/10)
        </Label>
        <p className="text-xs text-muted-foreground">
          Upload requirements documents, briefs, or any relevant files
        </p>

        <div className="space-y-2">
          {formData.project_files.map((url, index) => (
            <div key={index} className="glass-card p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">File {index + 1}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">{url.split('/').pop()}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeImage(url, 'file')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {formData.project_files.length < 10 && (
            <label
              {...fileDragHandlers}
              className={`glass-card p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer block ${
                isFileDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 hover:border-primary/50'
              }`}
            >
              <input
                type="file"
                onChange={(e) => handleFileChange(e, 'file')}
                className="hidden"
                disabled={uploading.file}
              />
              <div className="flex items-center justify-center gap-2">
                {uploading.file ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {isFileDragging ? 'Drop file here' : 'Click to upload or drag & drop project file'}
                    </p>
                  </>
                )}
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="glass-card p-5 rounded-xl border-primary/30">
        <div className="flex items-start gap-3">
          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-2">Why add media?</p>
            <ul className="text-muted-foreground space-y-1.5">
              <li>• Job posts with images get 40% more proposals</li>
              <li>• Visuals help freelancers understand your vision</li>
              <li>• Professional presentation builds trust</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
