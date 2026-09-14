'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/booking';

export function useUserRole() {
  const [role, setRole]       = useState<UserRole | null>(null);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError || !session) {
          setLoading(false);
          return;
        }

        setUserId(session.user.id);

        const { data, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (cancelled) return;

        if (rolesError) {
          console.warn('[useUserRole] Role query error:', rolesError);
          // Backward compat: jika tidak ada role, default ke 'admin'
          setRole('admin');
        } else {
          setRole((data?.role as UserRole) ?? 'admin');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useUserRole] Unexpected error:', err);
          setError('Gagal memuat data user');
          // Fallback ke admin agar halaman tetap bisa diakses
          setRole('admin');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const can = useCallback((action: 'confirm' | 'cancel' | 'delete' | 'settings' | 'courts' | 'roles') => {
    if (!role) return false;
    const permissions: Record<typeof action, UserRole[]> = {
      confirm:  ['operator', 'admin', 'superadmin'],
      cancel:   ['operator', 'admin', 'superadmin'],
      delete:   ['admin', 'superadmin'],
      settings: ['admin', 'superadmin'],
      courts:   ['admin', 'superadmin'],
      roles:    ['superadmin'],
    };
    return permissions[action].includes(role);
  }, [role]);

  return { role, userId, loading, can, error };
}
