import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, CourtSettings } from '@/lib/config';
import PublicPage from './PublicPage';

// Fetch settings — works with both anon key and service role key
async function getSettings(): Promise<CourtSettings> {
  try {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Prefer service role (bypasses RLS) but fall back to anon key
    const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
              ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) {
      console.error('[settings fetch]', error.message);
      return DEFAULT_SETTINGS;
    }
    if (!data?.length) return DEFAULT_SETTINGS;

    const map = Object.fromEntries(data.map(r => [r.key, r.value]));

    return {
      court_name:                map.court_name                ?? DEFAULT_SETTINGS.court_name,
      court_address:             map.court_address             ?? DEFAULT_SETTINGS.court_address,
      whatsapp_number:           map.whatsapp_number           ?? DEFAULT_SETTINGS.whatsapp_number,
      opening_hour:              Number(map.opening_hour       ?? DEFAULT_SETTINGS.opening_hour),
      closing_hour:              Number(map.closing_hour       ?? DEFAULT_SETTINGS.closing_hour),
      price_per_hour:            Number(map.price_per_hour     ?? DEFAULT_SETTINGS.price_per_hour),
      booking_window_days:       Number(map.booking_window_days ?? DEFAULT_SETTINGS.booking_window_days),
      cancellation_window_hours: Number(map.cancellation_window_hours ?? DEFAULT_SETTINGS.cancellation_window_hours),
      announcement:              map.announcement              ?? '',
      fonnte_enabled:            map.fonnte_enabled === 'true',
    };
  } catch (e) {
    console.error('[settings fetch] unexpected error:', e);
    return DEFAULT_SETTINGS;
  }
}

export async function generateMetadata() {
  const settings = await getSettings();
  return {
    title: settings.court_name,
    description: `Booking lapangan badminton ${settings.court_name}. Buka ${settings.opening_hour}:00–${settings.closing_hour}:00 WIB.`,
  };
}

// Force dynamic so settings are always fresh (not cached at build time)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await getSettings();
  return <PublicPage settings={settings} />;
}
