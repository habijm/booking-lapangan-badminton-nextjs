import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Booking } from '@/types/booking';

export interface SendResult {
  ok: boolean;
  error?: string;
}

// ── Template pesan default ───────────────────────────────────────────────────
// Bisa di-override lewat admin (/admin/settings → tab Template WA), disimpan
// di tabel `settings` dengan key: wa_template_confirmed, wa_template_cancelled,
// wa_template_pending, wa_template_reminder.
//
// Placeholder yang tersedia (akan otomatis diganti dengan data booking asli):
//   {nama}        → nama customer
//   {lapangan}    → nama lapangan/GOR
//   {tanggal}     → tanggal booking (format lengkap)
//   {jam_mulai}   → jam mulai (HH:mm)
//   {jam_selesai} → jam selesai (HH:mm)
//   {durasi}      → durasi dalam jam
//   {alasan}      → alasan pembatalan (khusus template "cancelled")
//   {wa_admin}    → nomor WA admin (khusus template "pending")
export const DEFAULT_TEMPLATES = {
  confirmed:
    `✅ *Booking Dikonfirmasi!*\n\n` +
    `Halo *{nama}*,\n` +
    `Booking lapangan Anda telah dikonfirmasi.\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n` +
    `⏱ Durasi: {durasi} jam\n\n` +
    `Harap hadir tepat waktu. Terima kasih! 🏸`,

  cancelled:
    `❌ *Booking Dibatalkan*\n\n` +
    `Halo *{nama}*,\n` +
    `Maaf, booking lapangan Anda telah dibatalkan.\n\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n` +
    `{alasan_block}` +
    `\nSilakan hubungi kami untuk informasi lebih lanjut.`,

  pending:
    `⏳ *Permintaan Booking Diterima*\n\n` +
    `Halo *{nama}*,\n` +
    `Permintaan booking Anda sedang diproses.\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n\n` +
    `Kami akan segera mengkonfirmasi booking Anda.\n` +
    `Info lebih lanjut hubungi: wa.me/{wa_admin}`,

  reminder:
    `🔔 *Pengingat Booking Besok*\n\n` +
    `Halo *{nama}*,\n` +
    `Mengingatkan booking lapangan Anda besok:\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n\n` +
    `Sampai jumpa! 🏸`,
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

/** Ganti semua placeholder {key} di template dengan nilai dari `vars`. */
function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(value);
  }
  // Footer otomatis ditambahkan di luar template (konsisten di semua pesan)
  return result;
}

/**
 * Kirim pesan WhatsApp via Fonnte API.
 * Set FONNTE_TOKEN di environment variables.
 * Daftar gratis di https://fonnte.com
 *
 * Mengembalikan { ok, error } supaya pemanggil tahu PERSIS kenapa gagal
 * (token belum diset, device disconnected, nomor invalid, dll) —
 * bukan cuma true/false yang tidak informatif.
 */
