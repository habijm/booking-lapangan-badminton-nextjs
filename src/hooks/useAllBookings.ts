'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types/booking';

export function useAllBookings(limit = 1000) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, court:courts(id,name,price_per_hour)')
      .order('booking_date', { ascending: false })
      .order('start_time',   { ascending: true })
      .limit(limit);
    setBookings((data || []) as Booking[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetch();
    const sub = supabase.channel('all-bookings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetch]);

  return { bookings, loading, refetch: fetch };
}
