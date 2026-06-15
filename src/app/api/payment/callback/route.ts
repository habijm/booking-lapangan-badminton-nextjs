// src/app/api/payment/callback/route.ts
// Midtrans akan POST ke URL ini setiap ada perubahan status transaksi.
// Tambahkan URL ini di Midtrans Dashboard → Settings → Payment → Notification URL:
//   https://your-domain.com/api/payment/callback

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySignature, getTransactionStatus } from '@/lib/midtrans';
import { MidtransNotification, mapMidtransStatus } from '@/types/payment';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin();

  try {
    const notification: MidtransNotification = await req.json();
    console.log('[Midtrans callback]', notification.order_id, notification.transaction_status);

    // ── Verifikasi signature ────────────────────────────────────────────────
    const isValid = await verifySignature(notification);
    if (!isValid) {
      console.warn('[Midtrans callback] Invalid signature for order:', notification.order_id);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ── Double-check status langsung dari Midtrans API ──────────────────────
    const verified = await getTransactionStatus(notification.order_id);
    const payload  = verified ?? notification;

    const orderId         = payload.order_id;
    const txStatus        = payload.transaction_status as MidtransNotification['transaction_status'];
    const fraudStatus     = payload.fraud_status;
    const paymentType     = payload.payment_type;
    const transactionId   = payload.transaction_id;

    const paymentStatus = mapMidtransStatus(txStatus, fraudStatus);

    // ── Cari booking berdasarkan payment_id (order_id) ──────────────────────
    const { data: booking, error: findErr } = await supabase
      .from('bookings')
      .select('id, status, payment_status, customer_phone, customer_name')
      .eq('payment_id', orderId)
      .single();

    if (findErr || !booking) {
      console.error('[Midtrans callback] Booking not found for order:', orderId);
      // Tetap return 200 agar Midtrans tidak retry terus
      return NextResponse.json({ message: 'Booking not found, ignored' }, { status: 200 });
    }

    // ── Jangan update kalau sudah paid ─────────────────────────────────────
    if (booking.payment_status === 'paid' && paymentStatus !== 'refunded') {
      return NextResponse.json({ message: 'Already paid, no update needed' }, { status: 200 });
    }

    // ── Update status booking ───────────────────────────────────────────────
    const updates: Record<string, unknown> = {
      payment_status: paymentStatus,
      payment_method: paymentType,
      transaction_id: transactionId,
    };

    if (paymentStatus === 'paid') {
      updates.status   = 'confirmed';   // otomatis konfirmasi setelah bayar
      updates.paid_at  = new Date().toISOString();
    } else if (['failed', 'expired'].includes(paymentStatus)) {
      updates.status   = 'cancelled';   // batalkan booking kalau gagal/expired
    }

    await supabase.from('bookings').update(updates).eq('id', booking.id);

    // ── Simpan log pembayaran ───────────────────────────────────────────────
    await supabase.from('payment_logs').insert({
      booking_id:         booking.id,
      order_id:           orderId,
      transaction_id:     transactionId,
      transaction_status: txStatus,
      payment_type:       paymentType,
      gross_amount:       payload.gross_amount,
      fraud_status:       fraudStatus ?? null,
      raw_payload:        payload as unknown as Record<string, unknown>,
    });

    // ── Kirim notifikasi WA kalau sudah paid (opsional) ─────────────────────
    if (paymentStatus === 'paid') {
      try {
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        const map = Object.fromEntries((settingsData ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

        if (map.fonnte_enabled === 'true') {
          fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/notify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: booking.id, type: 'confirmed' }),
          }).catch(console.error);
        }
      } catch (notifErr) {
        console.error('[Midtrans callback] Notification error:', notifErr);
        // Jangan fail karena notifikasi
      }
    }

    console.log(`[Midtrans callback] Updated booking ${booking.id}: payment=${paymentStatus}, booking=${updates.status ?? 'unchanged'}`);
    return NextResponse.json({ message: 'OK' }, { status: 200 });

  } catch (err) {
    console.error('[Midtrans callback] Error:', err);
    // Return 200 agar Midtrans tidak spam retry
    return NextResponse.json({ error: 'Internal error' }, { status: 200 });
  }
}

// GET: untuk test endpoint
export async function GET() {
  return NextResponse.json({ status: 'Midtrans callback endpoint active' });
}
