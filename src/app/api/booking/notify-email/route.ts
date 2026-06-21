import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { Resend } from 'resend';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { booking_id } = await req.json();
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'Email belum dikonfigurasi' }, { status: 503 });

  const supabase = createAdminClient();
  const { data: booking, error } = await supabase
    .from('bookings').select('*, court:courts(id,name)').eq('id', booking_id).single();

  if (error || !booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 });
  if (!booking.customer_email) return NextResponse.json({ error: 'Email pelanggan tidak ada' }, { status: 400 });

  const { data: settingsData } = await supabase.from('settings').select('key,value');
  const map = Object.fromEntries((settingsData ?? []).map((r: {key:string;value:string}) => [r.key, r.value]));
  const gorName  = map.court_name ?? 'GOR Badminton';
  const waNumber = map.whatsapp_number ?? '';
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  const dateLabel = format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: idLocale });
  const courtName = booking.court?.name ?? 'Lapangan';

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/>
<title>Konfirmasi Booking</title></head>
<body style="margin:0;padding:0;background:#f0f9f4;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#1a3d2b;padding:28px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🏸</div>
    <h1 style="color:#fff;margin:0;font-size:18px;font-weight:700;">${gorName}</h1>
    <p style="color:#74C69D;margin:4px 0 0;font-size:13px;">Konfirmasi Booking Lapangan</p>
  </div>
  <div style="background:#d1fae5;border-bottom:2px solid #6ee7b7;padding:14px 28px;text-align:center;">
    <span style="color:#065f46;font-weight:700;font-size:14px;">✅ Booking Anda Telah Dikonfirmasi!</span>
  </div>
  <div style="padding:28px;">
    <p style="color:#374151;font-size:14px;margin:0 0 20px;">
      Halo <strong>${booking.customer_name}</strong>,<br/>
      Booking lapangan badminton Anda telah dikonfirmasi oleh admin.
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:18px;margin-bottom:20px;">
      <h2 style="color:#111827;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 14px;">Detail Booking</h2>
      ${[
        ['📅 Tanggal',   dateLabel],
        ['⏰ Jam',       `${booking.start_time.slice(0,5)} – ${booking.end_time.slice(0,5)} WIB`],
        ['⏱ Durasi',    `${booking.duration_hours} jam`],
        ['🏟 Lapangan',  courtName],
        ...(booking.amount ? [['💰 Harga', `Rp ${Number(booking.amount).toLocaleString('id')}`]] : []),
      ].map(([label, value]) => `
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e5e7eb;">
          <span style="color:#6b7280;font-size:12px;">${label}</span>
          <span style="color:#111827;font-size:12px;font-weight:600;">${value}</span>
        </div>`).join('')}
    </div>
    ${siteUrl ? `<div style="text-align:center;margin-bottom:20px;">
      <a href="${siteUrl}/cek-booking?booking_id=${booking.id}"
        style="display:inline-block;background:#40916C;color:#fff;font-weight:700;font-size:13px;padding:10px 24px;border-radius:10px;text-decoration:none;">
        Lihat Detail Booking
      </a>
    </div>` : ''}
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
      Harap simpan email ini sebagai referensi.<br/>
      ${waNumber ? `Pertanyaan? <a href="https://wa.me/${waNumber}" style="color:#40916C;">WhatsApp Admin</a>` : ''}
    </p>
  </div>
  <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;text-align:center;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">${gorName} · Email otomatis, mohon tidak membalas.</p>
  </div>
</div>
</body></html>`;

  try {
    await resend.emails.send({
      from:    `${gorName} <noreply@${process.env.RESEND_DOMAIN ?? 'bookinglapangan.site'}>`,
      to:      [booking.customer_email],
      subject: `✅ Konfirmasi Booking — ${dateLabel} ${booking.start_time.slice(0,5)} WIB`,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[notify-email]', err);
    return NextResponse.json({ error: 'Gagal mengirim email' }, { status: 500 });
  }
}
