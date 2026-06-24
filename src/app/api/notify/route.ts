import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { notifyConfirmed, notifyCancelled } from '@/lib/whatsapp';
import { Booking } from '@/types/booking';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  let body: { bookingId: string; type: 'confirmed' | 'cancelled'; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Body request tidak valid' }, { status: 400 });
  }

  if (!body?.bookingId) {
    return NextResponse.json({ success: false, error: 'bookingId wajib diisi' }, { status: 400 });
  }

  const { data: booking, error } = await supabase.from('bookings').select('*').eq('id', body.bookingId).single();
  if (error || !booking) {
    return NextResponse.json({ success: false, error: 'Booking tidak ditemukan' }, { status: 404 });
  }

  const { data: settings } = await supabase.from('settings').select('key,value');
  const map = Object.fromEntries((settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value]));

  // Toggle "Aktifkan via Fonnte" di /admin/settings belum ON
  if (map.fonnte_enabled !== 'true') {
    return NextResponse.json({
      success: false,
      skipped: true,
      error: 'Notifikasi WhatsApp belum diaktifkan. Aktifkan toggle "Aktifkan via Fonnte" di /admin/settings → tab Umum.',
    });
  }

  const result = body.type === 'confirmed'
    ? await notifyConfirmed(booking as Booking, map.court_name ?? 'GOR Badminton', map.wa_template_confirmed)
    : await notifyCancelled(booking as Booking, map.court_name ?? 'GOR Badminton', body.reason, map.wa_template_cancelled);

  if (!result.ok) {
    console.error('[api/notify] Gagal kirim WA:', result.error);
    return NextResponse.json({ success: false, error: result.error ?? 'Gagal mengirim WhatsApp' }, { status: 200 });
  }

  return NextResponse.json({ success: true });
}
