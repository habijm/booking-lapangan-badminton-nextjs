// src/app/api/payment/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { getTransactionStatus } from '@/lib/midtrans';
import { mapMidtransStatus } from '@/types/payment';
import { sendPostPaymentNotifications } from '@/lib/post-payment-notify';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// GET /api/payment/status?booking_id=xxx
// Dipanggil dari halaman status untuk polling
export async function GET(req: NextRequest) {
  const supabase   = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const bookingId  = searchParams.get('booking_id');

  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id, status, payment_status, payment_id, payment_method,
      transaction_id, snap_token, snap_url, amount, paid_at,
      customer_name, customer_phone, customer_email,
      wa_notified_at, email_notified_at,
      booking_date, start_time, end_time, duration_hours, court_id,
      court:courts(id, name, price_per_hour)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Kalau masih pending, coba sinkronisasi dari Midtrans
  if (booking.payment_status === 'pending' && booking.payment_id) {
    try {
      const tx = await getTransactionStatus(booking.payment_id as string);
      if (tx) {
        const newStatus = mapMidtransStatus(
          tx.transaction_status as Parameters<typeof mapMidtransStatus>[0],
          tx.fraud_status,
        );

        if (newStatus !== booking.payment_status) {
          const updates: Record<string, unknown> = {
            payment_status: newStatus,
            payment_method: tx.payment_type,
            transaction_id: tx.transaction_id,
          };
          if (newStatus === 'paid') {
            updates.status  = 'confirmed';
            updates.paid_at = new Date().toISOString();
          } else if (['failed', 'expired'].includes(newStatus)) {
            updates.status = 'cancelled';
          }
          await supabase.from('bookings').update(updates).eq('id', bookingId);
          Object.assign(booking, updates);
        }
      }
    } catch { /* skip sync error */ }
  }

  // ── Kirim notifikasi WA + Email kalau sudah paid ────────────────────────
  // PENTING (fix "loading lama setelah bayar"): sebelumnya notifikasi
  // di-`await` di sini, artinya browser customer menunggu WA + email
  // benar-benar selesai terkirim (bisa 2-6 detik) sebelum halaman status
  // sempat menampilkan "Pembayaran Berhasil". Dengan `waitUntil`, response
  // langsung dikirim begitu status booking diketahui, sementara notifikasi
  // tetap terkirim penuh di background — TIDAK dipotong seperti
  // fire-and-forget biasa, karena Vercel menjamin promise ini selesai
  // sebelum function instance dimatikan.
  if (booking.payment_status === 'paid') {
    waitUntil(
      sendPostPaymentNotifications(bookingId)
        .then((result) => {
          if (result.attempted) {
            console.log('[payment/status] Hasil notifikasi (background):', { bookingId, ...result });
          }
        })
        .catch((notifErr) => {
          console.error('[payment/status] Notification error (background):', notifErr);
        })
    );
  }

  return NextResponse.json({ booking });
}