import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Booking } from '@/types/booking';

/**
 * Kirim pesan WhatsApp via Fonnte API.
 * Set FONNTE_TOKEN di environment variables.
 * Daftar gratis di https://fonnte.com
 */
async function sendFonnte(phone: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('[WhatsApp] FONNTE_TOKEN tidak di-set, skip notifikasi.');
    return false;
  }

  // Normalize phone: 08xxx → 628xxx
  const normalized = phone.replace(/^0/, '62').replace(/^\+/, '').replace(/\s/g, '');

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target:  normalized,
        message: message,
        delay:   2,
      }),
    });
    const json = await res.json();
    if (!json.status) {
      console.error('[WhatsApp] Gagal kirim:', json);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[WhatsApp] Error:', err);
    return false;
  }
}

/** Notifikasi ke customer: booking dikonfirmasi */
export async function notifyConfirmed(booking: Booking, courtName: string): Promise<boolean> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const msg =
    `✅ *Booking Dikonfirmasi!*\n\n` +
    `Halo *${booking.customer_name}*,\n` +
    `Booking lapangan Anda telah dikonfirmasi.\n\n` +
    `📍 *${courtName}*\n` +
    `📅 ${dateStr}\n` +
    `⏰ ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)} WIB\n` +
    `⏱ Durasi: ${booking.duration_hours} jam\n\n` +
    `Harap hadir tepat waktu. Terima kasih! 🏸\n\n` +
    `_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Notifikasi ke customer: booking dibatalkan */
export async function notifyCancelled(booking: Booking, courtName: string, reason?: string): Promise<boolean> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const msg =
    `❌ *Booking Dibatalkan*\n\n` +
    `Halo *${booking.customer_name}*,\n` +
    `Maaf, booking lapangan Anda telah dibatalkan.\n\n` +
    `📅 ${dateStr}\n` +
    `⏰ ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)} WIB\n` +
    (reason ? `\n📝 Alasan: ${reason}\n` : '') +
    `\nSilakan hubungi kami untuk informasi lebih lanjut.\n\n` +
    `_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Notifikasi ke customer: booking pending (menunggu konfirmasi) */
export async function notifyPending(booking: Booking, courtName: string, waNumber: string): Promise<boolean> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const msg =
    `⏳ *Permintaan Booking Diterima*\n\n` +
    `Halo *${booking.customer_name}*,\n` +
    `Permintaan booking Anda sedang diproses.\n\n` +
    `📍 *${courtName}*\n` +
    `📅 ${dateStr}\n` +
    `⏰ ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)} WIB\n\n` +
    `Kami akan segera mengkonfirmasi booking Anda.\n` +
    `Info lebih lanjut hubungi: wa.me/${waNumber}\n\n` +
    `_Pesan otomatis dari sistem booking ${courtName}_`;
  return sendFonnte(booking.customer_phone, msg);
}

/** Pengingat H-1 ke customer */
export async function notifyReminder(booking: Booking, courtName: string): Promise<boolean> {
  const dateStr = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: id });
  const msg =
    `🔔 *Pengingat Booking Besok*\n\n` +
    `Halo *${booking.customer_name}*,\n` +
    `Mengingatkan booking lapangan Anda besok:\n\n` +
    `📍 *${courtName}*\n` +
    `📅 ${dateStr}\n` +
    `⏰ ${booking.start_time.slice(0, 5)} – ${booking.end_time.slice(0, 5)} WIB\n\n` +
    `Sampai jumpa! 🏸`;
  return sendFonnte(booking.customer_phone, msg);
}
