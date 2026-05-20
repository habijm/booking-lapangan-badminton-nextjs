'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Court } from '@/types/booking';

export function useCourts(activeOnly = false) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let q = supabase.from('courts').select('*').order('name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    setCourts((data || []) as Court[]);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    fetch();
    const sub = supabase.channel('courts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetch]);

  return { courts, loading, refetch: fetch };
}
