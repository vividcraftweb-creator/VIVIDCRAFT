'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { toast } from 'sonner';
import { FolderOpen, Plus, Edit, Trash2, ExternalLink, Image as ImageIcon, Save, X, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { type PortfolioItem } from '@/types/database.types';
import { CharacterCount } from '@/components/ui/character-count';
import { FIELD_LIMITS } from '@/types/profile-editor.types';
import { createClient } from '@/lib/supabase/client';
import { useFileDragDrop } from '@/hooks/useFileDragDrop';

interface PortfolioCardProps {
  items: PortfolioItem[];
  onUpdate: () => void;
}

// Helper function to check if image URL is from allowed domains
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      'i0.wp.com',
      'supabase.co',
      'lh3.googleusercontent.com'
    ];
    return allowedHosts.some(host => urlObj.hostname.includes(host));
  } catch {
    return false;
  }
};

export default function PortfolioCard({ items, onUpdate }: PortfolioCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    url: '',
    technologies: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const supabase = createClient();

  // Drag & drop functionality
  const { isDragging, dragHandlers } = useFileDragDrop({
    onFileDrop: (file) => validateAndSetFile(file),
    accept: 'image/jpeg,image/jpg,image/png,image/webp',
    maxSize: 2 * 1024 * 1024,
    disabled: false,
  });

  const addMutation = trpc.publicProfile.addPortfolio.useMutation({
    onSuccess: () => {
      toast.success('Portfolio item added successfully!');
      setIsAdding(false);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to add portfolio item', { description: error.message });
    },
  });

  const updateMutation = trpc.publicProfile.updatePortfolio.useMutation({
    onSuccess: () => {
      toast.success('Portfolio item updated successfully!');
      setEditingId(null);
      resetForm();
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to update portfolio item', { description: error.message });
    },
  });

  const deleteMutation = trpc.publicProfile.deletePortfolio.useMutation({
    onSuccess: () => {
      toast.success('Portfolio item deleted successfully!');
      onUpdate();
    },
    onError: (error) => {
      toast.error('Failed to delete portfolio item', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      url: '',
      technologies: '',
    });
    setSelectedFile(null);
    setFilePreview(null);
    setUploading(false);
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData({
      title: item.title,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      url: item.url || '',
      technologies: item.technologies || '',
    });
    // Reset file upload state when editing
    setSelectedFile(null);
    setFilePreview(item.imageUrl || null);
  };

  const validateAndSetFile = (file: File) => {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return false;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPG, PNG, or WEBP)');
      return false;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateAndSetFile(file)) {
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `portfolio-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('public-uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('public-uploads').getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = formData.imageUrl;

      // Upload image if a new file is selected
      if (selectedFile) {
        setUploading(true);
        imageUrl = await uploadImageToStorage(selectedFile);
      }

      if (editingId) {
        updateMutation.mutate({
          id: editingId,
          data: {
            title: formData.title,
            description: formData.description || undefined,
            imageUrl: imageUrl || undefined,
            url: formData.url || undefined,
            technologies: formData.technologies || undefined,
          },
        });
      } else {
        addMutation.mutate({
          title: formData.title,
          description: formData.description || undefined,
          imageUrl: imageUrl || undefined,
          url: formData.url || undefined,
          technologies: formData.technologies || undefined,
        });
      }
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this portfolio item?')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Portfolio / Projects</h3>
        </div>
        {!isAdding && !editingId && (
          <Button variant="outline" size="sm" onClick={handleAdd} className="glass-button">
            <Plus className="h-4 w-4 mr-1" />
            Add Project
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="space-y-5 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-slate-50 dark:bg-zinc-800/30">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-700 dark:text-zinc-300 font-medium">Project Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., E-commerce Platform"
              required
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400"
              maxLength={FIELD_LIMITS.PORTFOLIO_TITLE.max}
            />
            <CharacterCount
              current={formData.title.length}
              min={FIELD_LIMITS.PORTFOLIO_TITLE.min}
              max={FIELD_LIMITS.PORTFOLIO_TITLE.max}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-700 dark:text-zinc-300 font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project, your role, and technologies used..."
              rows={3}
              className="resize-none bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400"
              maxLength={FIELD_LIMITS.PORTFOLIO_DESCRIPTION.max}
            />
            <CharacterCount
              current={formData.description.length}
              max={FIELD_LIMITS.PORTFOLIO_DESCRIPTION.max}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageFile" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
              <ImageIcon className="h-4 w-4" />
              Project Image
            </Label>

            {filePreview ? (
              <div className="space-y-3">
                <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                  <Image
                    src={filePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="bg-red-500/90 hover:bg-red-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  {selectedFile ? selectedFile.name : 'Current image'}
                </p>
              </div>
            ) : (
              <div
                {...dragHandlers}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">
                      Drop your image here, or <span className="text-blue-600 dark:text-blue-400">browse</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      JPG, PNG or WEBP • Max 2MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
              <ExternalLink className="h-4 w-4" />
              Project URL
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Link to live project or GitHub repository
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="technologies" className="text-zinc-700 dark:text-zinc-300 font-medium">Technologies (comma-separated)</Label>
            <Input
              id="technologies"
              value={formData.technologies}
              onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
              placeholder="e.g., React, Node.js, E-commerce"
              className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={addMutation.isPending || updateMutation.isPending || uploading}
              className="glass-button"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Image...
                </>
              ) : addMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Save Changes' : 'Add Project'}
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="glass-button">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* List of Portfolio Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.length === 0 && !isAdding && !editingId && (
          <div className="glass-card p-8 rounded-2xl text-center col-span-2">
            <FolderOpen className="h-12 w-12 text-primary/50 mx-auto mb-3" />
            <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">No portfolio items added yet</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
              Showcase your best work to attract clients and demonstrate your skills
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="glass-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Project
            </Button>
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
          >
            {item.imageUrl && (
              <div className="w-full h-48 bg-zinc-100 dark:bg-zinc-950 relative">
                {isValidImageUrl(item.imageUrl) ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    onError={(event) => {
                      event.currentTarget.classList.add('hidden');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
                    <ImageIcon className="h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{item.title}</h4>
                <div className="flex gap-1">
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
              {item.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-3">
                  {item.description}
                </p>
              )}
              {item.technologies && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.technologies.split(',').map((tech: string, index: number) => (
                    <span
                      key={index}
                      className="text-xs bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded border border-blue-200 dark:border-blue-500/30"
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                >
                  View Project <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
