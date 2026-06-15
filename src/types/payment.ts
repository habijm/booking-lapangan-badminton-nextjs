// src/types/payment.ts

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'refunded';

export type BookingSource = 'whatsapp' | 'direct' | 'admin' | 'membership';
export type BookingMode   = 'whatsapp' | 'direct';
export type MidtransEnv   = 'sandbox'  | 'production';

// ── Midtrans Snap response ────────────────────────────────────────────────────
export interface SnapTokenResponse {
  token:        string;
  redirect_url: string;
}

// ── Midtrans Notification Payload (dari webhook) ──────────────────────────────
export interface MidtransNotification {
  order_id:             string;
  transaction_id:       string;
  transaction_status:   MidtransTransactionStatus;
  transaction_time:     string;
  payment_type:         string;
  gross_amount:         string;
  fraud_status?:        string;
  status_code:          string;
  status_message:       string;
  currency:             string;
  signature_key?:       string;
  // Virtual Account / Bank Transfer
  va_numbers?:          { bank: string; va_number: string }[];
  // QRIS / GoPay
  actions?:             { name: string; method: string; url: string }[];
}

export type MidtransTransactionStatus =
  | 'capture'
  | 'settlement'
  | 'pending'
  | 'deny'
  | 'cancel'
  | 'expire'
  | 'refund'
  | 'partial_refund'
  | 'authorize';

// Map Midtrans status → internal PaymentStatus
export function mapMidtransStatus(
  txStatus: MidtransTransactionStatus,
  fraudStatus?: string,
): PaymentStatus {
  switch (txStatus) {
    case 'capture':
      return fraudStatus === 'challenge' ? 'pending' : 'paid';
    case 'settlement':
      return 'paid';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
      return 'failed';
    case 'expire':
      return 'expired';
    case 'refund':
    case 'partial_refund':
      return 'refunded';
    default:
      return 'pending';
  }
}

// ── Create booking request (dari frontend) ────────────────────────────────────
export interface CreateBookingPayload {
  customer_name:  string;
  customer_phone: string;
  customer_email?: string;
  booking_date:   string;    // YYYY-MM-DD
  start_time:     string;    // HH:mm
  duration_hours: number;
  court_id?:      string;
  notes?:         string;
}

// ── Response dari /api/payment/create ────────────────────────────────────────
export interface CreatePaymentResponse {
  booking_id:   string;
  order_id:     string;
  snap_token:   string;
  snap_url:     string;
  amount:       number;
  expiry_time:  string;  // ISO string
}

// ── Config pembayaran yang ditampilkan ke user ────────────────────────────────
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card:   '💳 Kartu Kredit/Debit',
  bank_transfer: '🏦 Transfer Bank (VA)',
  gopay:         '💚 GoPay',
  shopeepay:     '🧡 ShopeePay',
  qris:          '📱 QRIS',
  indomaret:     '🏪 Indomaret',
  alfamart:      '🏪 Alfamart',
  bca_klikpay:   '🔵 BCA KlikPay',
  bni_va:        '🟠 BNI Virtual Account',
  bri_va:        '🔵 BRI Virtual Account',
  mandiri_va:    '🟡 Mandiri Virtual Account',
  permata_va:    '🟣 Permata Virtual Account',
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, {
  label: string; color: string; bg: string; border: string; icon: string;
}> = {
  unpaid:   { label: 'Belum Bayar', color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/10',      icon: '⏸️' },
  pending:  { label: 'Menunggu',    color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: '⏳' },
  paid:     { label: 'Lunas',       color: 'text-[#74C69D]',  bg: 'bg-[#52B788]/10',  border: 'border-[#52B788]/30',  icon: '✅' },
  failed:   { label: 'Gagal',       color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: '❌' },
  expired:  { label: 'Kedaluwarsa', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '⌛' },
  refunded: { label: 'Dikembalikan',color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: '↩️' },
};
