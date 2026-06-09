'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Court, Booking, generateTimeSlots, formatTime } from '@/types/booking';

interface Props {
  courts: Court[];
  openingHour: number;
  closingHour: number;
  onSuccess?: () => void;
}

export function AddBookingForm({ courts, openingHour, closingHour, onSuccess }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    customer_name:  '',
    customer_phone: '',
    booking_date:   today,
    start_time:     `${openingHour.toString().padStart(2, '0')}:00`,
    duration_hours: 1,
    notes:          '',
    court_id:       courts.find(c => c.is_active)?.id ?? '',
  });

  // Existing bookings for selected date/court — used for smart slot detection
  const [existingBookings, setExistingBookings] = useState<{ start_time: string; end_time: string }[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // Fetch bookings whenever date or court changes
  useEffect(() => {
    async function load() {
      setFetchingSlots(true);
      let q = supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('booking_date', form.booking_date)
        .neq('status', 'cancelled');
      if (form.court_id) q = q.eq('court_id', form.court_id);
      const { data } = await q;
      setExistingBookings(
        (data || []).map(b => ({
          start_time: b.start_time.slice(0, 5),
          end_time:   b.end_time.slice(0, 5),
        }))
      );
      setFetchingSlots(false);
    }
    load();
  }, [form.booking_date, form.court_id]);

  const allSlots   = generateTimeSlots(openingHour, closingHour);
  const isToday    = form.booking_date === today;
  const nowHour    = new Date().getHours();

  /** True if hour `h` overlaps with any existing booking */
  const isHourBooked = (h: number): boolean => {
    const slot = `${h.toString().padStart(2, '0')}:00`;
    return existingBookings.some(b => slot >= b.start_time && slot < b.end_time);
  };

  /** Start times that are actually selectable */
  const availableStarts = useMemo(() => {
    return allSlots.filter(slot => {
      const h = parseInt(slot);
      if (isToday && h <= nowHour) return false;   // hide past hours on today
      if (h + 1 > closingHour)    return false;    // need at least 1 hr before closing
      if (isHourBooked(h))        return false;    // slot itself is occupied
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, isToday, nowHour, existingBookings, closingHour]);

  /** Max consecutive hours available from the chosen start */
  const maxDuration = useMemo(() => {
    const startH = parseInt(form.start_time);
    let max = closingHour - startH;
    for (let h = startH + 1; h < closingHour; h++) {
      if (isHourBooked(h)) { max = h - startH; break; }
    }
    return Math.max(1, max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_time, existingBookings, closingHour]);

  // Auto-reset start if it's no longer valid after date/court change
  useEffect(() => {
    if (availableStarts.length > 0 && !availableStarts.includes(form.start_time)) {
      setForm(f => ({ ...f, start_time: availableStarts[0], duration_hours: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStarts.join(',')]);

  // Cap duration if max shrunk
  useEffect(() => {
    if (form.duration_hours > maxDuration) {
      setForm(f => ({ ...f, duration_hours: maxDuration }));
    }
  }, [maxDuration, form.duration_hours]);

  const handleDateChange = (date: string) => {
    setForm(f => ({
      ...f,
      booking_date:   date,
      start_time:     `${openingHour.toString().padStart(2, '0')}:00`,
      duration_hours: 1,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);

    const startH = parseInt(form.start_time);
    const endH   = startH + form.duration_hours;
    if (endH > closingHour) {
      setError(`Jam selesai (${endH}:00) melewati jam tutup (${closingHour}:00)`);
      setSaving(false); return;
    }

    const endTime = `${endH.toString().padStart(2, '0')}:00`;

    // Server-side conflict check (guards against race conditions)
    let q = supabase.from('bookings').select('id')
      .eq('booking_date', form.booking_date)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', form.start_time);
    if (form.court_id) q = q.eq('court_id', form.court_id);

    const { data: conflicts } = await q;
    if (conflicts && conflicts.length > 0) {
      setError('Slot waktu tersebut sudah ada booking lain. Silakan pilih waktu lain.');
      setSaving(false); return;
    }

    const { error: err } = await supabase.from('bookings').insert({
      customer_name:  form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      booking_date:   form.booking_date,
      start_time:     form.start_time,
      end_time:       endTime,
      duration_hours: form.duration_hours,
      notes:          form.notes.trim() || null,
      court_id:       form.court_id || null,
      status:         'confirmed',
    });

    setSaving(false);
    if (err) { setError('Gagal menyimpan: ' + err.message); return; }

    setSuccess('✅ Booking berhasil ditambahkan!');
    setForm(f => ({ ...f, customer_name: '', customer_phone: '', notes: '' }));
    onSuccess?.();
  };

  // Styles
  const inputCls = [
    'w-full px-4 py-2.5 rounded-xl border text-white text-sm transition-all',
    'border-[#52B788]/20 bg-[#52B788]/5',
    'placeholder:text-[#74C69D]/25',
    'focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/8',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  const selectCls = `${inputCls} bg-[#0D1F16] cursor-pointer`;
  const labelCls  = 'block text-xs font-semibold text-[#74C69D]/70 mb-1.5';

  const activeCourt   = courts.find(c => c.id === form.court_id);
  const startH        = parseInt(form.start_time);
  const endH          = startH + form.duration_hours;
  const endDisplay    = `${endH.toString().padStart(2, '0')}:00`;

  return (
    <div className="rounded-2xl border border-[#52B788]/15 p-5 sm:p-6"
      style={{ background: 'rgba(255,255,255,0.04)' }}>

      <div className="mb-5">
        <h2 className="font-bold text-white font-display text-lg">➕ Tambah Booking Manual</h2>
        <p className="text-[#74C69D]/50 text-xs mt-1">Booking langsung terkonfirmasi tanpa perlu approval</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Lapangan — only if multiple */}
        {courts.length > 1 && (
          <div>
            <label className={labelCls}>Lapangan *</label>
            <select
              value={form.court_id}
              onChange={e => setForm(f => ({ ...f, court_id: e.target.value }))}
              className={selectCls}
              style={{ colorScheme: 'dark' }}
              required
            >
              {courts.filter(c => c.is_active).map(c => (
                <option key={c.id} value={c.id} style={{ background: '#0D1F16', color: 'white' }}>
                  {c.name} — Rp {c.price_per_hour.toLocaleString('id')}/jam
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Name + phone */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nama Customer *</label>
            <input
              type="text" required
              value={form.customer_name}
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              className={inputCls} placeholder="Budi Santoso"
            />
          </div>
          <div>
            <label className={labelCls}>No. WhatsApp *</label>
            <input
              type="tel" required
              value={form.customer_phone}
              onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
              className={inputCls} placeholder="081234567890"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className={labelCls}>Tanggal *</label>
          <input
            type="date" required
            value={form.booking_date}
            min={today}
            onChange={e => handleDateChange(e.target.value)}
            className={`${inputCls} bg-[#0D1F16]`}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* Start time + duration */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Jam Mulai */}
          <div>
            <label className={labelCls}>
              Jam Mulai *
              {isToday && (
                <span className="ml-1 text-[#74C69D]/35 font-normal">(jam lalu disembunyikan)</span>
              )}
            </label>

            {fetchingSlots ? (
              <div className="px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin inline-block"/>
                <span className="text-[#74C69D]/40 text-sm">Memuat slot...</span>
              </div>
            ) : availableStarts.length === 0 ? (
              <div className="px-4 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 text-amber-400 text-sm">
                ⚠️ Tidak ada slot tersedia pada tanggal ini
              </div>
            ) : (
              <select
                value={form.start_time}
                required
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value, duration_hours: 1 }))}
                className={selectCls}
                style={{ colorScheme: 'dark' }}
              >
                {availableStarts.map(slot => (
                  <option key={slot} value={slot} style={{ background: '#0D1F16', color: 'white' }}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Durasi */}
          <div>
            <label className={labelCls}>
              Durasi *
              {maxDuration > 1 && (
                <span className="ml-1 text-[#74C69D]/35 font-normal">(maks {maxDuration} jam)</span>
              )}
            </label>
            <select
              value={form.duration_hours}
              onChange={e => setForm(f => ({ ...f, duration_hours: parseInt(e.target.value) }))}
              className={selectCls}
              style={{ colorScheme: 'dark' }}
              disabled={availableStarts.length === 0 || fetchingSlots}
            >
              {Array.from({ length: maxDuration }, (_, i) => {
                const d    = i + 1;
                const endH = startH + d;
                return (
                  <option key={d} value={d} style={{ background: '#0D1F16', color: 'white' }}>
                    {d} jam — s/d {endH.toString().padStart(2, '0')}:00
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Preview pill */}
        {availableStarts.length > 0 && !fetchingSlots && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-sm">
            <span className="text-[#74C69D]">
              ⏰&nbsp;
              <strong className="text-white">{formatTime(form.start_time)}</strong>
              {' – '}
              <strong className="text-white">{formatTime(endDisplay)}</strong>
              <span className="text-[#74C69D]/50 ml-2">({form.duration_hours} jam)</span>
            </span>
            {activeCourt && (
              <span className="text-[#52B788] font-bold text-xs shrink-0 ml-2">
                Rp {(activeCourt.price_per_hour * form.duration_hours).toLocaleString('id')}
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className={labelCls}>Catatan (opsional)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className={`${inputCls} resize-none`}
            placeholder="Catatan tambahan..."
          />
        </div>

        {/* Feedback */}
        {error   && <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-sm">⚠️ {error}</div>}
        {success && <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/8 text-[#74C69D] text-sm animate-fade-up">{success}</div>}

        <button
          type="submit"
          disabled={saving || availableStarts.length === 0 || fetchingSlots}
          className="w-full py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm
            transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-[#40916C]/20 flex items-center justify-center gap-2"
        >
          {saving
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Menyimpan...</>
            : '+ Tambah Booking (Confirmed)'}
        </button>
      </form>
    </div>
  );
}
