// src/components/public/BookingModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Court } from '@/types/booking';
import { CreatePaymentResponse } from '@/types/payment';

// Midtrans Snap script injector
function loadSnapScript(clientKey: string, env: 'sandbox' | 'production'): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as Window & { snap?: unknown }).snap) { resolve(); return; }
    const script   = document.createElement('script');
    script.src     = env === 'production'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Snap.js'));
    document.head.appendChild(script);
  });
}

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  selectedDate:  string;
  selectedSlot:  string;         // HH:mm
  selectedCourt: Court | null;
  pricePerHour:  number;
  closingHour:   number;
  openingHour:   number;
  courtName:     string;
}

type Step = 'form' | 'paying' | 'success' | 'failed';

export default function BookingModal({
  isOpen, onClose,
  selectedDate, selectedSlot,
  selectedCourt, pricePerHour,
  closingHour, openingHour, courtName,
}: Props) {
  const [step, setStep]         = useState<Step>('form');
  const [form, setForm]         = useState({
    customer_name:  '',
    customer_phone: '',
    customer_email: '',
    duration_hours: 1,
    notes:          '',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);

  const maxDuration = closingHour - parseInt(selectedSlot);
  const endHour     = parseInt(selectedSlot) + form.duration_hours;
  const endTime     = `${endHour.toString().padStart(2, '0')}:00`;
  const activePrice = selectedCourt?.price_per_hour ?? pricePerHour;
  const totalAmount = activePrice * form.duration_hours;

  const dateLabel = selectedDate
    ? format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })
    : '';

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      setPaymentData(null);
      setForm({ customer_name: '', customer_phone: '', customer_email: '', duration_hours: 1, notes: '' });
    }
  }, [isOpen, selectedSlot, selectedDate]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.customer_name.trim())  { setError('Nama wajib diisi'); return; }
    if (!form.customer_phone.trim()) { setError('Nomor HP wajib diisi'); return; }
    if (form.customer_phone.trim().length < 9) { setError('Nomor HP tidak valid'); return; }

    setLoading(true);

    try {
      // 1. Buat booking + snap token
      const res = await fetch('/api/payment/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:  form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || undefined,
          booking_date:   selectedDate,
          start_time:     selectedSlot,
          duration_hours: form.duration_hours,
          court_id:       selectedCourt?.id,
          notes:          form.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Gagal membuat booking'); setLoading(false); return; }

      setPaymentData(data as CreatePaymentResponse);
      setStep('paying');
      setLoading(false);

      // 2. Load Snap.js dan buka popup
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
      const env       = (process.env.NEXT_PUBLIC_MIDTRANS_ENV ?? 'sandbox') as 'sandbox' | 'production';

      await loadSnapScript(clientKey, env);

      const snapWindow = (window as Window & {
        snap?: {
          pay: (token: string, options: {
            onSuccess:    (result: unknown) => void;
            onPending:    (result: unknown) => void;
            onError:      (result: unknown) => void;
            onClose:      () => void;
          }) => void;
        };
      });

      if (!snapWindow.snap) {
        // Fallback: redirect ke snap_url
        window.location.href = data.snap_url;
        return;
      }

      snapWindow.snap.pay(data.snap_token, {
        onSuccess: () => { setStep('success'); },
        onPending: () => { setStep('paying');  }, // Pembayaran pending (transfer bank dll)
        onError:   () => { setStep('failed');  },
        onClose:   () => {
          // User nutup popup sebelum selesai — redirect ke halaman status
          window.location.href = `/booking/status?booking_id=${data.booking_id}`;
        },
      });

    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  }, [form, selectedDate, selectedSlot, selectedCourt]);

  if (!isOpen) return null;

  // ── Overlay ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[95dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#52B788]/20"
        style={{ background: '#0D2B1C' }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#52B788]/15"
          style={{ background: '#0D2B1C' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center text-sm flex-shrink-0">🏸</div>
            <div>
              <h2 className="font-bold text-white font-display text-sm leading-tight">Booking Lapangan</h2>
              <p className="text-[#74C69D]/50 text-xs">{courtName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#74C69D]/40 hover:text-[#74C69D] hover:bg-[#52B788]/10 transition-colors text-lg"
          >✕</button>
        </div>

        {/* ── Info slot ────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-[#52B788]/10">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#74C69D]/50 text-base">📅</span>
              <span className="font-medium text-white">{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#74C69D]/50 text-base">⏰</span>
              <span className="font-medium text-white">
                {selectedSlot} – {endTime} WIB
                <span className="text-[#74C69D]/50 ml-1">({form.duration_hours} jam)</span>
              </span>
            </div>
            {selectedCourt && (
              <div className="flex items-center gap-2">
                <span className="text-[#74C69D]/50 text-base">🏟️</span>
                <span className="text-white">{selectedCourt.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── STEP: FORM ───────────────────────────────────────────────────── */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Durasi */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-2">
                Durasi *
                <span className="ml-1 font-normal text-[#74C69D]/35">(maks {maxDuration} jam)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: maxDuration }, (_, i) => i + 1).map(d => (
                  <button
                    key={d} type="button"
                    onClick={() => setForm(f => ({ ...f, duration_hours: d }))}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.duration_hours === d
                        ? 'bg-[#40916C] border-[#40916C] text-white shadow-lg shadow-[#40916C]/20'
                        : 'border-[#52B788]/20 text-[#74C69D]/60 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                    }`}
                  >
                    {d} jam
                    <span className={`block text-[10px] font-normal mt-0.5 ${form.duration_hours === d ? 'text-white/70' : 'text-[#74C69D]/30'}`}>
                      {selectedSlot}–{`${(parseInt(selectedSlot)+d).toString().padStart(2,'0')}:00`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nama */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-1.5">Nama Lengkap *</label>
              <input
                type="text" required value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 text-sm transition-all"
              />
            </div>

            {/* Nomor HP */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-1.5">Nomor WhatsApp *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74C69D]/40 text-sm font-medium">🇮🇩</span>
                <input
                  type="tel" required value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                  placeholder="081234567890"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 text-sm transition-all"
                />
              </div>
            </div>

            {/* Email (opsional) */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-1.5">
                Email <span className="font-normal text-[#74C69D]/35">(opsional, untuk struk)</span>
              </label>
              <input
                type="email" value={form.customer_email}
                onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                placeholder="email@contoh.com"
                className="w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 text-sm transition-all"
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-1.5">
                Catatan <span className="font-normal text-[#74C69D]/35">(opsional)</span>
              </label>
              <textarea
                rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Kebutuhan khusus, dll..."
                className="w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 text-sm transition-all resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span>{error}
              </div>
            )}

            {/* Price summary */}
            <div className="p-4 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#74C69D]/60">
                  {form.duration_hours} jam × Rp {activePrice.toLocaleString('id')}
                </span>
                <span className="font-bold text-white text-base">
                  Rp {totalAmount.toLocaleString('id')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#74C69D]/40">
                <span>💳 Kartu Kredit</span>
                <span>🏦 Transfer Bank</span>
                <span>💚 GoPay</span>
                <span>📱 QRIS</span>
                <span>+lainnya</span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#40916C]/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Memproses...</>
              ) : (
                <>Lanjut ke Pembayaran → Rp {totalAmount.toLocaleString('id')}</>
              )}
            </button>

            <p className="text-center text-[10px] text-[#74C69D]/30">
              Pembayaran diproses aman oleh Midtrans 🔒
            </p>
          </form>
        )}

        {/* ── STEP: PAYING (menunggu popup Snap / transfer) ─────────────────── */}
        {step === 'paying' && paymentData && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
              ⏳
            </div>
            <h3 className="font-bold text-white font-display text-lg">Menunggu Pembayaran</h3>
            <p className="text-[#74C69D]/60 text-sm leading-relaxed">
              Selesaikan pembayaran di halaman Midtrans yang muncul.<br/>
              Booking akan dikonfirmasi otomatis setelah pembayaran berhasil.
            </p>
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/8 text-sm text-amber-400">
              <div className="font-bold mb-1">Total: Rp {paymentData.amount.toLocaleString('id')}</div>
              <div className="text-xs text-amber-400/60">
                Berlaku hingga:{' '}
                {new Date(paymentData.expiry_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={paymentData.snap_url}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm text-center transition-all"
              >
                Buka Halaman Bayar
              </a>
              <a
                href={`/booking/status?booking_id=${paymentData.booking_id}`}
                className="flex-1 py-3 rounded-xl border border-[#52B788]/30 text-[#74C69D] hover:bg-[#52B788]/10 font-bold text-sm text-center transition-all"
              >
                Cek Status
              </a>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ─────────────────────────────────────────────────── */}
        {step === 'success' && paymentData && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#52B788]/15 border border-[#52B788]/30 flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✅
            </div>
            <h3 className="font-bold text-white font-display text-xl">Pembayaran Berhasil!</h3>
            <p className="text-[#74C69D]/70 text-sm leading-relaxed">
              Booking lapangan Anda telah dikonfirmasi.<br/>
              Informasi booking dikirim ke WhatsApp Anda.
            </p>
            <div className="p-4 rounded-xl border border-[#52B788]/25 bg-[#52B788]/5 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#74C69D]/50">Tanggal</span>
                <span className="text-white font-medium">{dateLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#74C69D]/50">Jam</span>
                <span className="text-white font-medium">{selectedSlot} – {endTime} WIB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#74C69D]/50">Total Bayar</span>
                <span className="text-[#52B788] font-bold">Rp {paymentData.amount.toLocaleString('id')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`/booking/status?booking_id=${paymentData.booking_id}`}
                className="flex-1 py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm text-center transition-all"
              >
                Lihat Detail Booking
              </a>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-[#52B788]/30 text-[#74C69D] hover:bg-[#52B788]/10 font-bold text-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: FAILED ──────────────────────────────────────────────────── */}
        {step === 'failed' && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <h3 className="font-bold text-white font-display text-lg">Pembayaran Gagal</h3>
            <p className="text-[#74C69D]/60 text-sm">Transaksi gagal atau dibatalkan. Slot akan dibebaskan.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('form'); setError(''); }}
                className="flex-1 py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all"
              >
                Coba Lagi
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-[#52B788]/30 text-[#74C69D] hover:bg-[#52B788]/10 font-bold text-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
