'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Court, generateTimeSlots, formatTime } from '@/types/booking';

interface Props {
  courts: Court[];
  openingHour: number;
  closingHour: number;
  onSuccess?: () => void;
}

export function AddBookingForm({ courts, openingHour, closingHour, onSuccess }: Props) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: `${openingHour.toString().padStart(2,'0')}:00`,
    duration_hours: 1 as 1 | 2 | 3,
    notes: '',
    court_id: courts.find(c => c.is_active)?.id ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const timeSlots = generateTimeSlots(openingHour, closingHour);
  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
    placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 focus:bg-[#52B788]/8
    transition-all text-sm disabled:opacity-50`;
  const labelClass = "block text-xs font-semibold text-[#74C69D]/70 mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    const startH = parseInt(form.start_time.split(':')[0]);
    const endH   = startH + form.duration_hours;

    if (endH > closingHour) {
      setError(`Jam selesai (${endH}:00) melewati jam tutup (${closingHour}:00)`);
      setLoading(false); return;
    }

    const endTime = `${endH.toString().padStart(2,'0')}:00`;

    // Conflict check
    let q = supabase.from('bookings').select('id')
      .eq('booking_date', form.booking_date)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', form.start_time);
    if (form.court_id) q = q.eq('court_id', form.court_id);

    const { data: existing } = await q;
    if (existing && existing.length > 0) {
      setError('Slot waktu tersebut sudah ada booking lain.'); setLoading(false); return;
    }

    const { error: err } = await supabase.from('bookings').insert({
      customer_name:  form.customer_name,
      customer_phone: form.customer_phone,
      booking_date:   form.booking_date,
      start_time:     form.start_time,
      end_time:       endTime,
      duration_hours: form.duration_hours,
      notes:          form.notes || null,
      court_id:       form.court_id || null,
      status:         'confirmed',
    });

    setLoading(false);
    if (err) { setError('Gagal: ' + err.message); return; }

    setSuccess('Booking berhasil ditambahkan!');
    setForm(f => ({
      ...f,
      customer_name: '',
      customer_phone: '',
      notes: '',
      start_time: `${openingHour.toString().padStart(2,'0')}:00`,
    }));
    onSuccess?.();
  };

  const selectedCourt = courts.find(c => c.id === form.court_id);
  const endH = parseInt(form.start_time.split(':')[0]) + form.duration_hours;
  const endTimeDisplay = `${endH.toString().padStart(2,'0')}:00`;

  return (
    <div className="rounded-2xl border border-[#52B788]/15 p-5 sm:p-6"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="mb-5">
        <h2 className="font-bold text-white font-display text-lg">➕ Tambah Booking Manual</h2>
        <p className="text-[#74C69D]/50 text-xs mt-1">Booking langsung terkonfirmasi tanpa perlu approval</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Lapangan — hanya tampil jika lebih dari 1 */}
        {courts.length > 1 && (
          <div>
            <label className={labelClass}>Lapangan *</label>
            <select value={form.court_id}
              onChange={e => setForm(f => ({...f, court_id: e.target.value}))}
              className={inputClass + " bg-[#0D1F16]"} required>
              {courts.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id}>{c.name} — Rp {c.price_per_hour.toLocaleString('id')}/jam</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nama Customer *</label>
            <input type="text" value={form.customer_name} required
              onChange={e => setForm(f => ({...f, customer_name: e.target.value}))}
              className={inputClass} placeholder="Budi Santoso"/>
          </div>
          <div>
            <label className={labelClass}>No. WhatsApp *</label>
            <input type="tel" value={form.customer_phone} required
              onChange={e => setForm(f => ({...f, customer_phone: e.target.value}))}
              className={inputClass} placeholder="081234567890"/>
          </div>
        </div>

        <div>
          <label className={labelClass}>Tanggal *</label>
          <input type="date" value={form.booking_date} required
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setForm(f => ({...f, booking_date: e.target.value}))}
            className={inputClass + " bg-[#0D1F16]"}/>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Jam Mulai *</label>
            <select value={form.start_time} required
              onChange={e => setForm(f => ({...f, start_time: e.target.value}))}
              className={inputClass + " bg-[#0D1F16]"}>
              {timeSlots
                .filter(slot => parseInt(slot) + form.duration_hours <= closingHour)
                .map(slot => (
                  <option key={slot} value={slot}>{formatTime(slot)}</option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Durasi *</label>
            <select value={form.duration_hours}
              onChange={e => setForm(f => ({...f, duration_hours: parseInt(e.target.value) as 1|2|3}))}
              className={inputClass + " bg-[#0D1F16]"}>
              {[1, 2, 3].map(d => <option key={d} value={d}>{d} Jam</option>)}
            </select>
          </div>
        </div>

        {/* Time + price preview */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-sm">
          <span className="text-[#74C69D]">
            ⏰ <strong className="text-white">{formatTime(form.start_time)}</strong>
            {' '}–{' '}
            <strong className="text-white">{formatTime(endTimeDisplay)}</strong>
            <span className="text-[#74C69D]/50 ml-2">({form.duration_hours} jam)</span>
          </span>
          {selectedCourt && (
            <span className="text-[#52B788] font-bold text-xs">
              Rp {(selectedCourt.price_per_hour * form.duration_hours).toLocaleString('id')}
            </span>
          )}
        </div>

        <div>
          <label className={labelClass}>Catatan (opsional)</label>
          <textarea value={form.notes} rows={2}
            onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            className={inputClass + " resize-none"}
            placeholder="Catatan tambahan..."/>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/8 text-[#74C69D] text-sm animate-fade-up">
            ✅ {success}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm
            transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-[#40916C]/20 flex items-center justify-center gap-2">
          {loading
            ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
            : '+ Tambah Booking (Confirmed)'}
        </button>
      </form>
    </div>
  );
}
