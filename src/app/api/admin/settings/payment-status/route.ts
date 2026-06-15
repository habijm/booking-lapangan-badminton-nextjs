// src/app/api/admin/settings/payment-status/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  const env       = process.env.MIDTRANS_ENV ?? 'sandbox';
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return NextResponse.json({
    env,
    clientKey:  clientKey.startsWith('SB-Mid-client-') || clientKey.startsWith('Mid-client-'),
    serverKey:  serverKey.startsWith('SB-Mid-server-') || serverKey.startsWith('Mid-server-'),
    webhookSet: siteUrl.startsWith('https://'),
    webhookUrl: siteUrl ? `${siteUrl}/api/payment/callback` : '—',
  });
}
