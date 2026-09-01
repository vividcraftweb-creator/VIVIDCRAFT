'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UserStats {
  totalUsers: number;
  verifiedUsers: number;
  buyersCount: number;
  artistsCount: number;
  adminsCount: number;
  loading: boolean;
}

export function useUserStats(): UserStats {
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    buyersCount: 0,
    artistsCount: 0,
    adminsCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createClient();
        const { data, count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        if (!error && data) {
          const total = typeof count === 'number' ? count : data.length;
          const buyers = data.filter((p: any) => {
            const r = (p.role || '').toUpperCase();
            return r === 'CLIENT' || r === 'BUYER';
          }).length;
          const artists = data.filter((p: any) => {
            const r = (p.role || '').toUpperCase();
            return r === 'FREELANCER' || r === 'ARTIST' || r === 'CREATOR';
          }).length;
          const admins = data.filter((p: any) => (p.role || '').toUpperCase() === 'ADMIN').length;

          setStats({
            totalUsers: total,
            verifiedUsers: total,
            buyersCount: buyers,
            artistsCount: artists,
            adminsCount: admins,
            loading: false,
          });
        }
      } catch (e) {
        console.warn('useUserStats fetch error:', e);
      }
    }

    loadStats();
  }, []);

  return stats;
}
