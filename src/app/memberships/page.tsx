import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SETTINGS, CourtSettings } from '@/lib/config';
import { MembershipPlan } from '@/types/booking';
import MembershipsPublicPage from './MembershipsPublicPage';

export const dynamic = 'force-dynamic';

async function getData(): Promise<{ settings: CourtSettings; plans: MembershipPlan[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [{ data: settingsData }, { data: plansData }] = await Promise.all([
    supabase.from('settings').select('key, value'),
    supabase.from('membership_plans').select('*').eq('is_active', true).order('sessions_per_week'),
  ]);

  const map = Object.fromEntries((settingsData || []).map(r => [r.key, r.value]));
  const settings: CourtSettings = {
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
    banners:                  DEFAULT_SETTINGS.banners,
  };
  return { settings, plans: (plansData || []) as MembershipPlan[] };
}

export async function generateMetadata() {
  const { settings } = await getData();
  return {
    title: `Paket Langganan | ${settings.court_name}`,
    description: `Paket langganan bulanan lapangan badminton ${settings.court_name}. Hemat lebih banyak dengan berlangganan.`,
  };
}

export default async function MembershipsPage() {
  const { settings, plans } = await getData();
  return <MembershipsPublicPage settings={settings} plans={plans} />;
}
