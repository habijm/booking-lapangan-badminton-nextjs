'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_SETTINGS, CourtSettings } from '@/lib/config';

/**
 * Loads live settings from Supabase `settings` table.
 * Falls back to DEFAULT_SETTINGS if table is empty or not yet set up.
 */
export function useSettings() {
  const [settings, setSettings] = useState<CourtSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error || !data?.length) {
        setLoading(false);
        return;
      }

      const map = Object.fromEntries(data.map(r => [r.key, r.value]));

      setSettings({
        court_name:               map.court_name               ?? DEFAULT_SETTINGS.court_name,
        court_address:            map.court_address            ?? DEFAULT_SETTINGS.court_address,
        whatsapp_number:          map.whatsapp_number          ?? DEFAULT_SETTINGS.whatsapp_number,
        opening_hour:             Number(map.opening_hour      ?? DEFAULT_SETTINGS.opening_hour),
        closing_hour:             Number(map.closing_hour      ?? DEFAULT_SETTINGS.closing_hour),
        price_per_hour:           Number(map.price_per_hour    ?? DEFAULT_SETTINGS.price_per_hour),
        booking_window_days:      Number(map.booking_window_days ?? DEFAULT_SETTINGS.booking_window_days),
        cancellation_window_hours:Number(map.cancellation_window_hours ?? DEFAULT_SETTINGS.cancellation_window_hours),
        announcement:             map.announcement             ?? '',
        fonnte_enabled:           map.fonnte_enabled === 'true',
      });
      setLoading(false);
    }
    load();
  }, []);

  return { settings, loading };
}
