import type { Metadata, Viewport } from 'next';
import './globals.css';

const COURT_NAME = process.env.NEXT_PUBLIC_COURT_NAME ?? 'GOR Badminton';
const BASE_URL   = process.env.NEXT_PUBLIC_SITE_URL   ?? 'https://www.bookinglapangan.site';

export const viewport: Viewport = {
  width:              'device-width',
  initialScale:       1,
  maximumScale:       5,
  themeColor:         '#0D1F16',
  colorScheme:        'dark light',
};

export const metadata: Metadata = {
  // Title template — halaman publik override dengan generateMetadata()
  title: {
    default:  COURT_NAME,
    template: `%s | ${COURT_NAME}`,
  },
  description: `Booking lapangan badminton di ${COURT_NAME} secara online. Cek jadwal real-time dan booking via WhatsApp.`,
  metadataBase: new URL(BASE_URL),

  // ── Icons ──────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon.ico',            sizes: 'any' },
      { url: '/icon-192.png',           sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',           sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png',         sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },

  // ── Manifest (PWA) ─────────────────────────────────────────────────────────
  manifest: '/manifest.json',

  // ── Open Graph fallback (halaman publik override) ──────────────────────────
  openGraph: {
    type:     'website',
    url:      BASE_URL,
    siteName: COURT_NAME,
    locale:   'id_ID',
    title:    COURT_NAME,
    description: `Booking lapangan badminton di ${COURT_NAME} secara online. Cek jadwal real-time dan booking via WhatsApp.`,
    images: [
      {
        url:    '/og-image.png',
        width:  1200,
        height: 630,
        alt:    `${COURT_NAME} — Booking Lapangan Badminton`,
      },
    ],
  },

  twitter: {
    card:        'summary_large_image',
    title:       COURT_NAME,
    description: `Booking lapangan badminton di ${COURT_NAME} secara online. Cek jadwal real-time dan booking via WhatsApp.`,
    images:      ['/og-image.png'],
  },

  // ── Robots default ─────────────────────────────────────────────────────────
  robots: {
    index:  true,
    follow: true,
  },

  // ── Verification (isi setelah submit ke Google Search Console) ─────────────
  verification: {
    google: 'ixbHRTmXi2PWZjQ_eO7CLlSs8hFPxzTr-ZlY_PLAoJU',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
