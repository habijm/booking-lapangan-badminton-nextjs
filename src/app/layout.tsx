import type { Metadata } from 'next';
import './globals.css';

const courtName = process.env.NEXT_PUBLIC_COURT_NAME || 'GOR Badminton';

export const metadata: Metadata = {
  title: {
    default: courtName,
    template: `%s | ${courtName}`,
  },
  description: 'Sistem booking lapangan badminton online. Lihat ketersediaan jadwal dan hubungi kami via WhatsApp.',
  keywords: ['badminton', 'lapangan badminton', 'booking lapangan', 'GOR badminton'],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#2D6A4F',
  icons: {
  icon: '/favicon/favicon-light.png', // default fallback
  apple: '/favicon/favicon-light.png',
  other: [
    {
      rel: 'icon',
      url: '/favicon/favicon-light.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      url: '/favicon/favicon-dark.png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
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
