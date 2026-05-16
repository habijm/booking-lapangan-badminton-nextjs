import type { Metadata, Viewport } from 'next';
import './globals.css';

const courtName = process.env.NEXT_PUBLIC_COURT_NAME || 'GOR Badminton';

export const metadata: Metadata = {
  title: {
    default: courtName,
    template: `%s | ${courtName}`,
  },
  description:
    'Sistem booking lapangan badminton online. Lihat ketersediaan jadwal dan hubungi kami via WhatsApp.',
  keywords: ['badminton', 'lapangan badminton', 'booking lapangan', 'GOR badminton'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2D6A4F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}