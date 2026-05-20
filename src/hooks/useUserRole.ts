'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/booking';

export function useUserRole() {
  const [role, setRole]       = useState<UserRole | null>(null);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      setUserId(session.user.id);

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      // If no role record → treat as 'admin' (backward compat for existing single-admin setups)
      setRole((data?.role as UserRole) ?? 'admin');
      setLoading(false);
    }
    load();
  }, []);

  const can = (action: 'confirm' | 'cancel' | 'delete' | 'settings' | 'courts' | 'roles') => {
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
  };

  return { role, userId, loading, can };
}
