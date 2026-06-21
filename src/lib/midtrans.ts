// src/lib/midtrans.ts
import {
  SnapTokenResponse,
  MidtransNotification,
  CreateBookingPayload,
} from '@/types/payment';

const MIDTRANS_BASE_URL = {
  sandbox:    'https://app.sandbox.midtrans.com',
  production: 'https://app.midtrans.com',
};

const MIDTRANS_API_URL = {
  sandbox:    'https://api.sandbox.midtrans.com',
  production: 'https://api.midtrans.com',
};

// ── Daftar metode pembayaran yang diizinkan ──────────────────────────────────
// Ubah array ini untuk menambah/kurangi metode pembayaran yang ditampilkan
// di halaman Snap. Kosongkan array `[]` untuk menampilkan SEMUA metode aktif
// di akun Midtrans Anda (default Midtrans jika field ini tidak dikirim).
//
// Kode yang tersedia:
//   credit_card   → Kartu kredit/debit (Visa, Mastercard, JCB, Amex)
//   bca_va        → BCA Virtual Account
//   bni_va        → BNI Virtual Account
//   bri_va        → BRI Virtual Account
//   permata_va    → Permata Virtual Account
//   other_va      → VA bank lain (Maybank, dll)
//   echannel      → Mandiri Bill Payment
//   gopay         → GoPay
//   shopeepay     → ShopeePay
//   qris          → QRIS
//   indomaret     → Bayar tunai di Indomaret
//   alfamart      → Bayar tunai di Alfamart
//   akulaku       → Akulaku Paylater
//
// Bisa juga di-override lewat environment variable MIDTRANS_ENABLED_PAYMENTS
// berupa string dipisah koma, contoh:
//   MIDTRANS_ENABLED_PAYMENTS=qris,shopeepay,credit_card,bca_va,bni_va
export const DEFAULT_ENABLED_PAYMENTS: string[] = ['qris', 'shopeepay', 'credit_card'];

function getEnabledPayments(): string[] {
  const envValue = process.env.MIDTRANS_ENABLED_PAYMENTS?.trim();
  if (envValue) {
    return envValue.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ENABLED_PAYMENTS;
}

function getServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) throw new Error('MIDTRANS_SERVER_KEY is not set');
  return key;
}

function getEnv(): 'sandbox' | 'production' {
  const env = (process.env.MIDTRANS_ENV ?? 'sandbox').trim().toLowerCase();
  return env === 'production' ? 'production' : 'sandbox';
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(getServerKey() + ':').toString('base64');
}

// ── Buat Snap Token ──────────────────────────────────────────────────────────
export async function createSnapToken(params: {
  orderId:       string;
  amount:        number;
  customerName:  string;
  customerPhone: string;
  customerEmail?: string;
  courtName:     string;
  bookingDate:   string;
  startTime:     string;
  endTime:       string;
  durationHours: number;
  expiryMinutes: number;
  callbackUrl:   {
    finish:  string;
    error:   string;
    pending: string;
  };
}): Promise<SnapTokenResponse> {
  const env = getEnv();
  const url = `${MIDTRANS_BASE_URL[env]}/snap/v1/transactions`;

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ` +
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')} +0700`;

  // Midtrans requires expiry.start_time to be strictly >= current time.
  // Add a small buffer (5 seconds) to avoid "expiry must be greater than the current time".
  const now = Date.now();
  const start = new Date(now + 5000);

  const enabledPayments = getEnabledPayments();

  const body = {
    transaction_details: {
      order_id:     params.orderId,
      gross_amount: params.amount,
    },
    // Kosongkan field ini (jangan kirim key-nya sama sekali) kalau ingin
    // menampilkan semua metode pembayaran aktif di akun Midtrans Anda.
    ...(enabledPayments.length > 0 ? { enabled_payments: enabledPayments } : {}),
    item_details: [
      {
        id:       'court-booking',
        price:    params.amount,
        quantity: 1,
        name:     `Booking ${params.courtName} - ${params.bookingDate} ${params.startTime}–${params.endTime}`,
      },
    ],
    customer_details: {
      first_name: params.customerName,
      phone:      params.customerPhone,
      ...(params.customerEmail ? { email: params.customerEmail } : {}),
    },
    callbacks: {
      finish:  params.callbackUrl.finish,
      error:   params.callbackUrl.error,
      pending: params.callbackUrl.pending,
    },
    expiry: {
      // Use start_time slightly in the future to avoid Midtrans 400.
      start_time: fmt(start),
      unit:       'minutes',
      duration:   params.expiryMinutes,
    },
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': authHeader(),
      'Accept':        'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Midtrans error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    token:        data.token,
    redirect_url: data.redirect_url,
  };
}

// ── Verifikasi signature notifikasi ─────────────────────────────────────────
export async function verifySignature(notification: MidtransNotification): Promise<boolean> {
  if (!notification.signature_key) return false;

  const { createHash } = await import('crypto');
  const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${getServerKey()}`;
  const expected = createHash('sha512').update(raw).digest('hex');
  return expected === notification.signature_key;
}

// ── Get transaction status dari Midtrans ─────────────────────────────────────
export async function getTransactionStatus(orderId: string): Promise<MidtransNotification | null> {
  const env = getEnv();
  const url = `${MIDTRANS_API_URL[env]}/v2/${orderId}/status`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Cancel transaction ───────────────────────────────────────────────────────
export async function cancelTransaction(orderId: string): Promise<boolean> {
  const env = getEnv();
  const url = `${MIDTRANS_API_URL[env]}/v2/${orderId}/cancel`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { Authorization: authHeader() },
  });
  return res.ok;
}

// ── Build base URL untuk callback ────────────────────────────────────────────
export function buildCallbackUrls(baseUrl: string, bookingId: string) {
  return {
    finish:  `${baseUrl}/booking/status?booking_id=${bookingId}`,
    error:   `${baseUrl}/booking/status?booking_id=${bookingId}&status=error`,
    pending: `${baseUrl}/booking/status?booking_id=${bookingId}&status=pending`,
  };
}

// ── Generate unique order ID ──────────────────────────────────────────────────
export function generateOrderId(bookingId: string): string {
  // Format: BKG-{shortId}-{timestamp}
  const short = bookingId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const ts    = Date.now().toString(36).toUpperCase();
  return `BKG-${short}-${ts}`;
}