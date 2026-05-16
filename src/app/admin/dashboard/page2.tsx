'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Booking, generateTimeSlots, isSlotBooked, formatTime, STATUS_CONFIG, OPENING_HOUR, CLOSING_HOUR } from '@/types/booking';

type TabView = 'schedule' | 'bookings' | 'add';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabView>('schedule');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add booking form state
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    duration_hours: 1 as 1 | 2,
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const timeSlots = generateTimeSlots();

  // Check auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/admin');
    });
  }, [router]);

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', date)
      .order('start_time', { ascending: true });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  }, []);

  const fetchAllBookings = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .gte('booking_date', today)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(50);
    setAllBookings((data || []) as Booking[]);
  }, []);

  useEffect(() => {
    fetchBookings(selectedDate);
    fetchAllBookings();

    const subscription = supabase
      .channel('admin-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings(selectedDate);
        fetchAllBookings();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [selectedDate, fetchBookings, fetchAllBookings]);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    setActionLoading(id + status);
    await supabase.from('bookings').update({ status }).eq('id', id);
    setActionLoading(null);
  };

  const deleteBooking = async (id: string) => {
    if (!confirm('Yakin hapus booking ini?')) return;
    setActionLoading(id + 'delete');
    await supabase.from('bookings').delete().eq('id', id);
    setActionLoading(null);
  };

  const handleAddBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validate no conflict
    const startH = parseInt(form.start_time.split(':')[0]);
    const endH = startH + form.duration_hours;
    
    if (endH > CLOSING_HOUR) {
      setFormError(`Jam berakhir (${endH}:00) melewati jam tutup (${CLOSING_HOUR}:00)`);
      return;
    }

    const endTime = `${endH.toString().padStart(2, '0')}:00`;

    // Check conflict
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', form.booking_date)
      .neq('status', 'cancelled')
      .or(`start_time.lt.${endTime},end_time.gt.${form.start_time}`);

    if (existing && existing.length > 0) {
      setFormError('Slot waktu tersebut sudah ada booking lain. Pilih waktu lain.');
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: endTime,
      duration_hours: form.duration_hours,
      notes: form.notes || null,
      status: 'confirmed',
    });

    if (error) {
      setFormError('Gagal menambah booking: ' + error.message);
    } else {
      setFormSuccess('Booking berhasil ditambahkan!');
      setForm({
        customer_name: '',
        customer_phone: '',
        booking_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '08:00',
        duration_hours: 1,
        notes: '',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  // Generate available start times (check availability)
  const bookedForForm = bookings.filter(b => b.booking_date === form.booking_date && b.status !== 'cancelled');
  const availableStartTimes = timeSlots.filter(slot => {
    const slotH = parseInt(slot.split(':')[0]);
    const endH = slotH + form.duration_hours;
    if (endH > CLOSING_HOUR) return false;
    const endTime = `${endH.toString().padStart(2, '0')}:00`;
    return !bookedForForm.some(b => b.start_time.slice(0,5) < endTime && b.end_time.slice(0,5) > slot);
  });

  // Date tabs
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE d MMM', { locale: id }),
    };
  });

  const pendingCount = allBookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen court-bg">
      {/* Admin navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-court-charcoal border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-court-green flex items-center justify-center">
                <span className="text-sm">🏸</span>
              </div>
              <div>
                <span className="text-white font-bold text-sm font-display">Admin Panel</span>
                <span className="text-white/40 text-xs ml-2 hidden sm:inline">Manajemen Booking</span>
              </div>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold animate-pulse-slow">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="text-white/60 hover:text-white text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-100 shadow-card mb-6 overflow-x-auto">
          {([
            { id: 'schedule', label: '📅 Jadwal', desc: 'Grid jadwal' },
            { id: 'bookings', label: `📋 Semua Booking${pendingCount > 0 ? ` (${pendingCount})` : ''}`, desc: 'Daftar booking' },
            { id: 'add', label: '➕ Tambah', desc: 'Booking baru' },
          ] as { id: TabView; label: string; desc: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                tab === t.id
                  ? 'bg-court-green text-white shadow-court'
                  : 'text-gray-500 hover:text-court-green hover:bg-court-green-pale'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SCHEDULE TAB */}
        {tab === 'schedule' && (
          <div className="animate-fade-up">
            {/* Date selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
              {dateOptions.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDate(d.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    selectedDate === d.value
                      ? 'bg-court-green border-court-green text-white'
                      : 'bg-white border-gray-100 text-gray-600 hover:border-court-green/30'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="booking-card overflow-hidden">
              {/* Schedule header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-court-charcoal font-display">
                    {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: id })}
                  </h2>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span className="text-court-green font-medium">{bookings.filter(b=>b.status!=='cancelled').length} booking</span>
                    <span>{bookings.filter(b=>b.status==='pending').length} pending</span>
                    <span>{bookings.filter(b=>b.status==='confirmed').length} confirmed</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 14 }).map((_,i) => <div key={i} className="skeleton h-16" />)}
                </div>
              ) : (
                <div className="p-5">
                  {/* Time slots grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {timeSlots.map((slot) => {
                      const booked = isSlotBooked(slot, bookings);
                      const slotBookings = bookings.filter(b => {
                        const s = b.start_time.slice(0,5);
                        const e = b.end_time.slice(0,5);
                        return slot >= s && slot < e && b.status !== 'cancelled';
                      });
                      const booking = slotBookings[0];

                      if (booking) {
                        const cfg = STATUS_CONFIG[booking.status];
                        return (
                          <div
                            key={slot}
                            className={`rounded-xl border-2 px-3 py-2.5 ${cfg.bg} ${cfg.border}`}
                          >
                            <div className={`text-xs font-bold font-display ${cfg.color}`}>{formatTime(slot)}</div>
                            <div className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{booking.customer_name}</div>
                            <div className={`text-[10px] mt-0.5 ${cfg.color}`}>{cfg.label}</div>
                            {booking.status === 'pending' && (
                              <div className="flex gap-1 mt-2">
                                <button
                                  onClick={() => updateStatus(booking.id, 'confirmed')}
                                  disabled={actionLoading === booking.id + 'confirmed'}
                                  className="flex-1 py-1 text-[10px] font-bold bg-court-green text-white rounded-md hover:bg-court-green-light disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === booking.id + 'confirmed' ? '...' : '✓ OK'}
                                </button>
                                <button
                                  onClick={() => updateStatus(booking.id, 'cancelled')}
                                  disabled={actionLoading === booking.id + 'cancelled'}
                                  className="flex-1 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === booking.id + 'cancelled' ? '...' : '✕ Tolak'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={slot} className="rounded-xl border-2 border-court-green/20 bg-court-green-pale/60 px-3 py-2.5">
                          <div className="text-xs font-bold text-court-green font-display">{formatTime(slot)}</div>
                          <div className="text-[11px] text-court-green/60 mt-0.5">Kosong</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOOKINGS LIST TAB */}
        {tab === 'bookings' && (
          <div className="animate-fade-up space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-court-charcoal font-display">Semua Booking Mendatang</h2>
              <span className="text-sm text-gray-500">{allBookings.length} booking</span>
            </div>

            {allBookings.length === 0 ? (
              <div className="booking-card p-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-500">Belum ada booking</p>
              </div>
            ) : (
              allBookings.map((booking) => {
                const cfg = STATUS_CONFIG[booking.status];
                return (
                  <div key={booking.id} className={`booking-card p-4 border-l-4 ${booking.status === 'pending' ? 'border-l-amber-400' : booking.status === 'confirmed' ? 'border-l-court-green' : 'border-l-red-300'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-court-charcoal font-display">{booking.customer_name}</h3>
                          <span className={`status-badge ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            {format(new Date(booking.booking_date), 'EEE, d MMM yyyy', { locale: id })}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>⏰</span>
                            {booking.start_time.slice(0,5)} – {booking.end_time.slice(0,5)}
                          </span>
                          <a
                            href={`https://wa.me/${booking.customer_phone.replace(/^0/, '62').replace(/^\+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-court-green hover:underline font-medium"
                          >
                            <span>📱</span>
                            {booking.customer_phone}
                          </a>
                        </div>
                        {booking.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">📝 {booking.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="btn-confirm text-xs px-3 py-1.5"
                          >
                            {actionLoading === booking.id + 'confirmed' ? '...' : '✓ Konfirmasi'}
                          </button>
                        )}
                        {booking.status !== 'cancelled' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                            disabled={!!actionLoading}
                            className="btn-danger text-xs px-3 py-1.5"
                          >
                            {actionLoading === booking.id + 'cancelled' ? '...' : '✕ Batalkan'}
                          </button>
                        )}
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          disabled={!!actionLoading}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus permanen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ADD BOOKING TAB */}
        {tab === 'add' && (
          <div className="animate-fade-up max-w-lg">
            <div className="booking-card p-5 sm:p-6">
              <h2 className="font-bold text-court-charcoal font-display text-lg mb-5">Tambah Booking Manual</h2>

              <form onSubmit={handleAddBooking} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Nama Customer *</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                      className="form-input"
                      placeholder="Budi Santoso"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">No. WhatsApp *</label>
                    <input
                      type="tel"
                      value={form.customer_phone}
                      onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                      className="form-input"
                      placeholder="081234567890"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Tanggal *</label>
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={e => setForm(f => ({ ...f, booking_date: e.target.value, start_time: '08:00' }))}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="form-input"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Jam Mulai *</label>
                    <select
                      value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="form-input"
                      required
                    >
                      {timeSlots.filter(slot => {
                        const h = parseInt(slot.split(':')[0]);
                        return h + form.duration_hours <= CLOSING_HOUR;
                      }).map(slot => (
                        <option
                          key={slot}
                          value={slot}
                          disabled={!availableStartTimes.includes(slot)}
                        >
                          {formatTime(slot)}{!availableStartTimes.includes(slot) ? ' (terisi)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Durasi *</label>
                    <select
                      value={form.duration_hours}
                      onChange={e => setForm(f => ({ ...f, duration_hours: parseInt(e.target.value) as 1 | 2 }))}
                      className="form-input"
                    >
                      <option value={1}>1 Jam</option>
                      <option value={2}>2 Jam</option>
                    </select>
                  </div>
                </div>

                {/* Time preview */}
                {form.start_time && (
                  <div className="p-3 rounded-xl bg-court-green-pale border border-court-green/20 text-sm text-court-green">
                    ⏰ Booking: <strong>{formatTime(form.start_time)}</strong> – <strong>{formatTime(`${(parseInt(form.start_time) + form.duration_hours).toString().padStart(2,'0')}:00`)}</strong>
                    <span className="text-court-green/70 ml-2">({form.duration_hours} jam)</span>
                  </div>
                )}

                <div>
                  <label className="form-label">Catatan (opsional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="form-input resize-none"
                    rows={2}
                    placeholder="Catatan tambahan..."
                  />
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                    <span>⚠️</span> {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 rounded-xl bg-court-green-pale border border-court-green/20 text-court-green text-sm flex items-center gap-2 animate-fade-up">
                    <span>✅</span> {formSuccess}
                  </div>
                )}

                <button type="submit" className="btn-primary w-full">
                  Tambah Booking (Confirmed)
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
