import { Metadata } from 'next';
import { CourtSettings } from './config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/**
 * Generate complete metadata for the public homepage.
 * Called from page.tsx generateMetadata() which already has settings from DB.
 */
export function generatePublicMetadata(settings: CourtSettings): Metadata {
  const title       = `${settings.court_name} — Booking Lapangan Badminton Online`;
  const description = [
    `Booking lapangan badminton di ${settings.court_name} secara online.`,
    `Cek jadwal real-time, booking via WhatsApp dalam hitungan detik.`,
    `Buka setiap hari ${settings.opening_hour}:00–${settings.closing_hour}:00 WIB.`,
    `Harga mulai Rp ${settings.price_per_hour.toLocaleString('id')}/jam.`,
    settings.court_address ? `Lokasi: ${settings.court_address}.` : '',
  ].filter(Boolean).join(' ');

  const keywords = [
    'booking lapangan badminton',
    'sewa lapangan badminton',
    'jadwal lapangan badminton',
    settings.court_name,
    settings.court_address,
    'badminton online booking',
    'GOR badminton',
    'lapangan bulu tangkis',
  ].filter(Boolean);

  return {
    // ── Basic ────────────────────────────────────────────────────────────────
    title,
    description,
    keywords,
    authors: [{ name: settings.court_name }],
    creator: settings.court_name,
    publisher: settings.court_name,

    // ── Canonical ────────────────────────────────────────────────────────────
    alternates: {
      canonical: BASE_URL,
    },

    // ── Open Graph (Facebook, WhatsApp preview, Telegram) ────────────────────
    openGraph: {
      type:        'website',
      url:         BASE_URL,
      title,
      description,
      siteName:    settings.court_name,
      locale:      'id_ID',
      images: [
        {
          url:    `${BASE_URL}/og-image.png`,  // buat file ini (lihat panduan)
          width:  1200,
          height: 630,
          alt:    `${settings.court_name} — Booking Lapangan Badminton`,
        },
      ],
    },

    // ── Twitter / X Card ─────────────────────────────────────────────────────
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [`${BASE_URL}/og-image.png`],
    },

    // ── Robots ───────────────────────────────────────────────────────────────
    robots: {
      index:            true,
      follow:           true,
      googleBot: {
        index:          true,
        follow:         true,
        'max-video-preview':   -1,
        'max-image-preview':   'large',
        'max-snippet':         -1,
      },
    },

    // ── PWA / Mobile ─────────────────────────────────────────────────────────
    applicationName: settings.court_name,
    manifest:        '/manifest.json',
    themeColor:      '#0D1F16',
    appleWebApp: {
      capable:       true,
      title:         settings.court_name,
      statusBarStyle:'black-translucent',
    },

    // ── Verification (isi saat submit ke Google/Bing) ────────────────────────
    // verification: {
    //   google: 'GOOGLE_SITE_VERIFICATION_CODE',
    //   yandex: 'YANDEX_CODE',
    // },
  };
}

/**
 * JSON-LD Structured Data untuk Google Rich Results.
 * Ditaruh sebagai <script type="application/ld+json"> di <head>.
 */
export function generateStructuredData(settings: CourtSettings) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      // ── SportsActivityLocation ──────────────────────────────────────────
      {
        '@type':       'SportsActivityLocation',
        '@id':         `${BASE_URL}/#venue`,
        name:          settings.court_name,
        description:   `Lapangan badminton dengan sistem booking online. Cek jadwal dan booking via WhatsApp.`,
        url:           BASE_URL,
        telephone:     `+${settings.whatsapp_number}`,
        ...(settings.court_address ? {
          address: {
            '@type':          'PostalAddress',
            streetAddress:    settings.court_address,
            addressCountry:   'ID',
          },
        } : {}),
        openingHoursSpecification: [
          {
            '@type':    'OpeningHoursSpecification',
            dayOfWeek:  ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
            opens:      `${settings.opening_hour.toString().padStart(2,'0')}:00`,
            closes:     `${settings.closing_hour.toString().padStart(2,'0')}:00`,
          },
        ],
        priceRange:  `Rp ${settings.price_per_hour.toLocaleString('id')}/jam`,
        sport:       'Badminton',
        amenityFeature: [
          { '@type': 'LocationFeatureSpecification', name: 'Booking Online', value: true },
          { '@type': 'LocationFeatureSpecification', name: 'WhatsApp Booking', value: true },
        ],
      },

      // ── WebSite ─────────────────────────────────────────────────────────
      {
        '@type': 'WebSite',
        '@id':   `${BASE_URL}/#website`,
        url:     BASE_URL,
        name:    settings.court_name,
        description: `Sistem booking lapangan badminton online ${settings.court_name}`,
        inLanguage:  'id-ID',
        potentialAction: {
          '@type':       'SearchAction',
          target:        `${BASE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },

      // ── LocalBusiness ───────────────────────────────────────────────────
      {
        '@type':    ['LocalBusiness', 'SportsActivityLocation'],
        '@id':      `${BASE_URL}/#business`,
        name:       settings.court_name,
        url:        BASE_URL,
        telephone:  `+${settings.whatsapp_number}`,
        priceRange: `Rp ${settings.price_per_hour.toLocaleString('id')}`,
        ...(settings.court_address ? {
          address: {
            '@type':        'PostalAddress',
            streetAddress:  settings.court_address,
            addressCountry: 'ID',
          },
        } : {}),
        sameAs: [
          `https://wa.me/${settings.whatsapp_number}`,
        ],
        openingHoursSpecification: {
          '@type':   'OpeningHoursSpecification',
          dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
          opens:     `${settings.opening_hour.toString().padStart(2,'0')}:00`,
          closes:    `${settings.closing_hour.toString().padStart(2,'0')}:00`,
        },
      },
    ],
  };
}
