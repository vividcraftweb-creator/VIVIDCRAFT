'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { trpc } from '@/utils/trpc';
import { createClient } from '@/lib/supabase/client';
import {
  Gavel,
  Plus,
  Trash2,
  Edit,
  Clock,
  TrendingUp,
  Search,
  RefreshCw,
  ExternalLink,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AdminAuctionsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'ENDED'>('ALL');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // TRPC queries & mutations
  const utils = trpc.useUtils();
  const { data: auctions, isLoading, refetch } = trpc.admin.auctions.getAuctions.useQuery({
    status: statusFilter,
    search: searchQuery.trim() || undefined,
  });

  const createMutation = trpc.admin.auctions.createAuction.useMutation({
    onSuccess: () => {
      toast.success('Live Auction created successfully');
      setIsCreateOpen(false);
      resetCreateForm();
      utils.admin.auctions.getAuctions.invalidate();
      utils.artworks.getAllArtworks.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to create auction: ' + err.message);
      setSubmitting(false);
    },
  });

  const updateMutation = trpc.admin.auctions.updateAuction.useMutation({
    onSuccess: () => {
      toast.success('Auction updated successfully');
      setEditingAuction(null);
      utils.admin.auctions.getAuctions.invalidate();
      utils.artworks.getAllArtworks.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to update auction: ' + err.message);
      setSubmitting(false);
    },
  });

  const deleteMutation = trpc.admin.auctions.deleteAuction.useMutation({
    onSuccess: () => {
      toast.success('Auction deleted successfully');
      setDeletingAuction(null);
      utils.admin.auctions.getAuctions.invalidate();
      utils.artworks.getAllArtworks.invalidate();
    },
    onError: (err) => {
      toast.error('Failed to delete auction: ' + err.message);
      setSubmitting(false);
    },
  });

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newStartingBid, setNewStartingBid] = useState('');
  const [newCurrentBid, setNewCurrentBid] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newStatus, setNewStatus] = useState<'LIVE' | 'ENDED'>('LIVE');

  // Edit Modal State
  const [editingAuction, setEditingAuction] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartingBid, setEditStartingBid] = useState('');
  const [editCurrentBid, setEditCurrentBid] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editStatus, setEditStatus] = useState<'LIVE' | 'ENDED'>('LIVE');

  // Delete State
  const [deletingAuction, setDeletingAuction] = useState<any | null>(null);

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewImageUrl('');
    setNewStartingBid('');
    setNewCurrentBid('');
    setNewEndTime('');
    setNewStatus('LIVE');
    setSubmitting(false);
    setIsUploadingImage(false);
  };

  const handleOpenEdit = (auction: any) => {
    setEditingAuction(auction);
    setEditTitle(auction.title || '');
    setEditDescription(auction.description || '');
    setEditStartingBid(String(auction.starting_bid || ''));
    setEditCurrentBid(String(auction.current_bid || auction.starting_bid || ''));
    setEditEndTime(
      auction.end_time
        ? new Date(auction.end_time).toISOString().slice(0, 16)
        : ''
    );
    setEditStatus(auction.status === 'ENDED' ? 'ENDED' : 'LIVE');
    setSubmitting(false);
  };

  // Direct Storage Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image file size must be less than 15MB');
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading auction artwork to storage...');

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `auction_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `auctions/${fileName}`;

      // Upload to portfolio or banners bucket
      let uploadResult = await supabase.storage.from('portfolio').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      let publicUrl = '';
      if (uploadResult.error) {
        // Fallback to banners bucket
        const fallbackRes = await supabase.storage.from('banners').upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (fallbackRes.error) {
          throw uploadResult.error;
        }
        const { data } = supabase.storage.from('banners').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      } else {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      setNewImageUrl(publicUrl);
      toast.success('Artwork image uploaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Auction image upload error:', err);
      toast.error('Failed to upload image: ' + (err.message || 'Unknown error'), { id: toastId });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter an auction title');
      return;
    }

    if (!newImageUrl.trim()) {
      toast.error('Please upload or enter an image URL for the auction item');
      return;
    }

    const startBid = parseFloat(newStartingBid);
    if (isNaN(startBid) || startBid < 0) {
      toast.error('Please enter a valid starting bid amount');
      return;
    }

    const curBid = newCurrentBid.trim() ? parseFloat(newCurrentBid) : startBid;

    setSubmitting(true);
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      imageUrl: newImageUrl.trim(),
      startingBid: startBid,
      currentBid: isNaN(curBid) ? startBid : curBid,
      endTime: newEndTime ? new Date(newEndTime).toISOString() : null,
      status: newStatus,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuction) return;

    const startBid = parseFloat(editStartingBid);
    const curBid = parseFloat(editCurrentBid);

    setSubmitting(true);
    updateMutation.mutate({
      id: editingAuction.id,
      title: editTitle.trim(),
      description: editDescription.trim(),
      startingBid: isNaN(startBid) ? undefined : startBid,
      currentBid: isNaN(curBid) ? undefined : curBid,
      endTime: editEndTime ? new Date(editEndTime).toISOString() : null,
      status: editStatus,
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingAuction) return;
    setSubmitting(true);
    deleteMutation.mutate({ id: deletingAuction.id });
  };

  // Extend end time helper (+hours / +days)
  const handleExtendEndTime = (days: number) => {
    const baseDate = editEndTime ? new Date(editEndTime) : new Date();
    const targetDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    setEditEndTime(targetDate.toISOString().slice(0, 16));
  };

  // Statistics calculation
  const totalCount = auctions?.length || 0;
  const liveCount = auctions?.filter((a: any) => a.status === 'LIVE').length || 0;
  const endedCount = auctions?.filter((a: any) => a.status === 'ENDED').length || 0;

  // Format time remaining
  const formatTimeRemaining = (endTimeStr?: string | null) => {
    if (!endTimeStr) return 'No deadline set';
    const end = new Date(endTimeStr);
    if (isNaN(end.getTime())) return 'Invalid date';
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return 'Ended';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays > 0) return `${diffDays}d ${diffHours}h left`;
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m left`;
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Gavel className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Live Bidding &amp; Auctions</h2>
            <p className="text-slate-400 text-xs">Manage active auctions, current bids, and bidding deadlines</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white h-8 text-xs gap-1.5"
          >
            <Link href="/bidding" target="_blank">
              <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
              Public Bidding Page
            </Link>
          </Button>

          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white h-8 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold h-8 text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            Create Live Auction
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-amber-400 font-medium uppercase tracking-wide">Total Items</div>
                <div className="text-xl font-bold text-white mt-0.5">{totalCount}</div>
              </div>
              <Tag className="h-5 w-5 text-amber-400/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Live Auctions</div>
                <div className="text-xl font-bold text-white mt-0.5">{liveCount}</div>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-400/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Ended</div>
                <div className="text-xl font-bold text-white mt-0.5">{endedCount}</div>
              </div>
              <Clock className="h-5 w-5 text-slate-400/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by title, Art Code (#AUC-...), or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-slate-950 border-slate-800 text-xs h-8 text-white placeholder:text-slate-500 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <Button
            size="sm"
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ALL')}
            className={`h-7 text-xs ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            All ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'LIVE' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('LIVE')}
            className={`h-7 text-xs ${
              statusFilter === 'LIVE'
                ? 'bg-emerald-600 text-white font-bold hover:bg-emerald-500'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Live ({liveCount})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'ENDED' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('ENDED')}
            className={`h-7 text-xs ${
              statusFilter === 'ENDED'
                ? 'bg-slate-700 text-white font-bold hover:bg-slate-600'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Ended ({endedCount})
          </Button>
        </div>
      </div>

      {/* Auctions Table */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Item</th>
                <th className="py-3 px-3">Auction Code</th>
                <th className="py-3 px-3">Starting Bid</th>
                <th className="py-3 px-3">Current Bid</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading auctions...
                  </td>
                </tr>
              ) : !auctions || auctions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Gavel className="h-10 w-10 mx-auto mb-2 text-slate-600" />
                    <p className="text-white font-medium text-sm">No live auctions found</p>
                    <p className="text-xs text-slate-400 mt-1">Create an auction to start live bidding</p>
                  </td>
                </tr>
              ) : (
                auctions.map((auction: any) => {
                  const isEnded = auction.status === 'ENDED';
                  const remaining = formatTimeRemaining(auction.end_time);

                  return (
                    <tr key={auction.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Image & Title */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={auction.image_url}
                            alt={auction.title}
                            className="h-11 w-11 object-cover rounded-lg border border-slate-800 shrink-0 bg-slate-950"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=150&q=80';
                            }}
                          />
                          <div className="min-w-0 max-w-[180px]">
                            <p className="text-white font-medium truncate text-xs">{auction.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{auction.artist_name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                        >
                          {auction.art_code}
                        </Badge>
                      </td>

                      {/* Starting Bid */}
                      <td className="py-2.5 px-3 font-semibold text-slate-300">
                        LKR {Number(auction.starting_bid || 0).toLocaleString()}
                      </td>

                      {/* Current Bid */}
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-bold">
                          LKR {Number(auction.current_bid || auction.starting_bid || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* End Time */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-300 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{remaining}</span>
                        </div>
                        {auction.end_time && (
                          <div className="text-[10px] text-slate-500">
                            {new Date(auction.end_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isEnded ? (
                          <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px]">
                            ENDED
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                            LIVE
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(auction)}
                            className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                            title="Edit Auction & Bids"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingAuction(auction)}
                            className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            title="Delete Auction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE LIVE AUCTION DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white max-h-[85vh] overflow-y-auto pr-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Gavel className="h-5 w-5 text-amber-400" />
              Create Live Auction
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Upload artwork and configure starting bid and auction end time.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2">
            {/* Title */}
            <div>
              <Label className="text-xs text-slate-300">Auction Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Celestial Harmony Oil Painting"
                className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-slate-300">Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of the artwork, medium, dimensions..."
                className="bg-slate-950 border-slate-800 text-xs text-white mt-1 h-16"
              />
            </div>

            {/* Direct Image File Upload */}
            <div>
              <Label className="text-xs text-slate-300">Artwork Image *</Label>
              <div className="mt-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="bg-slate-950 border-slate-800 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                        Uploading to Storage...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 text-amber-400" />
                        Upload Image File
                      </>
                    )}
                  </Button>
                  <span className="text-[11px] text-slate-500">or paste URL below</span>
                </div>

                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... or uploaded image URL"
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-white"
                  required
                />

                {newImageUrl && (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 mt-1">
                    <img src={newImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Starting Bid & Initial Bid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs text-slate-300">Starting Bid (LKR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newStartingBid}
                  onChange={(e) => setNewStartingBid(e.target.value)}
                  placeholder="45000"
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Current Bid (LKR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={newCurrentBid}
                  onChange={(e) => setNewCurrentBid(e.target.value)}
                  placeholder="Leave blank for starting bid"
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                />
              </div>
            </div>

            {/* End Date / Time */}
            <div>
              <Label className="text-xs text-slate-300">Auction End Date &amp; Time</Label>
              <Input
                type="datetime-local"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
              />
            </div>

            {/* Status */}
            <div>
              <Label className="text-xs text-slate-300">Auction Status</Label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as 'LIVE' | 'ENDED')}
                className="w-full mt-1 bg-slate-950 border border-slate-800 text-white text-xs h-8 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="LIVE">LIVE (Open for Bidding)</option>
                <option value="ENDED">ENDED (Closed)</option>
              </select>
            </div>

            <DialogFooter className="sticky bottom-0 bg-slate-900 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || isUploadingImage}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Creating...
                  </>
                ) : (
                  'Create Live Auction'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT AUCTION DIALOG */}
      <Dialog open={!!editingAuction} onOpenChange={(open) => !open && setEditingAuction(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white max-h-[85vh] overflow-y-auto pr-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Edit className="h-5 w-5 text-amber-400" />
              Update Live Auction
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Update current bid, extend auction end time, or mark as ended.
            </DialogDescription>
          </DialogHeader>

          {editingAuction && (
            <form onSubmit={handleEditSubmit} className="space-y-3.5 pt-2">
              <div>
                <Label className="text-xs text-slate-300">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                  required
                />
              </div>

              {/* Bids */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs text-slate-300">Starting Bid (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editStartingBid}
                    onChange={(e) => setEditStartingBid(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Current / Highest Bid (LKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editCurrentBid}
                    onChange={(e) => setEditCurrentBid(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1 font-bold text-emerald-400"
                  />
                </div>
              </div>

              {/* End Time with Quick Extension buttons */}
              <div>
                <Label className="text-xs text-slate-300">Auction End Date &amp; Time</Label>
                <Input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-8 text-white mt-1"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-500">Extend:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendEndTime(1)}
                    className="h-6 px-1.5 text-[10px] bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    +24 Hours
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendEndTime(3)}
                    className="h-6 px-1.5 text-[10px] bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    +3 Days
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtendEndTime(7)}
                    className="h-6 px-1.5 text-[10px] bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  >
                    +7 Days
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs text-slate-300">Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'LIVE' | 'ENDED')}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 text-white text-xs h-8 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="LIVE">LIVE (Open for Bidding)</option>
                  <option value="ENDED">ENDED (Closed)</option>
                </select>
              </div>

              <DialogFooter className="sticky bottom-0 bg-slate-900 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAuction(null)}
                  className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deletingAuction} onOpenChange={(open) => !open && setDeletingAuction(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Delete Auction Item
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Are you sure you want to delete &quot;{deletingAuction?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingAuction(null)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                'Delete Auction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
