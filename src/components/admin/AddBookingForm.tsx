'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Court, generateTimeSlots, formatTime } from '@/types/booking';

interface Props {
  courts: Court[];
  openingHour: number;
  closingHour: number;
  courtName?: string; // Nama GOR untuk WA notifikasi
  onSuccess?: () => void;
}

type SuccessState = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  amount: number;
  courtName: string;
};

export function AddBookingForm({ courts, openingHour, closingHour, courtName = 'GOR Badminton', onSuccess }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    customer_name:  '',
    customer_phone: '',
    customer_email: '',
    booking_date:   today,
    start_time:     `${openingHour.toString().padStart(2, '0')}:00`,
    duration_hours: 1,
    notes:          '',
    court_id:       courts.find(c => c.is_active)?.id ?? '',
  });

  const [existingBookings, setExistingBookings] = useState<{ start_time: string; end_time: string }[]>([]);
  const [fetchingSlots, setFetchingSlots]       = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [successData, setSuccessData] = useState<SuccessState | null>(null);
  const [notifSent, setNotifSent]     = useState(false);
  const [emailSent, setEmailSent]     = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setFetchingSlots(true);
      let q = supabase.from('bookings').select('start_time, end_time')
        .eq('booking_date', form.booking_date).neq('status', 'cancelled');
      if (form.court_id) q = q.eq('court_id', form.court_id);
      const { data } = await q;
      setExistingBookings((data || []).map(b => ({ start_time: b.start_time.slice(0,5), end_time: b.end_time.slice(0,5) })));
      setFetchingSlots(false);
    }
    load();
  }, [form.booking_date, form.court_id]);

  const allSlots   = generateTimeSlots(openingHour, closingHour);
  const isToday    = form.booking_date === today;
  const nowHour    = new Date().getHours();

  const isHourBooked = (h: number) => {
    const slot = `${h.toString().padStart(2,'0')}:00`;
    return existingBookings.some(b => slot >= b.start_time && slot < b.end_time);
  };

  const availableStarts = useMemo(() => {
    return allSlots.filter(slot => {
      const h = parseInt(slot);
      if (isToday && h <= nowHour)   return false;
      if (h + 1 > closingHour)       return false;
      if (isHourBooked(h))           return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, isToday, nowHour, existingBookings, closingHour]);

  const maxDuration = useMemo(() => {
    const startH = parseInt(form.start_time);
    let max = closingHour - startH;
    for (let h = startH + 1; h < closingHour; h++) {
      if (isHourBooked(h)) { max = h - startH; break; }
    }
    return Math.max(1, max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_time, existingBookings, closingHour]);

  useEffect(() => {
    if (availableStarts.length > 0 && !availableStarts.includes(form.start_time)) {
      setForm(f => ({ ...f, start_time: availableStarts[0], duration_hours: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStarts.join(',')]);

  useEffect(() => {
    if (form.duration_hours > maxDuration) setForm(f => ({ ...f, duration_hours: maxDuration }));
  }, [maxDuration, form.duration_hours]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSaving(true);

    const startH = parseInt(form.start_time);
    const endH   = startH + form.duration_hours;
    if (endH > closingHour) { setError(`Jam selesai (${endH}:00) melewati jam tutup (${closingHour}:00)`); setSaving(false); return; }
    const endTime = `${endH.toString().padStart(2,'0')}:00`;

    let q = supabase.from('bookings').select('id')
      .eq('booking_date', form.booking_date).neq('status', 'cancelled')
      .lt('start_time', endTime).gt('end_time', form.start_time);
    if (form.court_id) q = q.eq('court_id', form.court_id);
    const { data: conflicts } = await q;
    if (conflicts && conflicts.length > 0) {
      setError('Slot waktu tersebut sudah ada booking lain. Silakan pilih waktu lain.');
      setSaving(false); return;
    }

    const activeCourt  = courts.find(c => c.id === form.court_id);
    const pricePerHour = activeCourt?.price_per_hour ?? 0;
    const amount       = pricePerHour * form.duration_hours;

    const { data: newBooking, error: err } = await supabase.from('bookings').insert({
      customer_name:  form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email.trim() || null,
      booking_date:   form.booking_date,
      start_time:     form.start_time,
      end_time:       endTime,
      duration_hours: form.duration_hours,
      notes:          form.notes.trim() || null,
      court_id:       form.court_id || null,
      status:         'confirmed',
      booking_source: 'admin',
      payment_status: 'unpaid',
      amount,
    }).select('id').single();

    setSaving(false);
    if (err || !newBooking) { setError('Gagal menyimpan: ' + (err?.message ?? '')); return; }

    setSuccessData({
      bookingId:     newBooking.id,
      customerName:  form.customer_name.trim(),
      customerPhone: form.customer_phone.trim(),
      customerEmail: form.customer_email.trim(),
      bookingDate:   form.booking_date,
      startTime:     form.start_time,
      endTime,
      durationHours: form.duration_hours,
      amount,
      courtName:     activeCourt?.name ?? courtName,
    });
    setNotifSent(false); setEmailSent(false);
    onSuccess?.();
  };

  // Kirim notifikasi WA via Fonnte
  const handleSendWA = async () => {
    if (!successData) return;
    setNotifLoading(true);
    try {
      await fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: successData.bookingId, type: 'confirmed' }),
      });
      setNotifSent(true);
    } catch { /* ignore */ }
    setNotifLoading(false);
  };

  // Kirim email konfirmasi booking
  const handleSendEmail = async () => {
    if (!successData?.customerEmail) return;
    setEmailLoading(true);
    try {
      const res = await fetch('/api/booking/notify-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: successData.bookingId }),
      });
      if (res.ok) setEmailSent(true);
    } catch { /* ignore */ }
    setEmailLoading(false);
  };

  const handleReset = () => {
    setSuccessData(null);
    setForm(f => ({ ...f, customer_name:'', customer_phone:'', customer_email:'', notes:'' }));
  };

  const inputCls  = 'w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white text-sm placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/8 disabled:opacity-50 transition-all';
  const selectCls = `${inputCls} bg-[#0D1F16] cursor-pointer`;
  const labelCls  = 'block text-xs font-semibold text-[#74C69D]/70 mb-1.5';

  const activeCourt   = courts.find(c => c.id === form.court_id);
  const startH        = parseInt(form.start_time);
  const endH          = startH + form.duration_hours;
  const endDisplay    = `${endH.toString().padStart(2,'0')}:00`;

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  if (successData) {
    const dateLabel = format(new Date(successData.bookingDate + 'T00:00:00'), 'EEE, d MMMM yyyy', { locale: id });
    return (
      <div className="rounded-2xl border border-[#52B788]/20 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {/* Header success */}
        <div className="px-5 py-4 border-b border-[#52B788]/15 bg-[#52B788]/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#40916C] flex items-center justify-center text-xl">✅</div>
            <div>
              <h2 className="font-bold text-white font-display">Booking Berhasil Dibuat!</h2>
              <p className="text-[#74C69D]/50 text-xs">Status: <strong className="text-[#52B788]">Dikonfirmasi</strong></p>
            </div>
          </div>
        </div>

        {/* Detail booking */}
        <div className="px-5 py-4 space-y-2.5 text-sm border-b border-[#52B788]/10">
          {[
            { label:'👤 Customer', value: successData.customerName },
            { label:'📱 WhatsApp', value: successData.customerPhone },
            ...(successData.customerEmail ? [{ label:'✉️ Email', value: successData.customerEmail }] : []),
            { label:'📅 Tanggal',  value: dateLabel },
            { label:'⏰ Jam',      value: `${successData.startTime} – ${successData.endTime} WIB (${successData.durationHours} jam)` },
            { label:'🏟️ Lapangan', value: successData.courtName },
            ...(successData.amount ? [{ label:'💰 Harga', value: `Rp ${successData.amount.toLocaleString('id')}` }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-3">
              <span className="text-[#74C69D]/50 flex-shrink-0 text-xs">{label}</span>
              <span className="text-white text-xs font-medium text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Opsi notifikasi */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-[10px] font-bold text-[#74C69D]/40 uppercase tracking-wide">Kirim Konfirmasi ke Customer</p>

          {/* WA Notifikasi */}
          <button onClick={handleSendWA} disabled={notifLoading || notifSent}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
              notifSent
                ? 'bg-[#25D366]/15 border border-[#25D366]/30 text-[#4ADE80] cursor-default'
                : 'bg-[#25D366]/15 border border-[#25D366]/25 text-[#4ADE80] hover:bg-[#25D366]/25 active:scale-95'
            } disabled:opacity-60`}>
            {notifLoading
              ? <><span className="w-3.5 h-3.5 border-2 border-[#4ADE80]/30 border-t-[#4ADE80] rounded-full animate-spin"/>Mengirim WA...</>
              : notifSent
                ? <>✅ WA Terkirim</>
                : <>💬 Kirim Notifikasi WhatsApp</>}
          </button>

          {/* Email konfirmasi — hanya jika ada email */}
          {successData.customerEmail ? (
            <button onClick={handleSendEmail} disabled={emailLoading || emailSent}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                emailSent
                  ? 'bg-[#52B788]/15 border border-[#52B788]/30 text-[#74C69D] cursor-default'
                  : 'bg-[#52B788]/8 border border-[#52B788]/20 text-[#74C69D]/70 hover:bg-[#52B788]/15 hover:text-[#74C69D] active:scale-95'
              } disabled:opacity-60`}>
              {emailLoading
                ? <><span className="w-3.5 h-3.5 border-2 border-[#74C69D]/30 border-t-[#74C69D] rounded-full animate-spin"/>Mengirim Email...</>
                : emailSent
                  ? <>✅ Email Konfirmasi Terkirim</>
                  : <>✉️ Kirim Email ke {successData.customerEmail}</>}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/8 bg-white/3 text-white/25 text-xs">
              ✉️ Email tidak diisi — tidak bisa kirim konfirmasi email
            </div>
          )}

          {/* Tambah booking baru */}
          <button onClick={handleReset}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40 text-sm transition-all">
            ➕ Tambah Booking Baru
          </button>
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-[#52B788]/15 p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="mb-5">
        <h2 className="font-bold text-white font-display text-lg">➕ Tambah Booking Manual</h2>
        <p className="text-[#74C69D]/50 text-xs mt-1">Booking langsung terkonfirmasi • bisa kirim notifikasi WA / email ke customer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lapangan */}
        {courts.length > 1 && (
          <div>
            <label className={labelCls}>Lapangan *</label>
            <select value={form.court_id} onChange={e => setForm(f => ({ ...f, court_id: e.target.value }))}
              className={selectCls} style={{ colorScheme:'dark' }} required>
              {courts.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id} style={{ background:'#0D1F16', color:'white' }}>
                  {c.name} — Rp {c.price_per_hour.toLocaleString('id')}/jam
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nama + HP */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nama Customer *</label>
            <input type="text" required value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              className={inputCls} placeholder="Budi Santoso"/>
          </div>
          <div>
            <label className={labelCls}>No. WhatsApp *</label>
            <input type="tel" required value={form.customer_phone}
              onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
              className={inputCls} placeholder="081234567890"/>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className={labelCls}>
            Email Customer
            <span className="ml-1 font-normal text-[#74C69D]/30">(opsional — untuk kirim konfirmasi email)</span>
          </label>
          <input type="email" value={form.customer_email}
            onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
            className={inputCls} placeholder="customer@email.com"/>
        </div>

        {/* Tanggal */}
        <div>
          <label className={labelCls}>Tanggal *</label>
          <input type="date" required value={form.booking_date} min={today}
            onChange={e => setForm(f => ({ ...f, booking_date: e.target.value, start_time:`${openingHour.toString().padStart(2,'0')}:00`, duration_hours:1 }))}
            className={`${inputCls} bg-[#0D1F16]`} style={{ colorScheme:'dark' }}/>
        </div>

        {/* Jam + Durasi */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Jam Mulai *
              {isToday && <span className="ml-1 text-[#74C69D]/35 font-normal">(jam lewat disembunyikan)</span>}
            </label>
            {fetchingSlots ? (
              <div className="px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin"/>
                <span className="text-[#74C69D]/40 text-sm">Memuat slot...</span>
              </div>
            ) : availableStarts.length === 0 ? (
              <div className="px-4 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-400 text-sm">
                ⚠️ Tidak ada slot tersedia
              </div>
            ) : (
              <select value={form.start_time} required
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value, duration_hours:1 }))}
                className={selectCls} style={{ colorScheme:'dark' }}>
                {availableStarts.map(slot => (
                  <option key={slot} value={slot} style={{ background:'#0D1F16', color:'white' }}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className={labelCls}>
              Durasi * <span className="ml-1 text-[#74C69D]/35 font-normal">(maks {maxDuration} jam)</span>
            </label>
            <select value={form.duration_hours}
              onChange={e => setForm(f => ({ ...f, duration_hours: parseInt(e.target.value) }))}
              className={selectCls} style={{ colorScheme:'dark' }}
              disabled={availableStarts.length === 0 || fetchingSlots}>
              {Array.from({ length: maxDuration }, (_, i) => {
                const d = i + 1; const eH = startH + d;
                return <option key={d} value={d} style={{ background:'#0D1F16', color:'white' }}>
                  {d} jam — s/d {eH.toString().padStart(2,'0')}:00
                </option>;
              })}
            </select>
          </div>
        </div>

        {/* Preview */}
        {availableStarts.length > 0 && !fetchingSlots && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-sm">
            <span className="text-[#74C69D]">
              ⏰ <strong className="text-white">{formatTime(form.start_time)}</strong> – <strong className="text-white">{formatTime(endDisplay)}</strong>
              <span className="text-[#74C69D]/50 ml-2">({form.duration_hours} jam)</span>
            </span>
            {activeCourt && (
              <span className="text-[#52B788] font-bold text-xs shrink-0 ml-2">
                Rp {(activeCourt.price_per_hour * form.duration_hours).toLocaleString('id')}
              </span>
            )}
          </div>
        )}

        {/* Catatan */}
        <div>
          <label className={labelCls}>Catatan (opsional)</label>
          <textarea rows={2} value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className={`${inputCls} resize-none`} placeholder="Catatan tambahan..."/>
        </div>

        {error && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-sm">⚠️ {error}</div>}

        <button type="submit" disabled={saving || availableStarts.length === 0 || fetchingSlots}
          className="w-full py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#40916C]/20 flex items-center justify-center gap-2">
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Menyimpan...</>
            : '+ Tambah Booking (Confirmed)'}
        </button>
      </form>
    </div>
  );
}
