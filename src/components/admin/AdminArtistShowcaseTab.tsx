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
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export interface AdminArtistItem {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  display_order?: number;
  show_on_home?: boolean;
  role?: string | null;
}

export default function AdminArtistShowcaseTab() {
  const [artists, setArtists] = useState<AdminArtistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  // Load artists from Supabase database without selecting display_name
  const loadArtists = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      // Explicitly select only valid columns from profiles table and exclude client & admin
      let { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, avatar_url, display_order, show_on_home')
        .or('role.eq.artist,role.eq.ARTIST,is_artist.eq.true')
        .neq('role', 'client')
        .neq('role', 'CLIENT')
        .neq('role', 'admin')
        .neq('role', 'ADMIN');

      // Fallback query if is_artist column does not exist on remote database yet
      if (error) {
        console.warn('Primary artist query notice (falling back):', error.message);
        const fallback = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role, avatar_url, display_order, show_on_home')
          .or('role.ilike.%artist%,role.ilike.%freelancer%')
          .neq('role', 'client')
          .neq('role', 'CLIENT')
          .neq('role', 'admin')
          .neq('role', 'ADMIN');

        if (!fallback.error && fallback.data) {
          data = fallback.data;
          error = null;
        }
      }

      if (!error && Array.isArray(data)) {
        // Exclude client and admin
        const valid = data.filter((p: any) => {
          const role = (p.role || '').toLowerCase();
          return role !== 'client' && role !== 'admin';
        });

        const formatted: AdminArtistItem[] = valid.map((item: any) => ({
          id: item.id,
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          email: item.email || '',
          role: item.role || 'artist',
          avatar_url: item.avatar_url || '',
          // Default display_order to 0 and show_on_home to true if undefined
          display_order: typeof item.display_order === 'number' ? item.display_order : 0,
          show_on_home: item.show_on_home !== undefined && item.show_on_home !== null ? Boolean(item.show_on_home) : true,
        }));

        formatted.sort((a, b) => {
          const orderA = a.display_order ?? 0;
          const orderB = b.display_order ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          const nameA = [a.first_name, a.last_name].filter(Boolean).join(' ').trim() || a.email || '';
          const nameB = [b.first_name, b.last_name].filter(Boolean).join(' ').trim() || b.email || '';
          return nameA.localeCompare(nameB);
        });

        setArtists(formatted);
        return;
      }

      // API Fallback
      const res = await fetch('/api/admin/artists/order');
      const apiData = await res.json();
      if (apiData?.artists && Array.isArray(apiData.artists)) {
        const valid = apiData.artists.filter((p: any) => {
          const role = (p.role || '').toLowerCase();
          return role !== 'client' && role !== 'admin';
        });

        const formatted: AdminArtistItem[] = valid.map((item: any) => ({
          id: item.id,
          first_name: item.first_name || '',
          last_name: item.last_name || '',
          email: item.email || '',
          role: item.role || 'artist',
          avatar_url: item.avatar_url || '',
          display_order: typeof item.display_order === 'number' ? item.display_order : 0,
          show_on_home: item.show_on_home !== undefined && item.show_on_home !== null ? Boolean(item.show_on_home) : true,
        }));
        setArtists(formatted);
      } else if (apiData?.error) {
        toast.error(apiData.error);
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
        a.id === id ? { ...a, display_order: isNaN(parsed) ? 0 : parsed } : a
      )
    );
  };

  // Toggle show_on_home locally and persist
  const handleToggleShowOnHome = async (artist: AdminArtistItem) => {
    const isCurrentlyHome = artist.show_on_home !== undefined && artist.show_on_home !== null ? Boolean(artist.show_on_home) : true;
    const nextState = !isCurrentlyHome;
    const orderVal = typeof artist.display_order === 'number' ? artist.display_order : 0;

    // Optimistic local update
    setArtists((prev) =>
      prev.map((a) => (a.id === artist.id ? { ...a, show_on_home: nextState } : a))
    );

    setSavingId(artist.id);
    try {
      // 1. Direct Supabase update
      const supabase = createClient();
      const { error: sbError } = await supabase
        .from('profiles')
        .update({
          show_on_home: nextState,
          display_order: orderVal,
        })
        .eq('id', artist.id);

      if (sbError) {
        // Fallback to API route
        const res = await fetch('/api/admin/artists/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            show_on_home: nextState,
            display_order: orderVal,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update showcase toggle');
      }

      // Concatenate first_name and last_name for UI display
      const artistName =
        [artist.first_name, artist.last_name].filter(Boolean).join(' ').trim() ||
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
        prev.map((a) => (a.id === artist.id ? { ...a, show_on_home: isCurrentlyHome } : a))
      );
      toast.error(err.message || 'Failed to update home showcase status');
    } finally {
      setSavingId(null);
    }
  };

  // Save single artist display order and show_on_home
  const handleSaveSingle = async (artist: AdminArtistItem) => {
    setSavingId(artist.id);
    const orderVal = typeof artist.display_order === 'number' ? artist.display_order : 0;
    const showVal = artist.show_on_home !== undefined && artist.show_on_home !== null ? Boolean(artist.show_on_home) : true;

    try {
      const supabase = createClient();
      const { error: sbError } = await supabase
        .from('profiles')
        .update({
          display_order: orderVal,
          show_on_home: showVal,
        })
        .eq('id', artist.id);

      if (sbError) {
        const res = await fetch('/api/admin/artists/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: artist.id,
            display_order: orderVal,
            show_on_home: showVal,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save changes');
      }

      // Concatenate first_name and last_name
      const artistName =
        [artist.first_name, artist.last_name].filter(Boolean).join(' ').trim() ||
        artist.email ||
        'Artist';

      toast.success(`Saved order #${orderVal} for ${artistName}`);
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
        display_order: typeof a.display_order === 'number' ? a.display_order : 0,
        show_on_home: a.show_on_home !== undefined && a.show_on_home !== null ? Boolean(a.show_on_home) : true,
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
          (a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0)
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
      const concatenated = `${fn} ${ln}`.trim();
      const email = (a.email || '').toLowerCase();
      return (
        concatenated.includes(q) ||
        fn.includes(q) ||
        ln.includes(q) ||
        email.includes(q)
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
                  <th className="py-3 px-4 font-semibold">Artist Name</th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">First Name</th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell">Last Name</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell">Email / Identifier</th>
                  <th className="py-3 px-4 font-semibold text-center w-36">Show on Home</th>
                  <th className="py-3 px-4 font-semibold text-center w-32">Display Order</th>
                  <th className="py-3 px-4 font-semibold text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredArtists.map((artist, idx) => {
                  const firstName = (artist.first_name || '').trim();
                  const lastName = (artist.last_name || '').trim();
                  // Concatenate first_name and last_name inside the UI for rendering names
                  const concatenatedName = [firstName, lastName].filter(Boolean).join(' ').trim();
                  const displayNameUI = concatenatedName || artist.email || 'Unnamed Artist';
                  const isVisibleOnHome = artist.show_on_home !== undefined && artist.show_on_home !== null ? Boolean(artist.show_on_home) : true;
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
                              alt={displayNameUI}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="font-bold text-xs text-amber-400">
                              {((concatenatedName || artist.email || 'A')[0]).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Artist Name (Concatenated first_name & last_name) */}
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">
                            {displayNameUI}
                          </span>
                          {artist.role && (
                            <span className="text-[10px] text-slate-400 capitalize">
                              {artist.role}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* First Name */}
                      <td className="py-3 px-4 text-slate-300 hidden sm:table-cell">
                        {firstName || <span className="text-slate-500 italic">—</span>}
                      </td>

                      {/* Last Name */}
                      <td className="py-3 px-4 text-slate-300 hidden sm:table-cell">
                        {lastName || <span className="text-slate-500 italic">—</span>}
                      </td>

                      {/* Email / Handle */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] hidden md:table-cell truncate max-w-[200px]">
                        {artist.email || artist.id.slice(0, 8)}
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
                        <div className="inline-flex items-center gap-1 justify-center">
                          <Input
                            type="number"
                            min={0}
                            value={artist.display_order ?? 0}
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