async function sendFonnte(phone: string, message: string): Promise<SendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('[WhatsApp] FONNTE_TOKEN tidak di-set, skip notifikasi.');
    return { ok: false, error: 'FONNTE_TOKEN belum diset di environment variables server.' };
  }

  // Normalize phone: 08xxx → 628xxx
  const normalized = phone.replace(/^0/, '62').replace(/^\+/, '').replace(/\s/g, '');
  if (!/^62\d{8,14}$/.test(normalized)) {
    return { ok: false, error: `Format nomor WhatsApp tidak valid: "${phone}"` };
  }

  try {
    // PENTING: Fonnte API mengharapkan body berformat x-www-form-urlencoded
    // (sesuai dokumentasi resmi mereka yang pakai contoh -F / form-data),
    // BUKAN raw JSON. Kalau dikirim sebagai application/json, server Fonnte
    // tidak bisa parsing field-nya dengan benar dan menganggap target/message
    // kosong → muncul error "invalid/empty body value" meskipun datanya
    // sebenarnya terisi di sisi kita.
    const formBody = new URLSearchParams();
    formBody.append('target',  normalized);
    formBody.append('message', message);
    formBody.append('delay',   '2');

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        // Jangan set Content-Type manual ke application/json di sini —
        // browser/fetch akan otomatis set ke application/x-www-form-urlencoded
        // karena body-nya instance URLSearchParams.
      },
      body: formBody,
    });

    const raw = await res.text();
    let json: { status?: boolean; reason?: string; message?: string } = {};
    try { json = raw ? JSON.parse(raw) : {}; } catch {
      console.error('[WhatsApp] Respons Fonnte bukan JSON:', raw.slice(0, 300));
      return { ok: false, error: `Fonnte mengembalikan respons tidak valid (status HTTP ${res.status}).` };
    }

    if (!res.ok) {
      return { ok: false, error: json.reason ?? json.message ?? `Fonnte API error (status ${res.status}).` };
    }

    if (!json.status) {
      console.error('[WhatsApp] Fonnte menolak permintaan:', json);
      return {
        ok: false,
        error: json.reason ?? json.message ?? 'Fonnte menolak permintaan — cek apakah device masih "Connected" di dashboard Fonnte dan token masih valid.',
      };
    }

    return { ok: true };
  } catch (err) {
    console.error('[WhatsApp] Error:', err);
    return { ok: false, error: 'Gagal terhubung ke server Fonnte. Cek koneksi internet server.' };
  }
}

/** Notifikasi ke customer: booking dikonfirmasi */
export async function notifyConfirmed(
  booking: Booking, courtName: string, customTemplate?: string,
): Promise<SendResult> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const vars = {
    nama:        booking.customer_name,
    lapangan:    courtName,
    tanggal:     dateStr,
    jam_mulai:   booking.start_time.slice(0, 5),
    jam_selesai: booking.end_time.slice(0, 5),
    durasi:      String(booking.duration_hours),
  };
  const msg = renderTemplate(customTemplate?.trim() || DEFAULT_TEMPLATES.confirmed, vars)
    + `\n\n_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Notifikasi ke customer: booking dibatalkan */
export async function notifyCancelled(
  booking: Booking, courtName: string, reason?: string, customTemplate?: string,
): Promise<SendResult> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const vars = {
    nama:          booking.customer_name,
    lapangan:      courtName,
    tanggal:       dateStr,
    jam_mulai:     booking.start_time.slice(0, 5),
    jam_selesai:   booking.end_time.slice(0, 5),
    durasi:        String(booking.duration_hours),
    alasan:        reason ?? '',
    alasan_block:  reason ? `\n📝 Alasan: ${reason}\n` : '',
  };
  const msg = renderTemplate(customTemplate?.trim() || DEFAULT_TEMPLATES.cancelled, vars)
    + `\n\n_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Notifikasi ke customer: booking pending (menunggu konfirmasi) */
export async function notifyPending(
  booking: Booking, courtName: string, waNumber: string, customTemplate?: string,
): Promise<SendResult> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const vars = {
    nama:        booking.customer_name,
    lapangan:    courtName,
    tanggal:     dateStr,
    jam_mulai:   booking.start_time.slice(0, 5),
    jam_selesai: booking.end_time.slice(0, 5),
    durasi:      String(booking.duration_hours),
    wa_admin:    waNumber,
  };
  const msg = renderTemplate(customTemplate?.trim() || DEFAULT_TEMPLATES.pending, vars)
    + `\n\n_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Pengingat H-1 ke customer */
export async function notifyReminder(
  booking: Booking, courtName: string, customTemplate?: string,
): Promise<SendResult> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const vars = {
    nama:        booking.customer_name,
    lapangan:    courtName,
    tanggal:     dateStr,
    jam_mulai:   booking.start_time.slice(0, 5),
    jam_selesai: booking.end_time.slice(0, 5),
    durasi:      String(booking.duration_hours),
  };
  const msg = renderTemplate(customTemplate?.trim() || DEFAULT_TEMPLATES.reminder, vars);
  return sendFonnte(booking.customer_phone, msg);
}
