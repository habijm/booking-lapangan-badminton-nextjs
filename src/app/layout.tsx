import type { Metadata } from 'next';
import './globals.css';

// Layout metadata uses env var as default.
// Actual court name shown in UI comes from DB settings (via useSettings / page.tsx server fetch).
export const metadata: Metadata = {
  title: {
    default:  process.env.NEXT_PUBLIC_COURT_NAME ?? 'GOR Badminton',
    template: `%s | ${process.env.NEXT_PUBLIC_COURT_NAME ?? 'GOR Badminton'}`,
  },
  description: 'Sistem booking lapangan badminton online. Lihat ketersediaan jadwal dan hubungi kami via WhatsApp.',
  keywords:    ['badminton', 'lapangan badminton', 'booking lapangan', 'GOR badminton'],
  themeColor:  '#2D6A4F',
  
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" href="/favicon/favicon-dark.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon/favicon-light.png" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
