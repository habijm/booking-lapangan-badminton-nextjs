/**
 * COURT_CONFIG — Default values. Live values come from DB via useSettings().
 */
export const COURT_CONFIG = {
  name:                    process.env.NEXT_PUBLIC_COURT_NAME     ?? 'GOR Badminton',
  address:                 process.env.NEXT_PUBLIC_COURT_ADDRESS   ?? '',
  whatsapp:                process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '6281234567890',
  openingHour:             8,
  closingHour:             22,
  pricePerHour:            30_000,
  allowedDurations:        [1, 2, 3] as const,
  bookingWindowDays:       14,
  cancellationWindowHours: 2,
} as const;

export type BannerType = 'promo' | 'info' | 'warning' | 'sponsor';

export interface BannerConfig {
  promo_enabled:   boolean;
  promo_type:      BannerType;
  promo_title:     string;
  promo_body:      string;
  promo_cta_text:  string;
  promo_cta_url:   string;
  sponsor_enabled: boolean;
  sponsor_image:   string;
  sponsor_title:   string;
  sponsor_url:     string;
  info_enabled:    boolean;
  info_text:       string;
}

export const DEFAULT_BANNERS: BannerConfig = {
  promo_enabled:   false,
  promo_type:      'promo',
  promo_title:     '',
  promo_body:      '',
  promo_cta_text:  '',
  promo_cta_url:   '',
  sponsor_enabled: false,
  sponsor_image:   '',
  sponsor_title:   '',
  sponsor_url:     '',
  info_enabled:    false,
  info_text:       '',
};

export type CourtSettings = {
  court_name:               string;
  court_address:            string;
  whatsapp_number:          string;
  opening_hour:             number;
  closing_hour:             number;
  price_per_hour:           number;
  booking_window_days:      number;
  cancellation_window_hours: number;
  announcement:             string;
  fonnte_enabled:           boolean;
  /** Dates (YYYY-MM-DD) when the court is closed — slots disabled on public schedule */
  closed_dates:             string[];
  banners:                  BannerConfig;
};

export const DEFAULT_SETTINGS: CourtSettings = {
  court_name:               COURT_CONFIG.name,
  court_address:            COURT_CONFIG.address,
  whatsapp_number:          COURT_CONFIG.whatsapp,
  opening_hour:             COURT_CONFIG.openingHour,
  closing_hour:             COURT_CONFIG.closingHour,
  price_per_hour:           COURT_CONFIG.pricePerHour,
  booking_window_days:      COURT_CONFIG.bookingWindowDays,
  cancellation_window_hours: COURT_CONFIG.cancellationWindowHours,
  announcement:             '',
  fonnte_enabled:           false,
  closed_dates:             [],
  banners:                  DEFAULT_BANNERS,
};

export const SETTINGS_LABELS: Record<keyof Omit<CourtSettings, 'banners' | 'closed_dates'>, string> = {
  court_name:               'Nama GOR / Lapangan',
  court_address:            'Alamat',
  whatsapp_number:          'Nomor WhatsApp Admin',
  opening_hour:             'Jam Buka (0–23)',
  closing_hour:             'Jam Tutup (0–23)',
  price_per_hour:           'Harga per Jam (Rp)',
  booking_window_days:      'Maks Booking ke Depan (hari)',
  cancellation_window_hours:'Batas Pembatalan (jam sebelum)',
  announcement:             'Pengumuman (tampil di navbar)',
  fonnte_enabled:           'Aktifkan Notifikasi WA (Fonnte)',
};

/** Safe JSON parse for closed_dates stored as string in DB */
export function parseClosedDates(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}
