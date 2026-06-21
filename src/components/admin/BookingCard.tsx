'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Booking } from '@/types/booking';
import { AdminBadge } from './AdminCard';
import { PaymentStatusBadge, InvoiceModal } from './PaymentStatusBadge';
import { PAYMENT_STATUS_CONFIG, PaymentStatus } from '@/types/payment';

interface Props {
  booking: Booking;
  today: string;
  actionLoading: string | null;
  canConfirm: boolean;
  canCancel: boolean;
  canDelete: boolean;
  courtName?: string; // nama GOR dari settings
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
  onDelete:  (id: string) => void;
}

export function BookingCard({
  booking, today, actionLoading,
  canConfirm, canCancel, canDelete,
  courtName = 'GOR Badminton',
  onConfirm, onCancel, onDelete,
}: Props) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const isPast    = booking.booking_date < today;
  const isPending = booking.status === 'pending';

  // Apakah booking ini dari pembayaran online?
  const isDirectBooking = booking.booking_source === 'direct';
  const paymentStatus   = booking.payment_status as PaymentStatus | undefined;
  const isPaid          = paymentStatus === 'paid';

  const borderColor =
    isPaid                      ? 'border-l-[#52B788]/80'   :
    booking.status === 'pending'   ? 'border-l-amber-500/60' :
    booking.status === 'confirmed' ? 'border-l-[#52B788]/60' :
                                     'border-l-red-500/40';

  return (
    <>
      <div
        className={`rounded-2xl border border-[#52B788]/15 border-l-4 ${borderColor} p-4 transition-all ${
          isPast && booking.status !== 'cancelled' ? 'opacity-50' : ''
        }`}
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Row 1: Nama + status badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-white font-display text-sm">{booking.customer_name}</h3>
              <AdminBadge status={booking.status}/>
              {booking.court && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#52B788]/20 bg-[#52B788]/10 text-[#74C69D]/70 font-medium">
                  {booking.court.name}
                </span>
              )}
              {/* Payment status badge — hanya tampil untuk booking online */}
              {(isDirectBooking || paymentStatus) && (
                <PaymentStatusBadge
                  paymentStatus={paymentStatus ?? 'unpaid'}
                  bookingSource={booking.booking_source}
                  amount={booking.amount}
                  onClick={() => setInvoiceOpen(true)}
                />
              )}
              {isPast && booking.status !== 'cancelled' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/30">
                  Sudah lewat
                </span>
              )}
            </div>

            {/* Row 2: Tanggal, jam, HP */}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#74C69D]/50">
              <span>📅 {format(parseISO(booking.booking_date), 'EEE, d MMM yyyy', { locale: id })}</span>
              <span>⏰ {booking.start_time.slice(0,5)}–{booking.end_time.slice(0,5)} ({booking.duration_hours} jam)</span>
              <a href={`https://wa.me/${booking.customer_phone.replace(/^0/,'62').replace(/\+/g,'')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#52B788] hover:text-[#74C69D] transition-colors font-medium">
                📱 {booking.customer_phone}
              </a>
              {/* Email jika ada */}
              {booking.customer_email && (
                <span className="text-[#74C69D]/40">✉️ {booking.customer_email}</span>
              )}
            </div>

            {/* Harga + metode bayar (hanya direct booking) */}
            {isDirectBooking && booking.amount && (
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#74C69D]/30">
                <span>💰 Rp {booking.amount.toLocaleString('id')}</span>
                {booking.payment_method && <span>💳 {booking.payment_method}</span>}
                {isPaid && booking.paid_at && (
                  <span>✅ Lunas {format(new Date(booking.paid_at), 'd MMM, HH:mm')}</span>
                )}
              </div>
            )}

            {booking.notes && (
              <p className="text-xs text-[#74C69D]/30 mt-1 italic">📝 {booking.notes}</p>
            )}
            {booking.admin_notes && (
              <p className="text-xs text-amber-400/60 mt-0.5 italic">🔒 {booking.admin_notes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Nota — tampil untuk semua booking yang punya data pembayaran */}
            {(isDirectBooking || paymentStatus) && (
              <button
                onClick={() => setInvoiceOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#52B788]/20 bg-[#52B788]/5 text-[#74C69D]/70 hover:text-[#74C69D] hover:bg-[#52B788]/10 text-xs font-semibold transition-all"
                title="Lihat Nota / Invoice"
              >
                🧾 Nota
              </button>
            )}

            {isPending && canConfirm && (
              <button onClick={() => onConfirm(booking.id)} disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#40916C] hover:bg-[#52B788] text-white text-xs font-semibold transition-all disabled:opacity-50 active:scale-95">
                {actionLoading === booking.id + 'confirmed'
                  ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : '✓'} Konfirmasi
              </button>
            )}
            {booking.status !== 'cancelled' && canCancel && (
              <button onClick={() => onCancel(booking.id)} disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/8 text-red-400 hover:bg-red-500/15 text-xs font-semibold transition-all disabled:opacity-50 active:scale-95">
                {actionLoading === booking.id + 'cancelled'
                  ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"/>
                  : '✕'} Batalkan
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(booking.id)} disabled={!!actionLoading}
                className="p-1.5 rounded-lg border border-white/10 text-white/20 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8 transition-all"
                title="Hapus permanen">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        booking={{
          id:              booking.id,
          customer_name:   booking.customer_name,
          customer_phone:  booking.customer_phone,
          customer_email:  booking.customer_email,
          booking_date:    booking.booking_date,
          start_time:      booking.start_time,
          end_time:        booking.end_time,
          duration_hours:  booking.duration_hours,
          status:          booking.status,
          payment_status:  (booking.payment_status as PaymentStatus) ?? 'unpaid',
          payment_id:      booking.payment_id,
          payment_method:  booking.payment_method,
          transaction_id:  booking.transaction_id,
          amount:          booking.amount,
          paid_at:         booking.paid_at,
          booking_source:  booking.booking_source,
          court:           booking.court ? { id: booking.court.id, name: booking.court.name } : null,
          notes:           booking.notes,
        }}
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        courtName={courtName}
      />
    </>
  );
}
