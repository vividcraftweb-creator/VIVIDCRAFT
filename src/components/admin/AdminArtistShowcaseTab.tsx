'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpDown,
  RefreshCw,
  Save,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

export interface AdminArtistItem {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  display_order?: number;
  show_on_home?: boolean;
  role?: string | null;
  title?: string | null;
  professional_title?: string | null;
  is_verified?: boolean;
}

export default function AdminArtistShowcaseTab() {
  const [artists, setArtists] = useState<AdminArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // Load all artists from API
  const loadArtists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/artists/order');
      const data = await res.json();
      if (data?.artists && Array.isArray(data.artists)) {
        setArtists(data.artists);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      console.error('Failed to load artists for showcase:', err);
      toast.error('Failed to load artists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtists();
  }, []);

  // Update local display order
  const handleOrderChange = (id: string, newOrder: string) => {
    const parsed = parseInt(newOrder, 10);
    setArtists((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, display_order: isNaN(parsed) ? 999 : parsed } : a
      )
    );
  };

  // Toggle show_on_home locally and immediately persist
  const handleToggleShowOnHome = async (artist: AdminArtistItem) => {
    const nextState = !artist.show_on_home;
    // Optimistic local update
    setArtists((prev) =>
      prev.map((a) => (a.id === artist.id ? { ...a, show_on_home: nextState } : a))
    );

    setSavingId(artist.id);
    try {
      const res = await fetch('/api/admin/artists/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          show_on_home: nextState,
          display_order: artist.display_order ?? 999,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update showcase toggle');

      const artistName =
        [artist.first_name, artist.last_name].filter(Boolean).join(' ') ||
        artist.full_name ||
        artist.email ||
        'Artist';

      if (nextState) {
        toast.success(`${artistName} will now appear on the home page`);
      } else {
        toast.info(`${artistName} removed from the home page`);
      }
    } catch (err: any) {
      // Revert on failure
      setArtists((prev) =>
        prev.map((a) => (a.id === artist.id ? { ...a, show_on_home: !nextState } : a))
      );
      toast.error(err.message || 'Failed to update home showcase status');
    } finally {
      setSavingId(null);
    }
  };

  // Save single artist display order and show_on_home
  const handleSaveSingle = async (artist: AdminArtistItem) => {
    setSavingId(artist.id);
    try {
      const res = await fetch('/api/admin/artists/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          display_order: artist.display_order ?? 999,
          show_on_home: Boolean(artist.show_on_home),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      const artistName =
        [artist.first_name, artist.last_name].filter(Boolean).join(' ') ||
        artist.full_name ||
        artist.email ||
        'Artist';

      toast.success(`Saved order #${artist.display_order ?? 999} for ${artistName}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save artist order');
    } finally {
      setSavingId(null);
    }
  };

  // Save all artists in batch
  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const orders = artists.map((a) => ({
        id: a.id,
        display_order: a.display_order ?? 999,
        show_on_home: Boolean(a.show_on_home),
      }));

      const res = await fetch('/api/admin/artists/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      toast.success('All artist display orders and showcase settings saved!');
      // Re-sort locally
      setArtists((prev) =>
        [...prev].sort(
          (a, b) => Number(a.display_order ?? 999) - Number(b.display_order ?? 999)
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to save artist changes');
    } finally {
      setSavingAll(false);
    }
  };

  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase().trim();
    return artists.filter((a) => {
      const fn = (a.first_name || '').toLowerCase();
      const ln = (a.last_name || '').toLowerCase();
      const full = (a.full_name || '').toLowerCase();
      const email = (a.email || '').toLowerCase();
      const un = (a.username || '').toLowerCase();
      return (
        fn.includes(q) ||
        ln.includes(q) ||
        full.includes(q) ||
        email.includes(q) ||
        un.includes(q)
      );
    });
  }, [artists, searchQuery]);

  const homeCount = useMemo(
    () => artists.filter((a) => Boolean(a.show_on_home)).length,
    [artists]
  );

  return (
    <Card className="bg-slate-900/90 border-slate-800 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-amber-400" />
              Artist Display Order &amp; Home Showcase
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Select which artists appear on the landing page (&ldquo;Show on Home&rdquo;) and manually control their display sequence (1, 2, 3...).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>Total: <strong>{artists.length}</strong></span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>On Home: <strong>{homeCount}</strong></span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadArtists}
              disabled={loading}
              className="h-8 px-2.5 text-xs border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={savingAll || artists.length === 0}
              className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-sm"
            >
              {savingAll ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Save All Changes
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-3 relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by first name, last name, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 rounded-lg"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
            Loading artists from database...
          </div>
        ) : filteredArtists.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400 border border-dashed border-slate-800 rounded-xl">
            {searchQuery ? 'No artists match your search query.' : 'No artist profiles found in database.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3.5 font-semibold text-center w-12">#</th>
                  <th className="py-3 px-3 font-semibold w-12">Photo</th>
                  <th className="py-3 px-4 font-semibold">First Name</th>
                  <th className="py-3 px-4 font-semibold">Last Name</th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">Email / Identifier</th>
                  <th className="py-3 px-4 font-semibold text-center w-36">Show on Home</th>
                  <th className="py-3 px-4 font-semibold text-center w-32">Display Order</th>
                  <th className="py-3 px-4 font-semibold text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredArtists.map((artist, idx) => {
                  const firstName = (artist.first_name || '').trim();
                  const lastName = (artist.last_name || '').trim();
                  const isVisibleOnHome = Boolean(artist.show_on_home);
                  const isSaving = savingId === artist.id;

                  return (
                    <tr
                      key={artist.id}
                      className={`transition-colors hover:bg-slate-900/50 ${
                        isVisibleOnHome ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Rank Index */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Photo */}
                      <td className="py-3 px-3">
                        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {artist.avatar_url ? (
                            <img
                              src={artist.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="font-bold text-xs text-amber-400">
                              {((firstName || artist.full_name || artist.email || 'A')[0]).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* First Name */}
                      <td className="py-3 px-4 font-semibold text-white">
                        {firstName || <span className="text-slate-500 italic">None</span>}
                      </td>

                      {/* Last Name */}
                      <td className="py-3 px-4 font-semibold text-white">
                        {lastName || <span className="text-slate-500 italic">None</span>}
                      </td>

                      {/* Email / Handle */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] hidden sm:table-cell truncate max-w-[200px]">
                        {artist.email || artist.username || artist.id.slice(0, 8)}
                      </td>

                      {/* Show on Home Toggle */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isVisibleOnHome}
                            onChange={() => handleToggleShowOnHome(artist)}
                            disabled={isSaving}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 relative"></div>
                          <span
                            className={`text-[11px] font-semibold hidden md:inline ${
                              isVisibleOnHome ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            {isVisibleOnHome ? 'Active' : 'Off'}
                          </span>
                        </label>
                      </td>

                      {/* Display Order Input */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={artist.display_order ?? 999}
                            onChange={(e) => handleOrderChange(artist.id, e.target.value)}
                            className="w-20 h-8 bg-slate-900 border-slate-700 text-white text-xs text-center font-bold focus:border-amber-500"
                          />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveSingle(artist)}
                          disabled={isSaving}
                          className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                          title="Save this artist"
                        >
                          {isSaving ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                          ) : (
                            <Save className="h-3.5 w-3.5 text-slate-300 hover:text-amber-400" />
                          )}
                          <span className="sr-only">Save</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
