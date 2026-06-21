'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Court } from '@/types/booking';
import { CreatePaymentResponse } from '@/types/payment';

interface Props {
  isOpen: boolean; onClose: () => void;
  selectedDate: string; selectedSlot: string;
  selectedCourt: Court | null; pricePerHour: number;
  closingHour: number; openingHour: number; courtName: string;
}

// 'form'        → isi data booking
// 'redirecting' → booking berhasil dibuat, mengarahkan ke halaman bayar Midtrans
// 'failed'      → gagal membuat booking (bukan gagal bayar — itu ditangani Midtrans sendiri)
type Step = 'form' | 'redirecting' | 'failed';

const AUTO_REDIRECT_DELAY_MS = 1400; // beri waktu user baca konfirmasi sebelum redirect otomatis

export default function BookingModal({
  isOpen, onClose, selectedDate, selectedSlot,
  selectedCourt, pricePerHour, closingHour, openingHour, courtName,
}: Props) {
  const [step, setStep]       = useState<Step>('form');
  const [form, setForm]       = useState({ customer_name:'', customer_phone:'', customer_email:'', duration_hours:1, notes:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [countdown, setCountdown]     = useState(0);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxDuration = closingHour - parseInt(selectedSlot);
  const endHour     = parseInt(selectedSlot) + form.duration_hours;
  const endTime     = `${endHour.toString().padStart(2,'0')}:00`;
  const activePrice = selectedCourt?.price_per_hour ?? pricePerHour;
  const totalAmount = activePrice * form.duration_hours;
  const dateLabel   = selectedDate
    ? format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })
    : '';

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setStep('form'); setError(''); setPaymentData(null); setCountdown(0);
      setForm({ customer_name:'', customer_phone:'', customer_email:'', duration_hours:1, notes:'' });
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [isOpen, selectedSlot, selectedDate]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Redirect otomatis dengan countdown visual ──────────────────────────────
  // Kita TIDAK pakai snap.pay() popup sama sekali. Begitu booking berhasil
  // dibuat dan dapat snap_url, browser langsung diarahkan penuh ke halaman
  // pembayaran Midtrans. Ini jauh lebih reliable dibanding popup karena:
  // - tidak bergantung script pihak ketiga yang harus selesai load duluan
  // - tidak ada konflik z-index/CSS
  // - tidak bisa diblokir ad-blocker
  // - identik di semua browser & device (termasuk mobile)
  useEffect(() => {
    if (step !== 'redirecting' || !paymentData) return;

    const totalSeconds = Math.ceil(AUTO_REDIRECT_DELAY_MS / 1000);
    setCountdown(totalSeconds);

    const interval = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1));
    }, 1000);

    redirectTimerRef.current = setTimeout(() => {
      window.location.href = paymentData.snap_url;
    }, AUTO_REDIRECT_DELAY_MS);

    return () => {
      clearInterval(interval);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [step, paymentData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.customer_name.trim())  { setError('Nama wajib diisi'); return; }
    if (!form.customer_phone.trim()) { setError('Nomor HP wajib diisi'); return; }
    if (form.customer_phone.trim().length < 9) { setError('Nomor HP tidak valid'); return; }
    setLoading(true);

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:  form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          customer_email: form.customer_email.trim() || undefined,
          booking_date:   selectedDate, start_time: selectedSlot,
          duration_hours: form.duration_hours, court_id: selectedCourt?.id,
          notes: form.notes.trim() || undefined,
        }),
      });

      const raw = await res.text();
      let data: CreatePaymentResponse & { error?: string };
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        console.error('[BookingModal] Response bukan JSON valid:', raw.slice(0, 300));
        setError(`Server mengembalikan respons tidak valid (status ${res.status}). Coba lagi.`);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? `Gagal membuat booking (status ${res.status})`);
        setLoading(false);
        return;
      }

      // Simpan nomor HP terakhir dipakai supaya gampang dicek lagi di /cek-booking
      try { localStorage.setItem('last_booking_phone', form.customer_phone.trim()); } catch {}

      setPaymentData(data);
      setLoading(false);
      setStep('redirecting');

    } catch (err) {
      console.error(err);
      setStep('form');
      setError('Gagal terhubung ke server. Cek koneksi internet Anda dan coba lagi.');
      setLoading(false);
    }
  }, [form, selectedDate, selectedSlot, selectedCourt]);

  const handleManualRedirect = () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    if (paymentData) window.location.href = paymentData.snap_url;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (step === 'form' && e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg max-h-[95dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-[#52B788]/20"
        style={{ background: '#0D2B1C' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#52B788]/15" style={{ background: '#0D2B1C' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center text-sm flex-shrink-0">🏸</div>
            <div>
              <h2 className="font-bold text-white font-display text-sm leading-tight">Booking Lapangan</h2>
              <p className="text-[#74C69D]/50 text-xs">{courtName}</p>
            </div>
          </div>
          {step === 'form' && (
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#74C69D]/40 hover:text-[#74C69D] hover:bg-[#52B788]/10 transition-colors text-lg">✕</button>
          )}
        </div>

        {/* Info slot */}
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

        {/* STEP: FORM */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {/* Durasi */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-2">
                Durasi * <span className="font-normal text-[#74C69D]/35">(maks {maxDuration} jam)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: maxDuration }, (_, i) => i + 1).map(d => (
                  <button key={d} type="button" onClick={() => setForm(f => ({ ...f, duration_hours: d }))}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.duration_hours === d
                        ? 'bg-[#40916C] border-[#40916C] text-white shadow-lg shadow-[#40916C]/20'
                        : 'border-[#52B788]/20 text-[#74C69D]/60 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                    }`}>
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
              <p className="text-[10px] text-[#74C69D]/30 mt-1.5">
                Simpan nomor ini — dipakai untuk cek status booking nanti di halaman Cek Booking.
              </p>
            </div>

            {/* Email (opsional) */}
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-1.5">
                Email <span className="font-normal text-[#74C69D]/35">(opsional, untuk struk otomatis)</span>
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
                <span className="px-2 py-0.5 rounded-full border border-[#74C69D]/20 bg-[#74C69D]/5">📱 QRIS</span>
                <span className="px-2 py-0.5 rounded-full border border-[#74C69D]/20 bg-[#74C69D]/5">🧡 ShopeePay</span>
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
              Anda akan diarahkan ke halaman pembayaran resmi Midtrans 🔒
            </p>
          </form>
        )}

        {/* STEP: REDIRECTING — booking sukses, mengarahkan ke Midtrans */}
        {step === 'redirecting' && paymentData && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#52B788]/15 border border-[#52B788]/30 flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <h3 className="font-bold text-white font-display text-lg">Booking Berhasil Dibuat!</h3>
            <p className="text-[#74C69D]/60 text-sm leading-relaxed">
              Anda akan diarahkan ke halaman pembayaran Midtrans
              {countdown > 0 ? <> dalam <strong className="text-[#52B788]">{countdown} detik</strong>…</> : '…'}
            </p>

            <div className="p-4 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#74C69D]/50">Total Bayar</span>
                <span className="text-[#52B788] font-bold">Rp {paymentData.amount.toLocaleString('id')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#74C69D]/50">Berlaku Hingga</span>
                <span className="text-white font-medium">
                  {new Date(paymentData.expiry_time).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} WIB
                </span>
              </div>
            </div>

            {/* Progress bar visual */}
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[#40916C] transition-all"
                style={{
                  width: countdown > 0 ? `${100 - (countdown / Math.ceil(AUTO_REDIRECT_DELAY_MS/1000)) * 100}%` : '100%',
                  transitionDuration: '1s',
                }}
              />
            </div>

            {/* Tombol manual — selalu tampil, tidak perlu menunggu */}
            <button
              onClick={handleManualRedirect}
              className="w-full py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-[#40916C]/25"
            >
              💳 Buka Halaman Pembayaran Sekarang
            </button>

            <p className="text-[10px] text-[#74C69D]/30">
              Setelah membayar, Anda otomatis kembali ke halaman ini.<br/>
              Bisa juga cek status booking kapan saja di{' '}
              <a href="/cek-booking" className="text-[#52B788] underline">halaman Cek Booking</a>.
            </p>
          </div>
        )}

        {/* STEP: FAILED (gagal membuat booking, bukan gagal bayar) */}
        {step === 'failed' && (
          <div className="px-5 py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <h3 className="font-bold text-white font-display text-lg">Gagal Membuat Booking</h3>
            <p className="text-[#74C69D]/60 text-sm">{error || 'Terjadi kesalahan. Silakan coba lagi.'}</p>
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
