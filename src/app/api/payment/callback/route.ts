// src/app/api/payment/callback/route.ts
// Midtrans akan POST ke URL ini setiap ada perubahan status transaksi.
// Tambahkan URL ini di Midtrans Dashboard → Settings → Payment → Notification URL:
//   https://your-domain.com/api/payment/callback

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { verifySignature, getTransactionStatus } from '@/lib/midtrans';
import { MidtransNotification, mapMidtransStatus } from '@/types/payment';
import { sendPostPaymentNotifications } from '@/lib/post-payment-notify';

function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');

  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'http';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
  }

  return '';
}

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
    console.log('[Midtrans callback] Notifikasi masuk:', notification.order_id, notification.transaction_status);

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
    console.log('[Midtrans callback] paymentStatus terpetakan:', paymentStatus);

    // ── Cari booking berdasarkan payment_id (order_id) ──────────────────────
    const { data: booking, error: findErr } = await supabase
      .from('bookings')
      .select('id, status, payment_status, customer_phone, customer_name, customer_email, invoice_sent_at, court_id, booking_date, start_time, end_time, duration_hours')
      .eq('payment_id', orderId)
      .single();

    if (findErr || !booking) {
      console.error('[Midtrans callback] Booking not found for order:', orderId);
      // Tetap return 200 agar Midtrans tidak retry terus
      return NextResponse.json({ message: 'Booking not found, ignored' }, { status: 200 });
    }

    // ── Kalau booking sudah paid, tetap lanjutkan blok notifikasi bila belum terkirim ──
    if (booking.payment_status === 'paid' && paymentStatus !== 'refunded') {
      console.log('[Midtrans callback] Booking sudah paid sebelumnya, status booking tidak diubah lagi.');
    } else {
      // ── Update status booking ───────────────────────────────────────────────
      const updates: Record<string, unknown> = {
        payment_status: paymentStatus,
        payment_method: paymentType,
        transaction_id: transactionId,
      };

      if (paymentStatus === 'paid') {
        updates.status  = 'confirmed';   // otomatis konfirmasi setelah bayar
        updates.paid_at = new Date().toISOString();
      } else if (['failed', 'expired'].includes(paymentStatus)) {
        updates.status = 'cancelled';   // batalkan booking kalau gagal/expired
      }

      await supabase.from('bookings').update(updates).eq('id', booking.id);
    }

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

    // ── Kirim notifikasi WA + Email kalau sudah paid ─────────────────────────
    // PENTING: pakai `waitUntil`, BUKAN `await` langsung dan BUKAN pula
    // fire-and-forget biasa. Midtrans mengharapkan response cepat dari
    // notification URL — kalau responsnya lambat/timeout, Midtrans bisa
    // menganggap gagal dan mengirim ulang notifikasi berkali-kali. Dengan
    // `waitUntil`, response "OK" langsung dikirim ke Midtrans, sementara
    // pengiriman WA + email tetap dijamin selesai di background (berbeda
    // dari fire-and-forget biasa yang rawan terpotong begitu response
    // terkirim di lingkungan serverless).
    if (paymentStatus === 'paid') {
      waitUntil(
        sendPostPaymentNotifications(booking.id)
          .then((result) => {
            console.log('[Midtrans callback] Hasil notifikasi (background):', result);
            if (result.attempted && (result.waOk === false || result.emailOk === false)) {
              console.error(
                `[Midtrans callback] Notifikasi SEBAGIAN GAGAL untuk booking ${booking.id} — akan dicoba ulang otomatis oleh polling/cron.`
              );
            }
          })
          .catch((notifErr) => {
            console.error('[Midtrans callback] Notification error (background):', notifErr);
          })
      );
    }

    console.log(`[Midtrans callback] Updated booking ${booking.id}: payment=${paymentStatus}`);
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