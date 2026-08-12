import { createClient } from '@supabase/supabase-js';
import { notifyConfirmed } from '@/lib/whatsapp';
import { sendInvoiceByBookingId } from '@/app/api/payment/invoice/route';
import { Booking } from '@/types/booking';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type PaidBookingNotificationInput = Pick<
  Booking,
  'id' | 'customer_name' | 'customer_phone' | 'customer_email' | 'booking_date' | 'start_time' | 'end_time' | 'duration_hours' | 'payment_status' | 'invoice_sent_at'
>;

export async function sendPaidBookingNotifications(booking: PaidBookingNotificationInput): Promise<{ ok: boolean }> {
  const supabase = supabaseAdmin();

  console.log('[payment-notifications] start', {
    bookingId: booking.id,
    paymentStatus: booking.payment_status,
    hasEmail: Boolean(booking.customer_email),
    invoiceSentAt: booking.invoice_sent_at ?? null,
  });

  const { data: settingsData } = await supabase.from('settings').select('key, value');
  const settings = Object.fromEntries((settingsData ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  console.log('[payment-notifications] settings snapshot', {
    fonnte_enabled: settings.fonnte_enabled,
    court_name: settings.court_name,
    resendEnabled: Boolean(process.env.RESEND_API_KEY),
  });

  let waOk = true;
  let emailOk = true;
  let attempted = false;

  if (settings.fonnte_enabled === 'true') {
    attempted = true;
    console.log('[payment-notifications] sending WA', { bookingId: booking.id, phone: booking.customer_phone });
    const waResult = await notifyConfirmed(
      booking,
      settings.court_name ?? 'GOR Badminton',
      settings.wa_template_confirmed,
    );
    waOk = waResult.ok;
    if (!waOk) {
      console.error('[payment-notifications] WA notify gagal:', waResult.error);
    } else {
      console.log('[payment-notifications] WA notify sukses', { bookingId: booking.id });
    }
  } else {
    console.log('[payment-notifications] WA skip: fonnte_enabled bukan true');
  }

  if (booking.customer_email && process.env.RESEND_API_KEY) {
    attempted = true;
    console.log('[payment-notifications] sending email invoice', { bookingId: booking.id, email: booking.customer_email });
    const invoiceResponse = await sendInvoiceByBookingId(booking.id);
    emailOk = invoiceResponse.ok;
    if (!emailOk) {
      const invoiceJson = await invoiceResponse.json().catch(() => ({}));
      console.error('[payment-notifications] invoice email gagal:', invoiceJson);
    } else {
      console.log('[payment-notifications] invoice email sukses', { bookingId: booking.id });
    }
  } else {
    console.log('[payment-notifications] email skip', {
      hasEmail: Boolean(booking.customer_email),
      resendEnabled: Boolean(process.env.RESEND_API_KEY),
    });
  }

  console.log('[payment-notifications] done', {
    bookingId: booking.id,
    attempted,
    waOk,
    emailOk,
    ok: attempted ? waOk && emailOk : true,
  });

  return { ok: attempted ? waOk && emailOk : true };
}