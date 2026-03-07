'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { Award, Plus, Edit, Trash2, ExternalLink, Save, X, Loader2, FileCheck, Upload, FileText } from 'lucide-react';
import { type Certification } from '@/types/database.types';
import { formatCalendarDateToISO, parseISOToCalendarDate } from '@/lib/date-utils';
import type { DateValue } from '@internationalized/date';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';

interface CertificationCardProps {
  items: Certification[];
  onUpdate: () => void;
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.onerror = (event) => reject(event);
    reader.readAsDataURL(file);
  });

export default function CertificationCard({ items, onUpdate }: CertificationCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    issueDate: null as DateValue | null,
    expiryDate: null as DateValue | null,
    credentialId: '',
    credentialUrl: '',
  });
  const [credentialFile, setCredentialFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Drag & drop functionality
  const { isDragging, dragHandlers } = useFileDragDrop({
    onFileDrop: (file) => validateAndSetFile(file),
    accept: 'application/pdf,image/jpeg,image/jpg,image/png,image/webp',
    maxSize: 2 * 1024 * 1024,
    disabled: false,
  });

  const uploadCertificationMutation = trpc.publicProfile.uploadCertificationAsset.useMutation({
    onError: (error) => {
      toast.error('Failed to upload certification file', { description: error.message });
    },
  });

  const addMutation = trpc.publicProfile.addCertification.useMutation({
    onSuccess: () => {
      toast.success('Certification added successfully!');
      setIsAdding(false);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to add certification', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updateCertification.useMutation({
    onSuccess: () => {
      toast.success('Certification updated successfully!');
      setEditingId(null);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to update certification', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deleteCertification.useMutation({
    onSuccess: () => {
      toast.success('Certification deleted successfully!');
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to delete certification', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      issuer: '',
      issueDate: null,
      expiryDate: null,
      credentialId: '',
      credentialUrl: '',
    });
    setCredentialFile(null);
    setFilePreview(null);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (item: Certification) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData({
      name: item.name,
      issuer: item.issuer,
      issueDate: parseISOToCalendarDate(item.issueDate),
      expiryDate: parseISOToCalendarDate(item.expiryDate),
      credentialId: item.credentialId || '',
      credentialUrl: item.credentialUrl || '',
    });
    setCredentialFile(null);
    setFilePreview(null);
  };

  const validateAndSetFile = (file: File) => {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return false;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid PDF or image (JPG, PNG, or WEBP)');
      return false;
    }

    setCredentialFile(file);

    // Create preview for images only
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null); // PDF - no preview
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateAndSetFile(file)) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    setCredentialFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let credentialUrl = formData.credentialUrl || undefined;

    if (!editingId && !credentialFile) {
      toast.error('Please upload the certification document (PDF or image).');
      return;
    }

    if (credentialFile) {
      try {
        const base64 = await fileToBase64(credentialFile);
        const base64Data = base64.includes(',') ? base64.split(',').pop() ?? '' : base64;
        if (!base64Data) {
          throw new Error('Unable to read file data');
        }
        const uploadResult = await uploadCertificationMutation.mutateAsync({
          fileName: credentialFile.name,
          fileSize: credentialFile.size,
          mimeType: credentialFile.type || 'application/octet-stream',
          fileData: base64Data,
        });
        credentialUrl = uploadResult.filePath;
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to upload certification file', { description: error.message });
        }
        return;
      }
    }

    const payload = {
      name: formData.name,
      issuer: formData.issuer,
      issueDate: formatCalendarDateToISO(formData.issueDate),
      expiryDate: formatCalendarDateToISO(formData.expiryDate),
      credentialId: formData.credentialId || undefined,
      credentialUrl,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this certification?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Certifications</h3>
        </div>
        {!isAdding && !editingId && (
          <Button variant="outline" size="sm" onClick={handleAdd} className="glass-button">
            <Plus className="h-4 w-4 mr-1" />
            Add Certification
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="space-y-5 p-4 border border-slate-700 rounded-lg bg-slate-800/30">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Certification Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., AWS Certified Solutions Architect"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuer" className="text-slate-300">Issuing Organization *</Label>
            <Input
              id="issuer"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              placeholder="e.g., Amazon Web Services"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate" className="text-slate-300">Issue Date</Label>
              <DatePicker
                value={formData.issueDate}
                onChange={(date) => setFormData({ ...formData, issueDate: date })}
                placeholder="Select issue date"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="text-slate-300">Expiry Date</Label>
              <DatePicker
                value={formData.expiryDate}
                onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                placeholder="Select expiry date"
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="credentialId" className="text-slate-300">Credential ID</Label>
            <Input
              id="credentialId"
              value={formData.credentialId}
              onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
              placeholder="e.g., ABC123XYZ"
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credentialFile" className="flex items-center gap-2 text-slate-300">
              <FileText className="h-4 w-4" />
              Certification File {editingId ? '(optional)' : '*'}
            </Label>

            {credentialFile ? (
              <div className="space-y-3">
                {/* Image Preview or PDF Icon */}
                {filePreview ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-slate-700 bg-slate-900">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-lg border-2 border-slate-700 bg-slate-900 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-slate-600" />
                  </div>
                )}

                {/* File Info & Remove Button */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-green-400 font-medium truncate">{credentialFile.name}</p>
                      <p className="text-xs text-slate-400">
                        {(credentialFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  {...dragHandlers}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                  }`}
                >
                  <Input
                    id="credentialFile"
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium mb-1">
                        Drop your certification here, or <span className="text-blue-400">browse</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        PDF or Image (JPG, PNG, WEBP) • Max 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {formData.credentialUrl && !credentialFile && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Current file available
                    </p>
                    <a
                      href={formData.credentialUrl.startsWith('http')
                        ? formData.credentialUrl
                        : formData.credentialUrl.startsWith('/')
                        ? formData.credentialUrl
                        : `/${formData.credentialUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                    >
                      View File <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending}
              className="glass-button"
            >
              <Save className="h-4 w-4 mr-2" />
              {addMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingId
                ? 'Save Changes'
                : 'Add Certification'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="glass-button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List of Certifications */}
      <div className="space-y-4">
        {items.length === 0 && !isAdding && !editingId && (
          <div className="glass-card p-8 rounded-2xl text-center">
            <Award className="h-12 w-12 text-primary/50 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">No certifications added yet</p>
            <p className="text-slate-400 text-sm mb-4">
              Showcase your professional credentials and industry certifications
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="glass-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Certification
            </Button>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-lg text-white">{item.name}</h4>
                    <p className="text-slate-300">{item.issuer}</p>
                    {(item.issueDate || item.expiryDate) && (
                      <p className="text-sm text-slate-400">
                        {item.issueDate && `Issued: ${new Date(item.issueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`}
                        {item.issueDate && item.expiryDate && ' • '}
                        {item.expiryDate && `Expires: ${new Date(item.expiryDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`}
                      </p>
                    )}
                    {item.credentialId && (
                      <p className="text-sm text-slate-400">
                        Credential ID: {item.credentialId}
                      </p>
                    )}
                    {item.credentialUrl && (
                      <a
                        href={item.credentialUrl.startsWith('http')
                          ? item.credentialUrl
                          : item.credentialUrl.startsWith('/')
                          ? item.credentialUrl
                          : `/${item.credentialUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 mt-1"
                      >
                        Verify Credential <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(item)}
                  disabled={isAdding || editingId !== null}
                  className="glass-button"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending || isAdding || editingId !== null}
                  className="glass-button"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
