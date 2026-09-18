'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Star,
  Upload,
  Loader2,
  Sparkles,
  CheckCircle2,
  Globe,
} from 'lucide-react';
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandFacebook,
  IconBrandX,
} from '@tabler/icons-react';
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
import { CrewMember } from '@/types/crew';

export default function AdminCrewTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [formShortBio, setFormShortBio] = useState('');
  const [formFullStory, setFormFullStory] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formLinkedinUrl, setFormLinkedinUrl] = useState('');
  const [formInstagramUrl, setFormInstagramUrl] = useState('');
  const [formFacebookUrl, setFormFacebookUrl] = useState('');
  const [formTwitterUrl, setFormTwitterUrl] = useState('');

  // Fetch crew members
  const fetchCrew = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crew_members')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map((c: any) => ({
          ...c,
          avatar_url: c.image_url || c.avatar_url || '',
          image_url: c.image_url || c.avatar_url || '',
        }));
        setCrew(mapped);
        return;
      }

      const res = await fetch('/api/admin/crew');
      if (res.ok) {
        const json = await res.json();
        if (json?.crew && Array.isArray(json.crew)) {
          setCrew(json.crew);
        }
      }
    } catch (e) {
      console.warn('Failed to load crew members:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrew();

    const supabase = createClient();
    const channel = supabase
      .channel('admin_crew_tab_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crew_members' },
        () => {
          fetchCrew();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Direct file upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading crew portrait to Supabase...');

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `crew_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      let publicUrl = '';

      // 1. Try 'banners' or 'avatars' bucket
      const { error: uploadErr } = await supabase.storage
        .from('banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage.from('banners').getPublicUrl(fileName);
        publicUrl = pubData.publicUrl;
      } else {
        // Try avatars bucket as fallback
        const { error: avErr } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true, contentType: file.type });
        if (!avErr) {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          publicUrl = pubData.publicUrl;
        }
      }

      // If client storage upload was blocked, try server endpoint
      if (!publicUrl) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/banners/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.url) publicUrl = json.url;
        }
      }

      if (publicUrl) {
        setFormAvatarUrl(publicUrl);
        toast.success('Portrait uploaded successfully!', { id: toastId });
      } else {
        throw new Error('Could not obtain public URL');
      }
    } catch (err: any) {
      console.error('Crew image upload error:', err);
      toast.error(err.message || 'Failed to upload image. Please provide a direct URL.', { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormPosition('');
    setFormAvatarUrl('');
    setFormShortBio('');
    setFormFullStory('');
    setFormIsFeatured(false);
    setFormLinkedinUrl('');
    setFormInstagramUrl('');
    setFormFacebookUrl('');
    setFormTwitterUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: CrewMember) => {
    setEditingId(member.id);
    setFormName(member.name);
    setFormPosition(member.position);
    setFormAvatarUrl(member.image_url || member.avatar_url || '');
    setFormShortBio(member.short_bio);
    setFormFullStory(member.full_story || '');
    setFormIsFeatured(member.is_featured);
    setFormLinkedinUrl(member.linkedin_url || '');
    setFormInstagramUrl(member.instagram_url || '');
    setFormFacebookUrl(member.facebook_url || '');
    setFormTwitterUrl(member.twitter_url || member.x_url || '');
    setIsModalOpen(true);
  };

  // Submit create or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Please enter crew member name');
      return;
    }
    if (!formPosition.trim()) {
      toast.error('Please enter member position');
      return;
    }
    if (!formAvatarUrl.trim()) {
      toast.error('Please upload an image or enter a photo URL');
      return;
    }
    if (!formShortBio.trim()) {
      toast.error('Please enter a short bio');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        name: formName.trim(),
        position: formPosition.trim(),
        avatar_url: formAvatarUrl.trim(),
        image_url: formAvatarUrl.trim(),
        short_bio: formShortBio.trim(),
        full_story: formFullStory.trim() || formShortBio.trim(),
        is_featured: formIsFeatured,
        linkedin_url: formLinkedinUrl.trim() || null,
        instagram_url: formInstagramUrl.trim() || null,
        facebook_url: formFacebookUrl.trim() || null,
        twitter_url: formTwitterUrl.trim() || null,
      };

      const dbPayload = {
        name: formName.trim(),
        position: formPosition.trim(),
        image_url: formAvatarUrl.trim(),
        short_bio: formShortBio.trim(),
        full_story: formFullStory.trim() || formShortBio.trim(),
        is_featured: formIsFeatured,
        linkedin_url: formLinkedinUrl.trim() || null,
        instagram_url: formInstagramUrl.trim() || null,
        facebook_url: formFacebookUrl.trim() || null,
        twitter_url: formTwitterUrl.trim() || null,
      };

      if (editingId) {
        // EDIT existing member
        // 1. Immediately update local state
        setCrew((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, ...payload }
              : formIsFeatured
              ? { ...c, is_featured: false }
              : c
          )
        );

        // 2. Direct DB update
        try {
          const supabase = createClient();
          if (formIsFeatured) {
            await supabase.from('crew_members').update({ is_featured: false }).neq('id', editingId);
          }
          const { error: updErr } = await supabase.from('crew_members').update(dbPayload).eq('id', editingId);
          if (updErr) {
            console.warn('Direct DB update notice:', updErr.message);
          }
        } catch {}

        // 3. API update
        await fetch('/api/admin/crew', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        });

        toast.success(`Updated ${formName.trim()}`);
      } else {
        // CREATE new member
        const newTempMember: CrewMember = {
          id: `crew-${Date.now()}`,
          ...payload,
          display_order: crew.length + 1,
          created_at: new Date().toISOString(),
        };

        // 1. Immediately update local state
        setCrew((prev) => [
          newTempMember,
          ...(formIsFeatured
            ? prev.map((c) => ({ ...c, is_featured: false }))
            : prev),
        ]);

        // 2. Direct DB insert
        try {
          const supabase = createClient();
          if (formIsFeatured) {
            await supabase.from('crew_members').update({ is_featured: false }).neq('id', '00000000-0000-0000-0000-000000000000');
          }
          const { data, error: insErr } = await supabase.from('crew_members').insert([dbPayload]).select().single();
          if (!insErr && data) {
            const mapped = {
              ...data,
              avatar_url: data.image_url || data.avatar_url || formAvatarUrl.trim(),
              image_url: data.image_url || data.avatar_url || formAvatarUrl.trim(),
            };
            setCrew((prev) => [mapped, ...prev.filter((c) => c.id !== newTempMember.id)]);
          } else if (insErr) {
            console.warn('Direct DB insert notice:', insErr.message);
          }
        } catch {}

        // 3. API create
        await fetch('/api/admin/crew', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        toast.success(`Created crew member ${formName.trim()}`);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save crew member');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Featured Member
  const handleToggleFeatured = async (member: CrewMember) => {
    const newFeatured = !member.is_featured;

    // Immediately update local state
    setCrew((prev) =>
      prev.map((c) =>
        c.id === member.id
          ? { ...c, is_featured: newFeatured }
          : newFeatured
          ? { ...c, is_featured: false }
          : c
      )
    );

    toast.success(newFeatured ? `${member.name} marked as Featured` : `${member.name} unfeatured`);

    try {
      const supabase = createClient();
      if (newFeatured) {
        await supabase.from('crew_members').update({ is_featured: false }).neq('id', member.id);
      }
      await supabase.from('crew_members').update({ is_featured: newFeatured }).eq('id', member.id);

      await fetch('/api/admin/crew', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, is_featured: newFeatured }),
      });
      router.refresh();
    } catch (e) {
      console.warn('Failed to update featured status:', e);
    }
  };

  // Delete Crew Member
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete crew member "${name}"?`)) return;

    // 1. Immediately update state
    setCrew((prev) => prev.filter((c) => c.id !== id));
    toast.success(`Crew member "${name}" deleted`);

    try {
      const supabase = createClient();
      await supabase.from('crew_members').delete().eq('id', id);

      await fetch(`/api/admin/crew?id=${id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } catch (e) {
      console.error('Failed to delete member:', e);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <Users className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Curation Crew Members</h3>
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                {crew.length} Curators
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control the homepage infinite scrolling marquee and the featured story showcase.
            </p>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Crew Member</span>
        </Button>
      </div>

      {/* Grid of Crew Members */}
      {loading && crew.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
        </div>
      ) : crew.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Crew Members Found</p>
          <p className="text-xs text-slate-500 mt-1">Click &quot;Add Crew Member&quot; to populate the homepage marquee.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map((member) => (
            <div
              key={member.id}
              className={`p-4 rounded-2xl border transition-all duration-200 bg-slate-900/80 flex flex-col justify-between ${
                member.is_featured
                  ? 'border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/40'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-rose-500/40 bg-slate-800 flex-shrink-0">
                      <img
                        src={member.avatar_url}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-white">{member.name}</h4>
                        {member.is_featured && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-rose-400 font-medium">{member.position}</p>
                    </div>
                  </div>

                  {/* Featured Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(member)}
                    title={member.is_featured ? 'Click to unfeature' : 'Click to make Featured Showcase'}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      member.is_featured
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${member.is_featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 italic mb-2">
                  &ldquo;{member.short_bio}&rdquo;
                </p>

                {member.full_story && (
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {member.full_story}
                  </p>
                )}

                {/* Active Social Media Badges */}
                {(member.linkedin_url || member.instagram_url || member.facebook_url || member.twitter_url || member.x_url) && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                    {member.linkedin_url && (
                      <a
                        href={member.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="LinkedIn Profile"
                      >
                        <IconBrandLinkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {member.instagram_url && (
                      <a
                        href={member.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors"
                        title="Instagram Profile"
                      >
                        <IconBrandInstagram className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {member.facebook_url && (
                      <a
                        href={member.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        title="Facebook Profile"
                      >
                        <IconBrandFacebook className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {(member.twitter_url || member.x_url) && (
                      <a
                        href={member.twitter_url || member.x_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 transition-colors"
                        title="X / Twitter Profile"
                      >
                        <IconBrandX className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(member)}
                  className="h-7 text-xs border-slate-700 hover:bg-slate-800 text-slate-300"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(member.id, member.name)}
                  className="h-7 text-xs border-red-900/50 hover:bg-red-950/50 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? 'Edit Crew Member' : 'Add New Crew Member'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Enter the crew member details and upload their portrait image.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Member Name *</Label>
              <Input
                placeholder="e.g. Full Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Position / Title *</Label>
              <Input
                placeholder="e.g. Lead Fine Art Curator"
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
                required
              />
            </div>

            {/* Avatar / Portrait Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Portrait Image *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://... or upload below"
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
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {formAvatarUrl && (
                <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-slate-700">
                    <img src={formAvatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-slate-400 truncate flex-1">Portrait selected</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Short Bio (Marquee Card &amp; Highlights) *</Label>
              <Textarea
                placeholder="A concise 1-2 sentence pitch..."
                value={formShortBio}
                onChange={(e) => setFormShortBio(e.target.value)}
                rows={2}
                className="bg-slate-950 border-slate-800 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Story (Shown in Detailed Modal)</Label>
              <Textarea
                placeholder="Detailed career background, exhibitions, creative philosophy, and vision..."
                value={formFullStory}
                onChange={(e) => setFormFullStory(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-xs"
              />
            </div>

            {/* Social Media Links Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-rose-400" />
                <Label className="text-xs font-semibold text-white">Social Media Links (Optional)</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 flex items-center gap-1">
                    <IconBrandLinkedin className="w-3 h-3 text-blue-400" />
                    <span>LinkedIn URL</span>
                  </Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={formLinkedinUrl}
                    onChange={(e) => setFormLinkedinUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 flex items-center gap-1">
                    <IconBrandInstagram className="w-3 h-3 text-pink-400" />
                    <span>Instagram URL</span>
                  </Label>
                  <Input
                    placeholder="https://instagram.com/..."
                    value={formInstagramUrl}
                    onChange={(e) => setFormInstagramUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 flex items-center gap-1">
                    <IconBrandFacebook className="w-3 h-3 text-indigo-400" />
                    <span>Facebook URL</span>
                  </Label>
                  <Input
                    placeholder="https://facebook.com/..."
                    value={formFacebookUrl}
                    onChange={(e) => setFormFacebookUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300 flex items-center gap-1">
                    <IconBrandX className="w-3 h-3 text-slate-200" />
                    <span>X (Twitter) URL</span>
                  </Label>
                  <Input
                    placeholder="https://x.com/..."
                    value={formTwitterUrl}
                    onChange={(e) => setFormTwitterUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Featured Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Featured Crew Member</p>
                <p className="text-[11px] text-slate-400">Display this person prominently in the Yellow Showcase section</p>
              </div>
              <input
                type="checkbox"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
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
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                {editingId ? 'Save Changes' : 'Create Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
