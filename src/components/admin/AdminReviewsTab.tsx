'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Star,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Loader2,
  Quote,
  Eye,
  EyeOff,
  MessageSquareQuote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ManualReview } from '@/types/reviews';

export default function AdminReviewsTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [reviews, setReviews] = useState<ManualReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form fields
  const [formAuthorName, setFormAuthorName] = useState('');
  const [formAuthorRole, setFormAuthorRole] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formContent, setFormContent] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Fetch reviews
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('manual_reviews')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        setReviews(data);
        return;
      }

      const res = await fetch('/api/admin/reviews');
      if (res.ok) {
        const json = await res.json();
        if (json?.reviews && Array.isArray(json.reviews)) {
          setReviews(json.reviews);
        }
      }
    } catch (e) {
      console.warn('Failed to load reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();

    const supabase = createClient();
    const channel = supabase
      .channel('admin_reviews_tab_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'manual_reviews' },
        () => {
          fetchReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Upload avatar image to Supabase Storage
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading avatar to Supabase...');

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `review_avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      let publicUrl = '';

      const { error: uploadErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage.from('banners').getPublicUrl(fileName);
        publicUrl = pubData.publicUrl;
      } else {
        const { error: avErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true, contentType: file.type });
        if (!avErr) {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          publicUrl = pubData.publicUrl;
        }
      }

      if (publicUrl) {
        setFormAvatarUrl(publicUrl);
        toast.success('Avatar uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Upload could not retrieve public URL');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Failed to upload avatar. You can enter an image URL directly.', { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormAuthorName('');
    setFormAuthorRole('');
    setFormAvatarUrl('');
    setFormRating(5);
    setFormContent('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (review: ManualReview) => {
    setEditingId(review.id);
    setFormAuthorName(review.author_name);
    setFormAuthorRole(review.author_role);
    setFormAvatarUrl(review.avatar_url || '');
    setFormRating(review.rating);
    setFormContent(review.content);
    setFormIsActive(review.is_active);
    setIsModalOpen(true);
  };

  // Submit review create or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAuthorName.trim()) {
      toast.error('Please enter author name');
      return;
    }
    if (!formAuthorRole.trim()) {
      toast.error('Please enter author role');
      return;
    }
    if (!formContent.trim()) {
      toast.error('Please enter review content');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        author_name: formAuthorName.trim(),
        author_role: formAuthorRole.trim(),
        avatar_url: formAvatarUrl.trim() || undefined,
        rating: formRating,
        content: formContent.trim(),
        is_active: formIsActive,
      };

      if (editingId) {
        // EDIT existing review
        // 1. Immediately update state
        setReviews((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...payload } : r))
        );

        // 2. Direct DB update
        try {
          const supabase = createClient();
          await supabase.from('manual_reviews').update(payload).eq('id', editingId);
        } catch {}

        // 3. API update
        await fetch('/api/admin/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });

        toast.success('Review updated successfully!');
      } else {
        // CREATE new review
        const newTempReview: ManualReview = {
          id: `review-${Date.now()}`,
          ...payload,
          display_order: reviews.length + 1,
          created_at: new Date().toISOString(),
        };

        // 1. Immediately update state
        setReviews((prev) => [newTempReview, ...prev]);

        // 2. Direct DB insert
        try {
          const supabase = createClient();
          const { data } = await supabase.from('manual_reviews').insert([payload]).select().single();
          if (data) {
            setReviews((prev) => [data, ...prev.filter((r) => r.id !== newTempReview.id)]);
          }
        } catch {}

        // 3. API create
        await fetch('/api/admin/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        toast.success('Review published successfully!');
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save review');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (review: ManualReview) => {
    const newStatus = !review.is_active;

    // Immediately update local state
    setReviews((prev) =>
      prev.map((r) => (r.id === review.id ? { ...r, is_active: newStatus } : r))
    );

    toast.success(newStatus ? 'Review visible' : 'Review hidden');

    try {
      const supabase = createClient();
      await supabase.from('manual_reviews').update({ is_active: newStatus }).eq('id', review.id);

      await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, is_active: newStatus }),
      });
      router.refresh();
    } catch (e) {
      console.warn('Failed to update review status:', e);
    }
  };

  // Delete review
  const handleDelete = async (id: string, author: string) => {
    if (!confirm(`Are you sure you want to delete review from "${author}"?`)) return;

    // Immediately update state
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast.success(`Review from "${author}" deleted`);

    try {
      const supabase = createClient();
      await supabase.from('manual_reviews').delete().eq('id', id);

      await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (e) {
      console.error('Failed to delete review:', e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <MessageSquareQuote className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Manual Client Reviews</h3>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                {reviews.length} Reviews
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control dynamic client reviews, ratings, and quotes showcased on the homepage Yellow Section.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-[#A2694E]/25 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4 text-white" />
          <span>Add Review</span>
        </Button>
      </div>

      {/* Reviews Grid */}
      {loading && reviews.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Quote className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Reviews Found</p>
          <p className="text-xs text-slate-500 mt-1">Click &quot;Add Review&quot; to publish your first client review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-slate-900/80 flex flex-col justify-between ${
                rev.is_active
                  ? 'border-slate-800 hover:border-amber-500/40'
                  : 'border-slate-800/40 opacity-60 bg-slate-950/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-amber-500/30 bg-slate-800 flex-shrink-0 flex items-center justify-center text-amber-300 font-bold text-xs">
                      {rev.avatar_url ? (
                        <img src={rev.avatar_url} alt={rev.author_name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{rev.author_name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{rev.author_name}</h4>
                      <p className="text-xs text-amber-400/90 font-medium">{rev.author_role}</p>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-300 italic line-clamp-3 mb-3">
                  &ldquo;{rev.content}&rdquo;
                </p>
              </div>

              {/* Action Buttons & Status Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleToggleActive(rev)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    rev.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {rev.is_active ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(rev)}
                    className="h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(rev.id, rev.author_name)}
                    className="h-7 text-xs border-red-900/50 hover:bg-red-950/50 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Review Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-white rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? 'Edit Review' : 'Add Manual Review'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Add verified testimonials to showcase client and collector satisfaction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Author Name *</Label>
              <Input
                placeholder="e.g. Author Name"
                value={formAuthorName}
                onChange={(e) => setFormAuthorName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Author Role / Company *</Label>
              <Input
                placeholder="e.g. Modern Art Collector"
                value={formAuthorRole}
                onChange={(e) => setFormAuthorRole(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
                required
              />
            </div>

            {/* Avatar Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Avatar Image (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://... or upload image"
                  value={formAvatarUrl}
                  onChange={(e) => setFormAvatarUrl(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-sm flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs px-3"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1" />
                  )}
                  Upload
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {formAvatarUrl && (
                <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-700">
                    <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-slate-400 truncate flex-1">Avatar selected</span>
                </div>
              )}
            </div>

            {/* Rating Stars Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Star Rating</Label>
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormRating(star)}
                    className="p-1 cursor-pointer hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= formRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-400 ml-2">{formRating} / 5 Stars</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Review Content *</Label>
              <Textarea
                placeholder="Enter client review or testimonial quote..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-xs"
                required
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Active Status</p>
                <p className="text-[11px] text-slate-400">Display this review in the Yellow Section on homepage</p>
              </div>
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#A2694E] hover:bg-[#8B5A3C] text-white text-xs font-bold shadow-md shadow-[#A2694E]/20"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1 text-white" /> : null}
                {editingId ? 'Save Changes' : 'Publish Review'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
