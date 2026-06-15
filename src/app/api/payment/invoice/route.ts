// src/app/api/payment/invoice/route.ts
// Kirim invoice/struk via email menggunakan Resend (https://resend.com)
// Install dulu: npm install resend
// Daftar gratis di resend.com → dapat 3000 email/bulan gratis

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// GET /api/payment/invoice?booking_id=xxx  → kirim email invoice
// POST /api/payment/invoice { booking_id } → sama, bisa dari admin
export async function GET(req: NextRequest) {
  return sendInvoice(req.nextUrl.searchParams.get('booking_id'));
}

export async function POST(req: NextRequest) {
  const { booking_id } = await req.json();
  return sendInvoice(booking_id);
}

async function sendInvoice(bookingId: string | null) {
  if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email tidak dikonfigurasi' }, { status: 503 });

  const supabase = supabaseAdmin();

  // Ambil data booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, court:courts(id,name)')
    .eq('id', bookingId)
    .single();

  if (error || !booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
  if (!booking.customer_email) return NextResponse.json({ error: 'Email pelanggan tidak tersedia' }, { status: 400 });
  if (booking.payment_status !== 'paid') return NextResponse.json({ error: 'Booking belum lunas' }, { status: 400 });

  const dateLabel  = format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const courtName  = booking.court?.name ?? 'Lapangan';
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const courtName2 = process.env.COURT_NAME ?? 'GOR Badminton';

  // Buat HTML email
  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice Booking #${booking.payment_id}</title>
</head>
<body style="margin:0;padding:0;background:#f0f9f4;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1a3d2b;padding:32px;text-align:center;">
      <div style="width:48px;height:48px;background:#40916C;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">🏸</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${courtName2}</h1>
      <p style="color:#74C69D;margin:4px 0 0;font-size:13px;">Konfirmasi Booking & Invoice Pembayaran</p>
    </div>

    <!-- Status lunas -->
    <div style="background:#d1fae5;border-bottom:2px solid #6ee7b7;padding:16px 32px;text-align:center;">
      <span style="color:#065f46;font-weight:700;font-size:15px;">✅ Pembayaran Berhasil — Booking Dikonfirmasi</span>
    </div>

    <!-- Body -->
    <div style="padding:32px;">

      <p style="color:#374151;font-size:14px;margin:0 0 24px;">
        Halo <strong>${booking.customer_name}</strong>,<br/>
        Terima kasih! Booking lapangan Anda telah dikonfirmasi.
      </p>

      <!-- Detail booking -->
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

      <!-- Detail pembayaran -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 16px;">Pembayaran</h2>
        ${[
          ['Order ID',       booking.payment_id   ?? '—'],
          ['Metode',         booking.payment_method ?? '—'],
          ['Waktu Bayar',    booking.paid_at ? format(new Date(booking.paid_at), 'd MMM yyyy, HH:mm') + ' WIB' : '—'],
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

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${siteUrl}/booking/status?booking_id=${booking.id}"
          style="display:inline-block;background:#40916C;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
          Lihat Status Booking
        </a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        Harap simpan email ini sebagai bukti pembayaran.<br/>
        Tunjukkan kepada petugas saat tiba di lapangan.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        ${courtName2} · Sistem Booking Online<br/>
        Email ini dikirim otomatis, mohon tidak membalas.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { data: emailData, error: emailErr } = await resend.emails.send({
      from:    `${courtName2} <noreply@${process.env.RESEND_DOMAIN ?? 'bookinglapangan.site'}>`,
      to:      [booking.customer_email],
      subject: `✅ Konfirmasi Booking — ${dateLabel} ${booking.start_time.slice(0,5)} WIB`,
      html,
    });

    if (emailErr) throw emailErr;

    // Log bahwa email sudah dikirim
    await supabase.from('bookings').update({
      invoice_sent_at: new Date().toISOString(),
    }).eq('id', bookingId);

    return NextResponse.json({ success: true, email_id: emailData?.id });
  } catch (err) {
    console.error('[invoice] Email error:', err);
    return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
  }
}
