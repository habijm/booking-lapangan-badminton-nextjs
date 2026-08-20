// src/lib/post-payment-notify.ts
// Helper terpusat untuk mengirim notifikasi (WhatsApp + Email) setelah
// booking transisi ke payment_status = 'paid'. Dipanggil dari DUA tempat:
//   1. Midtrans webhook (api/payment/callback/route.ts) — produksi
//   2. Client polling (api/payment/status/route.ts) — fallback saat webhook
//      tidak bisa reach server (mis. localhost saat development)
//
// PENTING (fix bug "notifikasi hilang permanen"):
// Versi lama menandai `invoice_sent_at` SEBELUM benar-benar mengirim, dan
// error pengiriman hanya di-log tanpa pernah membuat sistem mencoba lagi.
// Akibatnya kalau percobaan pertama gagal (token Fonnte salah, domain
// Resend belum diverifikasi, dll), customer TIDAK PERNAH dapat notifikasi
// dan tidak ada cara untuk retry — sementara data booking & dashboard admin
// tetap terlihat normal karena itu proses terpisah.
//
// Versi baru ini:
//   - Melacak WA & email SECARA TERPISAH (wa_notified_at / email_notified_at)
//     supaya channel yang sukses tidak diulang, tapi channel yang gagal
//     tetap bisa dicoba lagi di panggilan berikutnya (webhook retry dari
//     Midtrans, polling berikutnya, atau cron reconciliation).
//   - Memakai `notification_lock_at` sebagai lock SEMENTARA (bukan penanda
//     permanen) untuk mencegah pengiriman dobel saat webhook & polling
//     jalan hampir bersamaan. Lock otomatis dilepas di blok `finally`,
//     dan dianggap basi (boleh diambil ulang) setelah 2 menit kalau proses
//     sebelumnya crash sebelum sempat melepas lock.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { notifyConfirmed } from '@/lib/whatsapp';
import { Booking } from '@/types/booking';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const LOCK_STALE_MS = 2 * 60 * 1000; // 2 menit

export interface NotifyResult {
  attempted: boolean;
  waOk: boolean | null;
  emailOk: boolean | null;
  skipped?: 'locked' | 'not_paid' | 'not_found' | 'already_done';
}

