import { createClient } from '@supabase/supabase-js';
import Script from 'next/script';
import { DEFAULT_SETTINGS, CourtSettings, DEFAULT_BANNERS, BannerType } from '@/lib/config';
import { generatePublicMetadata, generateStructuredData } from '@/lib/seo';
import PublicPage from './PublicPage';

export const dynamic = 'force-dynamic';

async function getSettings(): Promise<CourtSettings> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
             ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error || !data?.length) return DEFAULT_SETTINGS;
    const map = Object.fromEntries(data.map(r => [r.key, r.value]));
    return {
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
      banners: {
        promo_enabled:   map.banner_promo_enabled   === 'true',
        promo_type:     (map.banner_promo_type      ?? 'promo') as BannerType,
        promo_title:     map.banner_promo_title      ?? DEFAULT_BANNERS.promo_title,
        promo_body:      map.banner_promo_body       ?? DEFAULT_BANNERS.promo_body,
        promo_cta_text:  map.banner_promo_cta_text   ?? DEFAULT_BANNERS.promo_cta_text,
        promo_cta_url:   map.banner_promo_cta_url    ?? DEFAULT_BANNERS.promo_cta_url,
        sponsor_enabled: map.banner_sponsor_enabled  === 'true',
        sponsor_image:   map.banner_sponsor_image    ?? DEFAULT_BANNERS.sponsor_image,
        sponsor_title:   map.banner_sponsor_title    ?? DEFAULT_BANNERS.sponsor_title,
        sponsor_url:     map.banner_sponsor_url      ?? DEFAULT_BANNERS.sponsor_url,
        info_enabled:    map.banner_info_enabled     === 'true',
        info_text:       map.banner_info_text        ?? DEFAULT_BANNERS.info_text,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function generateMetadata() {
  const settings = await getSettings();
  return generatePublicMetadata(settings);
}

export default async function HomePage() {
  const settings       = await getSettings();
  const structuredData = generateStructuredData(settings);
  return (
    <>
      <Script id="structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/>
      <PublicPage settings={settings} />
    </>
  );
}
