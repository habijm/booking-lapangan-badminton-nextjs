// src/app/api/payment/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTransactionStatus } from '@/lib/midtrans';
import { sendPaidBookingNotifications } from '@/lib/payment-notifications';
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
      customer_name, customer_phone, customer_email, invoice_sent_at,
      booking_date, start_time, end_time, duration_hours, court_id,
      court:courts(id, name, price_per_hour)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const bookingRecord = booking;
  const resolvedBookingId = bookingId as string;

  async function trySendIfNeeded() {
    console.log('[payment/status] notification gate', {
      bookingId: resolvedBookingId,
      paymentStatus: bookingRecord.payment_status,
      invoiceSentAt: bookingRecord.invoice_sent_at ?? null,
    });

    if (bookingRecord.payment_status !== 'paid' || bookingRecord.invoice_sent_at) {
      console.log('[payment/status] notification skipped');
      return;
    }

    try {
      console.log('[payment/status] invoking payment notification helper', { bookingId: resolvedBookingId });
      const notificationOk = await sendPaidBookingNotifications(bookingRecord);

      if (notificationOk) {
        const sentAt = new Date().toISOString();
        await supabase.from('bookings').update({ invoice_sent_at: sentAt }).eq('id', resolvedBookingId);
        bookingRecord.invoice_sent_at = sentAt;
        console.log('[payment/status] invoice_sent_at set after successful notifications', { bookingId: resolvedBookingId });
      } else {
        console.log('[payment/status] Notifikasi belum lengkap, invoice_sent_at tidak diisi agar bisa dicoba ulang.');
      }
    } catch (notifErr) {
      console.error('[payment/status] Notification error:', notifErr);
    }
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

          // ── Kirim notifikasi WA + Email begitu status berubah jadi paid ──
          // Jalur ini penting untuk local dev, karena webhook Midtrans tidak
          // bisa reach localhost — polling inilah yang jadi satu-satunya
          // trigger notifikasi saat development.
          if (newStatus === 'paid') {
            try {
              await sendPostPaymentNotifications(bookingId);
            } catch (notifErr) {
              console.error('[payment/status] Notification error:', notifErr);
            }
          }
        }
      }
    } catch { /* skip sync error */ }
  }

  await trySendIfNeeded();

  return NextResponse.json({ booking });
}