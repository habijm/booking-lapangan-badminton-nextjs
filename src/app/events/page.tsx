import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, CourtSettings, parseClosedDates } from '@/lib/config';
import { BadmintonEvent } from '@/types/booking';
import { BookingMode } from '@/types/payment';
import EventsPublicPage from './EventsPublicPage';

export const dynamic = 'force-dynamic';

async function getData(): Promise<{ settings: CourtSettings; events: BadmintonEvent[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: settingsData }, { data: eventsData }] = await Promise.all([
    supabase.from('settings').select('key, value'),
    supabase.from('events').select('*').eq('is_published', true).order('start_date', { ascending: true }),
  ]);

  const map = Object.fromEntries((settingsData || []).map(r => [r.key, r.value]));
  const settings: CourtSettings = {
    court_name:               map.court_name               ?? DEFAULT_SETTINGS.court_name,
    court_address:            map.court_address            ?? DEFAULT_SETTINGS.court_address,
    whatsapp_number:          map.whatsapp_number          ?? DEFAULT_SETTINGS.whatsapp_number,
    booking_mode:             (map.booking_mode ?? DEFAULT_SETTINGS.booking_mode ?? 'whatsapp') as BookingMode,
    opening_hour:             Number(map.opening_hour      ?? DEFAULT_SETTINGS.opening_hour),
    closing_hour:             Number(map.closing_hour      ?? DEFAULT_SETTINGS.closing_hour),
    price_per_hour:           Number(map.price_per_hour    ?? DEFAULT_SETTINGS.price_per_hour),
    booking_window_days:      Number(map.booking_window_days ?? DEFAULT_SETTINGS.booking_window_days),
    cancellation_window_hours:Number(map.cancellation_window_hours ?? DEFAULT_SETTINGS.cancellation_window_hours),
    announcement:             map.announcement             ?? '',
    fonnte_enabled:           map.fonnte_enabled === 'true',
    closed_dates:             parseClosedDates(map.closed_dates),
    banners:                  DEFAULT_SETTINGS.banners,
  };

  return { settings, events: (eventsData || []) as BadmintonEvent[] };
}

export async function generateMetadata() {
  const { settings } = await getData();
  return {
    title: `Event & Turnamen | ${settings.court_name}`,
    description: `Daftar pertandingan dan perlombaan badminton di ${settings.court_name}. Cek jadwal event dan daftar sekarang.`,
  };
}

export default async function EventsPage() {
  const { settings, events } = await getData();
  return <EventsPublicPage settings={settings} initialEvents={events} />;
}
