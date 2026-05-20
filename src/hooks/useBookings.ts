'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';

export function useBookings(date: string, courtId?: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('bookings').select('*, court:courts(id,name,price_per_hour)').eq('booking_date', date);
    if (courtId) q = q.eq('court_id', courtId);
    const { data } = await q.order('start_time', { ascending: true });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  }, [date, courtId]);

  useEffect(() => {
    fetch();
    const channelName = `bookings-${date}-${courtId ?? 'all'}`;
    const sub = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const rec = (payload.new || payload.old) as Partial<Booking>;
        if (!rec?.booking_date || rec.booking_date === date) fetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [date, courtId, fetch]);

  return { bookings, loading, refetch: fetch };
}
