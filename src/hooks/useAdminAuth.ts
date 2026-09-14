'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAdminAuth() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (cancelled) return;

      if (sessionError) {
        console.error('[useAdminAuth] Session error:', sessionError);
        setError('Gagal memverifikasi sesi');
        setReady(true);
        return;
      }

      if (!session) {
        window.location.href = '/admin';
      } else {
        setReady(true);
      }
    }).catch((err) => {
      if (!cancelled) {
        console.error('[useAdminAuth] Unexpected error:', err);
        setError('Terjadi kesalahan saat autentikasi');
        setReady(true);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { ready, error };
}