export async function sendPostPaymentNotifications(bookingId: string): Promise<NotifyResult> {
  const supabase = supabaseAdmin();

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*, court:courts(id,name)')
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    return { attempted: false, waOk: null, emailOk: null, skipped: 'not_found' };
  }
  if (booking.payment_status !== 'paid') {
    return { attempted: false, waOk: null, emailOk: null, skipped: 'not_paid' };
  }

  const { data: settingsData } = await supabase.from('settings').select('key, value');
  const map = Object.fromEntries(
    (settingsData ?? []).map((r: { key: string; value: string }) => [r.key, r.value])
  );

  const waNeeded    = map.fonnte_enabled === 'true';
  const emailNeeded = Boolean(booking.customer_email) && Boolean(process.env.RESEND_API_KEY);
  const waDone      = waNeeded ? Boolean(booking.wa_notified_at) : true;
  const emailDone   = emailNeeded ? Boolean(booking.email_notified_at) : true;

  if (waDone && emailDone) {
    // Sudah selesai semua, tidak ada yang perlu dikirim ulang.
    return { attempted: false, waOk: waNeeded ? true : null, emailOk: emailNeeded ? true : null, skipped: 'already_done' };
  }

  // ── Klaim lock atomik (bukan penanda permanen) ────────────────────────────
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const nowIso = new Date().toISOString();

  const { data: locked, error: lockErr } = await supabase
    .from('bookings')
    .update({ notification_lock_at: nowIso })
    .eq('id', bookingId)
    .eq('payment_status', 'paid')
    .or(`notification_lock_at.is.null,notification_lock_at.lt.${staleBefore}`)
    .select('*, court:courts(id,name)')
    .single();

  if (lockErr || !locked) {
    // Proses lain (webhook/polling) sedang mengirim — aman untuk skip.
    return { attempted: false, waOk: null, emailOk: null, skipped: 'locked' };
  }

  const b = locked as Booking & {
    court?: { id: string; name: string } | null;
    wa_notified_at?: string | null;
    email_notified_at?: string | null;
  };
  const courtName = b.court?.name ?? map.court_name ?? 'GOR Badminton';

  let waOk: boolean | null = null;
  let emailOk: boolean | null = null;
  const errors: string[] = [];

  try {
    // ── WhatsApp ─────────────────────────────────────────────────────────
    if (waNeeded && !b.wa_notified_at) {
      try {
        const result = await notifyConfirmed(b as Booking, courtName, map.wa_template_confirmed);
        waOk = result.ok;
        if (result.ok) {
          await supabase.from('bookings').update({ wa_notified_at: new Date().toISOString() }).eq('id', bookingId);
        } else {
          errors.push(`WA: ${result.error}`);
          console.error('[post-payment-notify] WA gagal:', result.error);
        }
      } catch (err) {
        waOk = false;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`WA: ${msg}`);
        console.error('[post-payment-notify] WA exception:', err);
      }
    } else if (b.wa_notified_at) {
      waOk = true;
    }

    // ── Email invoice ────────────────────────────────────────────────────
    if (emailNeeded && !b.email_notified_at) {
      try {
        await sendInvoiceEmail(b, courtName);
        emailOk = true;
        await supabase.from('bookings').update({ email_notified_at: new Date().toISOString() }).eq('id', bookingId);
      } catch (err) {
        emailOk = false;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Email: ${msg}`);
        console.error('[post-payment-notify] Email error:', err);
      }
    } else if (b.email_notified_at) {
      emailOk = true;
    }
  } finally {
    // ── Lepas lock supaya percobaan berikutnya bisa retry kalau masih ada
    // yang gagal. INI KUNCI dari fix: kegagalan tidak lagi permanen. ──────
    await supabase.from('bookings').update({
      notification_lock_at: null,
      last_notification_error: errors.length ? errors.join(' | ') : null,
    }).eq('id', bookingId);
  }

  return { attempted: true, waOk, emailOk };
}

async function sendInvoiceEmail(booking: Booking, courtName: string) {
  const resend    = new Resend(process.env.RESEND_API_KEY);
  const dateLabel = format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f9f4;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1a3d2b;padding:32px;text-align:center;">
      <div style="width:48px;height:48px;background:#40916C;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">🏸</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${courtName}</h1>
      <p style="color:#74C69D;margin:4px 0 0;font-size:13px;">Konfirmasi Booking & Invoice Pembayaran</p>
    </div>
    <div style="background:#d1fae5;border-bottom:2px solid #6ee7b7;padding:16px 32px;text-align:center;">
      <span style="color:#065f46;font-weight:700;font-size:15px;">✅ Pembayaran Berhasil — Booking Dikonfirmasi</span>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:14px;margin:0 0 24px;">
        Halo <strong>${booking.customer_name}</strong>,<br/>
        Terima kasih! Booking lapangan Anda telah dikonfirmasi.
      </p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Detail Booking</h2>
        ${[
          ['📅 Tanggal',   dateLabel],
          ['⏰ Jam',       `${booking.start_time.slice(0,5)} – ${booking.end_time.slice(0,5)} WIB`],
          ['⏱️ Durasi',   `${booking.duration_hours} jam`],
          ['🏟️ Lapangan', courtName],
          ['📱 WhatsApp',  booking.customer_phone],
        ].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:13px;">${label}</span>
            <span style="color:#111827;font-size:13px;font-weight:600;">${value}</span>
          </div>
        `).join('')}
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Pembayaran</h2>
        ${[
          ['Order ID',    booking.payment_id   ?? '—'],
          ['Metode',      booking.payment_method ?? '—'],
          ['Waktu Bayar', booking.paid_at ? format(new Date(booking.paid_at), 'd MMM yyyy, HH:mm') + ' WIB' : '—'],
        ].map(([label, value]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
            <span style="color:#6b7280;font-size:13px;">${label}</span>
            <span style="color:#111827;font-size:13px;font-family:monospace;">${value}</span>
          </div>
        `).join('')}
        <div style="border-top:2px solid #86efac;margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#065f46;font-size:14px;font-weight:700;">Total Pembayaran</span>
          <span style="color:#065f46;font-size:18px;font-weight:700;">Rp ${booking.amount?.toLocaleString('id') ?? '—'}</span>
        </div>
      </div>
      ${siteUrl ? `<div style="text-align:center;margin-bottom:24px;">
        <a href="${siteUrl}/booking/status?booking_id=${booking.id}"
          style="display:inline-block;background:#40916C;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
          Lihat Status Booking
        </a>
      </div>` : ''}
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        Harap simpan email ini sebagai bukti pembayaran.<br/>
        Tunjukkan kepada petugas saat tiba di lapangan.
      </p>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        ${courtName} · Sistem Booking Online<br/>
        Email ini dikirim otomatis, mohon tidak membalas.
      </p>
    </div>
  </div>
</body></html>`;

  const { error } = await resend.emails.send({
    from:    `${courtName} <noreply@${process.env.RESEND_DOMAIN ?? 'bookinglapangan.site'}>`,
    to:      [booking.customer_email!],
    subject: `✅ Konfirmasi Booking — ${dateLabel} ${booking.start_time.slice(0,5)} WIB`,
    html,
  });

  if (error) throw error;
}