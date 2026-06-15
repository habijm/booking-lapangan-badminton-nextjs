// src/app/booking/status/BookingStatusClient.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PAYMENT_STATUS_CONFIG, PaymentStatus } from '@/types/payment';

interface BookingDetail {
  id:             string;
  status:         string;
  payment_status: PaymentStatus;
  payment_id:     string | null;
  payment_method: string | null;
  transaction_id: string | null;
  snap_url:       string | null;
  amount:         number;
  paid_at:        string | null;
  customer_name:  string;
  customer_phone: string;
  booking_date:   string;
  start_time:     string;
  end_time:       string;
  duration_hours: number;
  court:          { id: string; name: string } | null;
}

export default function BookingStatusClient() {
  const params    = useSearchParams();
  const router    = useRouter();
  const bookingId = params.get('booking_id');

  const [booking, setBooking]     = useState<BookingDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [polling, setPolling]     = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchStatus = useCallback(async (showPolling = false) => {
    if (!bookingId) return;
    if (showPolling) setPolling(true);
    try {
      const res  = await fetch(`/api/payment/status?booking_id=${bookingId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Booking tidak ditemukan');
      else { setBooking(data.booking); setLastCheck(new Date()); }
    } catch { setError('Gagal memuat status.'); }
    finally { setLoading(false); setPolling(false); }
  }, [bookingId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-poll tiap 5 detik kalau masih pending
  useEffect(() => {
    if (!booking) return;
    if (!['pending', 'unpaid'].includes(booking.payment_status)) return;
    const timer = setInterval(() => fetchStatus(true), 5000);
    return () => clearInterval(timer);
  }, [booking, fetchStatus]);

  // ── No booking_id ────────────────────────────────────────────────────────
  if (!bookingId) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1F12' }}>
      <div className="text-center space-y-3 p-6">
        <div className="text-4xl">🔍</div>
        <h2 className="font-bold text-white text-lg">Booking tidak ditemukan</h2>
        <p className="text-[#74C69D]/50 text-sm">Parameter booking_id tidak ada.</p>
        <button onClick={() => router.push('/')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-[#40916C] text-white text-sm font-bold">
          Ke Halaman Utama
        </button>
      </div>
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1F12' }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin mx-auto"/>
        <p className="text-[#74C69D]/50 text-sm">Memuat status pembayaran…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !booking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A1F12' }}>
      <div className="text-center space-y-3 p-6">
        <div className="text-4xl">⚠️</div>
        <h2 className="font-bold text-white text-lg">{error || 'Booking tidak ditemukan'}</h2>
        <button onClick={() => router.push('/')}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#40916C] text-white text-sm font-bold">
          Ke Halaman Utama
        </button>
      </div>
    </div>
  );

  const ps        = PAYMENT_STATUS_CONFIG[booking.payment_status] ?? PAYMENT_STATUS_CONFIG['unpaid'];
  const isPaid    = booking.payment_status === 'paid';
  const isPending = ['pending', 'unpaid'].includes(booking.payment_status);
  const isFailed  = ['failed', 'expired'].includes(booking.payment_status);
  const dateLabel = format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
  const courtName = booking.court?.name ?? 'Lapangan';

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#0A1F12' }}>
      <div className="max-w-md mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-xl border border-[#52B788]/20 flex items-center justify-center text-[#74C69D]/50 hover:text-[#74C69D] transition-all text-sm">
            ←
          </button>
          <div>
            <h1 className="font-bold text-white text-lg font-display">Status Booking</h1>
            <p className="text-[#74C69D]/40 text-xs">ID: {booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Status utama */}
        <div className={`p-5 rounded-2xl border ${ps.bg} ${ps.border} text-center space-y-2`}>
          <div className="text-4xl">{ps.icon}</div>
          <h2 className={`font-bold text-xl font-display ${ps.color}`}>{ps.label}</h2>
          {isPaid && (
            <p className="text-[#74C69D]/60 text-sm">
              Dibayar:{' '}
              {booking.paid_at
                ? format(new Date(booking.paid_at), 'd MMM yyyy, HH:mm', { locale: id })
                : '—'}{' '}WIB
            </p>
          )}
          {isPending && (
            <div className="flex items-center justify-center gap-2 text-amber-400/70 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block"/>
              Menunggu konfirmasi pembayaran…
              {polling && <span className="text-amber-400/40 ml-1">(memeriksa…)</span>}
            </div>
          )}
          {isFailed && (
            <p className="text-red-400/60 text-sm">Booking dibatalkan otomatis.</p>
          )}
        </div>

        {/* Detail booking */}
        <div className="rounded-2xl border border-[#52B788]/15 overflow-hidden" style={{ background: '#0D2B1C' }}>
          <div className="px-5 py-3 border-b border-[#52B788]/10">
            <h3 className="font-semibold text-[#74C69D]/70 text-xs uppercase tracking-widest">Detail Booking</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: '📅 Tanggal',    value: dateLabel },
              { label: '⏰ Jam',        value: `${booking.start_time.slice(0,5)} – ${booking.end_time.slice(0,5)} WIB` },
              { label: '⏱️ Durasi',    value: `${booking.duration_hours} jam` },
              { label: '🏟️ Lapangan',  value: courtName },
              { label: '👤 Nama',       value: booking.customer_name },
              { label: '📱 WhatsApp',   value: booking.customer_phone },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-3">
                <span className="text-[#74C69D]/50 text-xs flex-shrink-0">{label}</span>
                <span className="text-white font-medium text-xs text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail pembayaran */}
        <div className="rounded-2xl border border-[#52B788]/15 overflow-hidden" style={{ background: '#0D2B1C' }}>
          <div className="px-5 py-3 border-b border-[#52B788]/10">
            <h3 className="font-semibold text-[#74C69D]/70 text-xs uppercase tracking-widest">Pembayaran</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: '💰 Total',         value: `Rp ${booking.amount?.toLocaleString('id') ?? '—'}` },
              { label: '💳 Metode',         value: booking.payment_method ?? '—' },
              { label: '🔖 Order ID',       value: booking.payment_id ?? '—' },
              { label: '🧾 Transaction ID', value: booking.transaction_id ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-3">
                <span className="text-[#74C69D]/50 text-xs flex-shrink-0">{label}</span>
                <span className="text-white font-medium text-xs text-right font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aksi */}
        <div className="space-y-2">
          {isPending && booking.snap_url && (
            <a href={booking.snap_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all shadow-lg shadow-[#40916C]/20">
              💳 Lanjutkan Pembayaran
            </a>
          )}
          <button onClick={() => fetchStatus(true)} disabled={polling}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#52B788]/25 text-[#74C69D]/70 hover:text-[#74C69D] hover:border-[#52B788]/40 text-sm transition-all disabled:opacity-40">
            {polling
              ? <><span className="w-3.5 h-3.5 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin"/>Memeriksa…</>
              : '🔄 Refresh Status'}
          </button>
          <button onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#52B788]/15 text-[#74C69D]/40 hover:text-[#74C69D]/60 text-sm transition-all">
            ← Kembali ke Jadwal
          </button>
        </div>

        {/* Last check */}
        {lastCheck && (
          <p className="text-center text-[10px] text-[#74C69D]/25">
            Terakhir diperiksa: {format(lastCheck, 'HH:mm:ss')}
            {isPending && ' · auto-refresh tiap 5 detik'}
          </p>
        )}
      </div>
    </div>
  );
}
