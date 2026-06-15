// ═══════════════════════════════════════════════════════════════════════════
// src/app/api/admin/settings/booking-mode/route.ts
// GET  → ambil mode saat ini
// PUT  → ubah mode
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BookingMode } from '@/types/payment';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from('settings').select('value').eq('key', 'booking_mode').single();
  return NextResponse.json({ mode: (data?.value ?? 'whatsapp') as BookingMode });
}

export async function PUT(req: NextRequest) {
  // Verifikasi admin session (sesuaikan dengan auth system Anda)
  // Contoh: pakai Supabase session dari cookie
  const supabase = supabaseAdmin();

  try {
    const { mode } = await req.json();
    if (!['whatsapp', 'direct'].includes(mode)) {
      return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 });
    }

    await supabase.from('settings')
      .upsert({ key: 'booking_mode', value: mode }, { onConflict: 'key' });

    return NextResponse.json({ mode, updated: true });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// src/app/api/admin/settings/payment-status/route.ts
// GET → cek apakah Midtrans sudah terkonfigurasi dengan benar
// ═══════════════════════════════════════════════════════════════════════════
// export async function GET() {
//   const clientKey  = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
//   const serverKey  = process.env.MIDTRANS_SERVER_KEY ?? '';
//   const env        = process.env.MIDTRANS_ENV ?? 'sandbox';
//   const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
//     ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/payment/callback`
//     : '';
//
//   return NextResponse.json({
//     env,
//     clientKey:  clientKey.startsWith('SB-Mid-client-') || clientKey.startsWith('Mid-client-'),
//     serverKey:  serverKey.startsWith('SB-Mid-server-') || serverKey.startsWith('Mid-server-'),
//     webhookSet: webhookUrl.startsWith('https://'),
//   });
// }
// → Simpan di file terpisah: src/app/api/admin/settings/payment-status/route.ts
