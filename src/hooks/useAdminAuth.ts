'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Dipakai di setiap halaman admin.
 * Jika belum login → redirect ke /admin.
 * Return { ready: true } jika sudah login dan siap render.
 */
export function useAdminAuth() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/admin';
      } else {
        setReady(true);
      }
    });
  }, []);

  return { ready };
}
