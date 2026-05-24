'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BadmintonEvent } from '@/types/booking';

export function useEvents(publishedOnly = false) {
  const [events, setEvents]   = useState<BadmintonEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('events').select('*').order('start_date', { ascending: true });
    if (publishedOnly) q = q.eq('is_published', true);
    const { data } = await q;
    setEvents((data || []) as BadmintonEvent[]);
    setLoading(false);
  }, [publishedOnly]);

  useEffect(() => {
    fetch();
    const sub = supabase.channel('events-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetch]);

  return { events, loading, refetch: fetch };
}
