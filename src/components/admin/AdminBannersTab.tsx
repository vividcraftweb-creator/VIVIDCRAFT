'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Tag,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageCircle,
  Sparkles,
  Upload,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface BannerItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link_url: string;
  target_route?: string;
  image_url: string;
  accent?: string;
  offer_code: string;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
}

// Generate random unique offer code helper (e.g. OFFER-7842)
export function generateOfferCode(prefix = 'OFFER'): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

export default function AdminBannersTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal create state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('Special Offer');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('/gallery');
  const [formOfferCode, setFormOfferCode] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Support phone number
  const supportPhone =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ||
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
    '94783813833';
  const cleanPhone = String(supportPhone).replace(/\D/g, '') || '94783813833';

  // Load banners - checks live database rows directly from advertisements table
  const fetchBanners = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let liveData: BannerItem[] | null = null;

      // 1. Query advertisements table directly using select('*') to avoid 400 Bad Request
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        liveData = data.map((b: any) => ({
          id: b.id,
          badge: b.badge || 'Special Offer',
          title: b.title || '',
          subtitle: b.subtitle || '',
          cta_text: b.cta_text || 'Get Offer',
          link_url: b.target_route || b.link_url || '/gallery',
          target_route: b.target_route || b.link_url || '/gallery',
          image_url: b.image_url || '',
          accent: b.accent || 'from-amber-500/20 to-orange-500/10',
          offer_code: b.offer_code || '',
          is_active: b.is_active !== false,
          display_order: b.display_order ?? 0,
          created_at: b.created_at,
        }));
        setBanners(liveData);
        return;
      }

      // Otherwise query through API if direct connection failed
      const res = await fetch('/api/admin/banners');
      if (res.ok) {
        const json = await res.json();
        if (json?.banners && Array.isArray(json.banners)) {
          const mapped = json.banners.map((b: any) => ({
            id: b.id,
            badge: b.badge || 'Special Offer',
            title: b.title || '',
            subtitle: b.subtitle || '',
            cta_text: b.cta_text || 'Get Offer',
            link_url: b.target_route || b.link_url || '/gallery',
            target_route: b.target_route || b.link_url || '/gallery',
            image_url: b.image_url || '',
            accent: b.accent || 'from-amber-500/20 to-orange-500/10',
            offer_code: b.offer_code || '',
            is_active: b.is_active !== false,
            display_order: b.display_order ?? 0,
            created_at: b.created_at,
          }));
          setBanners(mapped);
        }
      }
    } catch (e) {
      console.error('Failed to load banners:', e);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Direct file upload to Supabase storage bucket 'banners'
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WEBP)');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading banner image to Supabase Storage...');

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `banner_${Date.now()}.${fileExt}`;

      let publicUrl = '';

      // Direct client upload to 'banners' storage bucket
      const { data, error } = await supabase.storage.from('banners').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (!error) {
        const { data: publicUrlData } = supabase.storage.from('banners').getPublicUrl(fileName);
        publicUrl = publicUrlData?.publicUrl || '';
      } else {
        console.warn('Direct client Supabase storage upload failed, using server fallback:', error);
        // Fallback to server route with service role key
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/banners/upload', {
          method: 'POST',
          body: formData,
        });
        const resJson = await res.json();
        if (!res.ok || resJson.error) {
          throw new Error(error.message || resJson.error || 'Failed to upload image');
        }
        publicUrl = resJson.url;
      }

      if (publicUrl) {
        setFormImageUrl(publicUrl);
        toast.success('Image uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Unable to retrieve public URL for uploaded banner');
      }
    } catch (err: any) {
      console.error('Upload exception:', err);
      toast.error(err?.message || 'Failed to upload image. You can also paste an image URL.', { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Open create dialog with newly generated offer code
  const handleOpenCreate = () => {
    setFormTitle('');
    setFormSubtitle('');
    setFormBadge('Special Offer');
    setFormImageUrl('');
    setFormLinkUrl('/gallery');
    setFormOfferCode(generateOfferCode());
    setFormIsActive(true);
    setIsCreateOpen(true);
  };

  // Roll a new random offer code
  const handleRegenerateCode = () => {
    const newCode = generateOfferCode();
    setFormOfferCode(newCode);
  };

  // Submit new banner
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Please enter a banner title');
      return;
    }
    if (!formImageUrl.trim()) {
      toast.error('Please upload an image or provide an image URL');
      return;
    }

    const code = formOfferCode.trim().toUpperCase() || generateOfferCode();
    setSubmitting(true);

    try {
      const bannerPayload = {
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        image_url: formImageUrl.trim(),
        offer_code: code,
        target_route: formLinkUrl.trim() || '/gallery',
        link_url: formLinkUrl.trim() || '/gallery',
        badge: formBadge.trim() || 'Special Offer',
        cta_text: 'Get Offer',
        is_active: formIsActive,
        display_order: banners.length + 1,
      };

      let createdBanner: BannerItem = {
        id: `banner-${Date.now()}`,
        ...bannerPayload,
        created_at: new Date().toISOString(),
      };

      // 1. Direct client Supabase insert attempt into advertisements table
      try {
        const supabase = createClient();
        const { data: dbData, error: dbErr } = await supabase
          .from('advertisements')
          .insert([bannerPayload])
          .select()
          .single();

        if (!dbErr && dbData) {
          createdBanner = {
            ...dbData,
            link_url: dbData.target_route || dbData.link_url || '/gallery',
            target_route: dbData.target_route || dbData.link_url || '/gallery',
          };
        }
      } catch (err) {
        console.warn('Client direct insert caught error:', err);
      }

      // 2. Also ensure server-side API sync
      try {
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bannerPayload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.banner) {
            createdBanner = {
              ...json.banner,
              link_url: json.banner.target_route || json.banner.link_url || '/gallery',
              target_route: json.banner.target_route || json.banner.link_url || '/gallery',
            };
          }
        }
      } catch (apiErr) {
        console.warn('API route call error:', apiErr);
      }

      // 3. Immediately update local React state without needing a page refresh
      setBanners((prev) => [createdBanner, ...prev.filter((b) => b.id !== createdBanner.id)]);

      toast.success('Banner & Offer created successfully!', {
        description: `Offer Code: ${code} has been assigned.`,
      });
      setIsCreateOpen(false);

      // Background revalidation
      router.refresh();
      fetchBanners();
    } catch (err: any) {
      toast.error(err.message || 'Error saving banner');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (banner: BannerItem) => {
    const newStatus = !banner.is_active;

    // 1. Immediately update local React state without needing a page refresh
    setBanners((prev) =>
      prev.map((b) => (b.id === banner.id ? { ...b, is_active: newStatus } : b))
    );
    toast.success(newStatus ? 'Banner activated' : 'Banner paused');

    try {
      const supabase = createClient();
      await supabase.from('advertisements').update({ is_active: newStatus }).eq('id', banner.id);

      await fetch('/api/admin/banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: banner.id, is_active: newStatus }),
      });
      router.refresh();
    } catch (e) {
      console.warn('Failed to update status on server:', e);
    }
  };

  // Delete banner with explicit Supabase query and instant state update
  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete banner with Offer Code "${code}"?`)) return;

    // 1. Immediately update local React state
    setBanners((prev) => prev.filter((b) => b.id !== id));

    try {
      // 2. Execute explicit Supabase delete query ONLY on advertisements table
      const supabase = createClient();
      await supabase.from('advertisements').delete().eq('id', id);

      // 3. Ensure server-side deletion & in-memory sync
      await fetch(`/api/admin/banners?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      toast.success(`Banner ${code} deleted`);

      // 4. Revalidate and refetch live rows
      router.refresh();
      await fetchBanners();
    } catch (e) {
      console.error('Failed to delete banner:', e);
      toast.error('Failed to delete banner');
      fetchBanners();
    }
  };

  // Copy offer code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Offer Code copied: ${code}`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Helper to build WhatsApp test URL
  const getWhatsAppTestUrl = (code: string) => {
    const message = `Hi, I want to claim this offer code: ${code}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-white">Offers &amp; Hero Banners</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage advertising slides on the home page and track promotional Offer Codes connected
            to WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBanners}
            className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Banner / Offer
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[11px] text-slate-400">Total Banners</p>
          <p className="text-lg font-bold text-white mt-0.5">{banners.length}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[11px] text-emerald-400">Active in Hero Slider</p>
          <p className="text-lg font-bold text-emerald-400 mt-0.5">
            {banners.filter((b) => b.is_active).length}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-slate-900/80 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[11px] text-amber-400">WhatsApp Destination</p>
          <p className="text-xs font-mono font-medium text-amber-300 mt-1 truncate">
            +{cleanPhone}
          </p>
        </div>
      </div>

      {/* Table of Banners */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Banner Preview</th>
                <th className="py-3 px-3">Title &amp; Category</th>
                <th className="py-3 px-3">Offer Code</th>
                <th className="py-3 px-3">Destination Link</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {loading && banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading banners...
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No banners created yet. Click "New Banner / Offer" to create your first offer.
                  </td>
                </tr>
              ) : (
                banners.map((banner) => {
                  const isCopied = copiedCode === banner.offer_code;
                  const waTestUrl = getWhatsAppTestUrl(banner.offer_code);

                  return (
                    <tr key={banner.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Image Preview */}
                      <td className="py-3 px-3">
                        <div className="relative w-24 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0 group">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Title & Badge */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-1">
                          {banner.badge || 'Offer'}
                        </span>
                        <p className="font-semibold text-white truncate text-xs">{banner.title}</p>
                        {banner.subtitle && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {banner.subtitle}
                          </p>
                        )}
                      </td>

                      {/* Offer Code */}
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs shadow-sm">
                          <span>{banner.offer_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(banner.offer_code)}
                            title="Copy Offer Code"
                            className="p-1 hover:bg-amber-500/20 rounded transition text-amber-400"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Destination Link */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                          {banner.link_url || '/gallery'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(banner)}
                          className="cursor-pointer"
                          title="Click to toggle active status"
                        >
                          {banner.is_active ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 text-[10px] flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-700/40 text-slate-400 border-slate-700 hover:bg-slate-700/60 text-[10px] flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              Paused
                            </Badge>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Test WhatsApp Link */}
                          <a
                            href={waTestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition"
                            title="Test WhatsApp Offer Link"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(banner.id, banner.offer_code)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition"
                            title="Delete Banner"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Create New Banner / Offer */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-white max-h-[85vh] overflow-y-auto pr-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Create Banner &amp; Generate Offer Code
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Add a new promotional slider banner to the homepage hero with an auto-generated or custom Offer Code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2">
            {/* Title */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Banner Title *</Label>
              <Input
                placeholder="e.g. 20% Off Custom Portrait Commissions"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-xs h-9"
              />
            </div>

            {/* Badge / Category */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Category Badge</Label>
              <Input
                placeholder="e.g. Special Offer, Limited Time, Verified Artists"
                value={formBadge}
                onChange={(e) => setFormBadge(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Subtitle / Promo Pitch</Label>
              <Input
                placeholder="e.g. Connect directly with elite creators and claim this limited discount."
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9"
              />
            </div>

            {/* Offer Code Generator (Auto & Manual entry) */}
            <div className="space-y-1.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Unique Offer Code *
                </Label>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition"
                  title="Generate a new random code"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              </div>

              <div className="flex gap-2 items-center">
                <Input
                  placeholder="e.g. OFFER-7842"
                  value={formOfferCode}
                  onChange={(e) => setFormOfferCode(e.target.value.toUpperCase())}
                  required
                  className="bg-slate-950 border-amber-500/40 text-amber-300 font-mono font-bold text-sm h-9 tracking-wider"
                />
              </div>

              <p className="text-[10px] text-slate-400">
                Generated automatically or type your custom code (e.g.{' '}
                <span className="font-mono text-amber-300">OFFER-7842</span>). When visitors click
                &quot;Get Offer&quot;, this code will be pre-filled in their WhatsApp message.
              </p>
            </div>

            {/* Direct File Upload & Image URL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-500" />
                  Banner Image *
                </Label>
                {formImageUrl && (
                  <button
                    type="button"
                    onClick={() => setFormImageUrl('')}
                    className="text-[11px] text-rose-400 hover:text-rose-300 transition"
                  >
                    Remove Image
                  </button>
                )}
              </div>

              {/* Hidden File Picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Upload Box / Drag & Click Area */}
              <div
                onClick={() => !isUploadingImage && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  formImageUrl
                    ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60'
                    : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                {isUploadingImage ? (
                  <div className="py-4 flex flex-col items-center gap-2 text-amber-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs font-medium">Uploading to Supabase Storage (banners)...</span>
                  </div>
                ) : formImageUrl ? (
                  <div className="w-full space-y-2">
                    <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                      <img
                        src={formImageUrl}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Image Uploaded
                      </span>
                      <span className="text-[11px] text-slate-400 hover:text-white underline">
                        Click to choose another image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 flex flex-col items-center gap-1.5 text-slate-400">
                    <div className="p-2 rounded-full bg-slate-900 border border-slate-700 text-amber-500">
                      <Upload className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold text-white">Click to upload banner image</p>
                    <p className="text-[10px] text-slate-500">
                      PNG, JPG, WEBP (uploads directly to Supabase storage)
                    </p>
                  </div>
                )}
              </div>

              {/* Direct URL input fallback */}
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] text-slate-400">Or paste image URL directly</Label>
                <Input
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Link URL */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-300 font-semibold">Target Route / URL</Label>
              <Input
                placeholder="e.g. /gallery, /artists, /bidding"
                value={formLinkUrl}
                onChange={(e) => setFormLinkUrl(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-3 sticky bottom-0 bg-slate-900/95 backdrop-blur-md pb-1 flex sm:justify-between gap-2 border-t border-slate-800/80 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="border-slate-800 text-slate-400 hover:bg-slate-800 h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold h-8 text-xs shadow-md shadow-amber-500/20"
              >
                {submitting ? 'Creating...' : 'Save Banner & Offer Code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
