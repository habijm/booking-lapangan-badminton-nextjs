// src/app/api/debug-midtrans/route.ts
// HAPUS FILE INI SETELAH SELESAI DEBUG
import { NextResponse } from 'next/server';

export async function GET() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
  const env       = process.env.MIDTRANS_ENV ?? 'sandbox';

  // Mask key — tampilkan 12 karakter pertama dan 4 terakhir saja
  const mask = (k: string) =>
    k.length > 16 ? `${k.slice(0, 12)}...${k.slice(-4)}` : k ? '(terlalu pendek)' : '(kosong)';

  // Test encode Base64 seperti yang dipakai di authHeader()
  const encoded   = Buffer.from(serverKey + ':').toString('base64');
  const authHeader = `Basic ${encoded}`;

  // Coba hit Midtrans API langsung
  const snapUrl = env === 'production'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  let midtransResponse: unknown = null;
  try {
    const res = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': authHeader,
        'Accept':        'application/json',
      },
      body: JSON.stringify({
        transaction_details: { order_id: 'DEBUG-TEST-001', gross_amount: 10000 },
        customer_details: { first_name: 'Test' },
      }),
    });
    midtransResponse = await res.json();
  } catch (e) {
    midtransResponse = { fetch_error: String(e) };
  }

  return NextResponse.json({
    env,
    serverKey: {
      masked:   mask(serverKey),
      length:   serverKey.length,
      startsOk: serverKey.startsWith('SB-Mid-server-') || serverKey.startsWith('Mid-server-'),
      hasSpaces:serverKey !== serverKey.trim(),
      hasQuotes:serverKey.includes('"') || serverKey.includes("'"),
    },
    clientKey: {
      masked:   mask(clientKey),
      length:   clientKey.length,
      startsOk: clientKey.startsWith('SB-Mid-client-') || clientKey.startsWith('Mid-client-'),
    },
    snapUrl,
    midtransResponse,
  });
}
