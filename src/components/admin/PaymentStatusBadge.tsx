// src/components/admin/PaymentStatusBadge.tsx
// Komponen badge status pembayaran untuk tabel booking admin
// + Modal nota/invoice

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PAYMENT_STATUS_CONFIG, PaymentStatus } from '@/types/payment';

// ── Badge status pembayaran ──────────────────────────────────────────────────
interface BadgeProps {
  paymentStatus: PaymentStatus;
  bookingSource?: string;
  amount?: number;
  onClick?: () => void;
}

export function PaymentStatusBadge({ paymentStatus, bookingSource, amount, onClick }: BadgeProps) {
  const ps = PAYMENT_STATUS_CONFIG[paymentStatus] ?? PAYMENT_STATUS_CONFIG['unpaid'];

  if (bookingSource === 'whatsapp') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#25D366]/10 border border-[#25D366]/20 text-[#4ADE80]">
        💬 WhatsApp
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all hover:opacity-80 ${ps.bg} ${ps.border} ${ps.color} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span>{ps.icon}</span>
      <span>{ps.label}</span>
      {amount && paymentStatus === 'paid' && (
        <span className="ml-1 opacity-60">· Rp {amount.toLocaleString('id')}</span>
      )}
    </button>
  );
}

// ── Modal nota/invoice ───────────────────────────────────────────────────────
interface Booking {
  id:              string;
  customer_name:   string;
  customer_phone:  string;
  customer_email?: string;
  booking_date:    string;
  start_time:      string;
  end_time:        string;
  duration_hours:  number;
  status:          string;
  payment_status:  PaymentStatus;
  payment_id?:     string;
  payment_method?: string;
  transaction_id?: string;
  amount?:         number;
  paid_at?:        string;
  booking_source?: string;
  court?:          { id: string; name: string } | null;
  notes?:          string;
}

interface InvoiceModalProps {
  booking:  Booking;
  isOpen:   boolean;
  onClose:  () => void;
  courtName: string; // nama GOR dari settings
}

export function InvoiceModal({ booking, isOpen, onClose, courtName }: InvoiceModalProps) {
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [sendError, setSendError] = useState('');

  if (!isOpen) return null;

  const dateLabel = format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
  const ps        = PAYMENT_STATUS_CONFIG[booking.payment_status] ?? PAYMENT_STATUS_CONFIG['unpaid'];

  const handleSendEmail = async () => {
    if (!booking.customer_email) { setSendError('Email pelanggan tidak tersedia'); return; }
    setSending(true); setSendError('');
    try {
      const res  = await fetch('/api/payment/invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_id: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Gagal mengirim email');
    } finally { setSending(false); }
  };

  const handlePrint = () => window.print();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#52B788]/20 print:shadow-none"
        style={{ background: '#0D2B1C' }}
        id="invoice-print-area"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#52B788]/15" style={{ background: '#0D2B1C' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center text-sm">🧾</div>
            <div>
              <h2 className="font-bold text-white text-sm">Invoice Booking</h2>
              <p className="text-[#74C69D]/40 text-xs">#{booking.payment_id ?? booking.id.slice(0,8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#74C69D]/40 hover:text-[#74C69D] transition-colors text-lg">✕</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Status */}
          <div className={`p-4 rounded-xl border text-center ${ps.bg} ${ps.border}`}>
            <div className="text-2xl mb-1">{ps.icon}</div>
            <div className={`font-bold text-sm ${ps.color}`}>{ps.label}</div>
            {booking.paid_at && (
              <div className="text-[#74C69D]/50 text-xs mt-1">
                {format(new Date(booking.paid_at), 'd MMM yyyy, HH:mm', { locale: id })} WIB
              </div>
            )}
          </div>

          {/* Detail booking */}
          <div className="rounded-xl border border-[#52B788]/15 overflow-hidden">
            <div className="px-4 py-2.5 bg-[#52B788]/5 border-b border-[#52B788]/10">
              <h3 className="text-[10px] font-bold text-[#74C69D]/50 uppercase tracking-widest">Detail Booking</h3>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                { label: '📅 Tanggal',   value: dateLabel },
                { label: '⏰ Jam',       value: `${booking.start_time.slice(0,5)} – ${booking.end_time.slice(0,5)} WIB` },
                { label: '⏱️ Durasi',   value: `${booking.duration_hours} jam` },
                { label: '🏟️ Lapangan', value: booking.court?.name ?? 'Lapangan' },
                { label: '👤 Nama',      value: booking.customer_name },
                { label: '📱 WhatsApp',  value: booking.customer_phone },
                ...(booking.customer_email ? [{ label: '✉️ Email', value: booking.customer_email }] : []),
                ...(booking.notes ? [{ label: '📝 Catatan', value: booking.notes }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-3 text-xs">
                  <span className="text-[#74C69D]/50 flex-shrink-0">{label}</span>
                  <span className="text-white font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail pembayaran */}
          {booking.payment_status === 'paid' && (
            <div className="rounded-xl border border-[#52B788]/20 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#52B788]/5 border-b border-[#52B788]/10">
                <h3 className="text-[10px] font-bold text-[#74C69D]/50 uppercase tracking-widest">Pembayaran</h3>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {[
                  { label: '🔖 Order ID',       value: booking.payment_id ?? '—' },
                  { label: '💳 Metode',          value: booking.payment_method ?? '—' },
                  { label: '🧾 Transaction ID',  value: booking.transaction_id ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start gap-3 text-xs">
                    <span className="text-[#74C69D]/50 flex-shrink-0">{label}</span>
                    <span className="text-white font-mono text-right text-[10px]">{value}</span>
                  </div>
                ))}
                <div className="pt-2.5 border-t border-[#52B788]/15 flex justify-between items-center">
                  <span className="font-bold text-[#74C69D] text-sm">Total</span>
                  <span className="font-bold text-white text-base">Rp {booking.amount?.toLocaleString('id') ?? '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Aksi */}
          <div className="space-y-2 print:hidden">
            {/* Kirim email invoice */}
            {booking.payment_status === 'paid' && (
              <div className="space-y-1.5">
                <button
                  onClick={handleSendEmail}
                  disabled={sending || sent || !booking.customer_email}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                    sent
                      ? 'bg-[#52B788]/20 border border-[#52B788]/30 text-[#52B788] cursor-default'
                      : !booking.customer_email
                        ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-[#40916C] hover:bg-[#52B788] text-white'
                  }`}
                >
                  {sending ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Mengirim…</>
                  ) : sent ? (
                    <>✅ Email Terkirim</>
                  ) : (
                    <>✉️ Kirim Invoice ke Email {booking.customer_email ? `(${booking.customer_email})` : '(tidak ada email)'}</>
                  )}
                </button>
                {sendError && (
                  <p className="text-red-400 text-xs text-center">⚠️ {sendError}</p>
                )}
              </div>
            )}

            {/* Print */}
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#52B788]/25 text-[#74C69D]/70 hover:text-[#74C69D] hover:border-[#52B788]/40 font-bold text-sm transition-all"
            >
              🖨️ Print / Simpan PDF
            </button>

            <button onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#52B788]/10 text-[#74C69D]/40 text-sm transition-all hover:text-[#74C69D]/60">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
