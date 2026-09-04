'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Image as ImageIcon, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminArtworksTab() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = trpc.admin.jobs.getJobs.useQuery({
    limit: 50,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: search || undefined,
  });

  if (isLoading) return <div className="text-white p-4">Loading artworks...</div>;

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            id="search-artworks"
            name="search-artworks"
            placeholder="Search artworks..." 
            className="pl-9 bg-white/5 border-white/10 text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <h4 className="text-white font-medium line-clamp-1 flex-1 pr-2" title={job.title}>{job.title}</h4>
              <Badge className={
                job.status === 'OPEN' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
              }>
                {job.status}
              </Badge>
            </div>
            
            <p className="text-xs text-slate-400 line-clamp-2">
              {job.description}
            </p>

            <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Budget: ${job.budget ?? 'N/A'}</span>
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Artist ID: {job.clientId ? `${job.clientId.slice(0, 6)}...` : 'N/A'}
              </span>
            </div>
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-8">
            No artworks found.
          </div>
        )}
      </div>
    </div>
  );
}
