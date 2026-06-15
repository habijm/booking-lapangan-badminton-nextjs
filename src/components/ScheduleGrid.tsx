'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, isBefore, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Booking, Court, generateTimeSlots, isSlotBooked, formatTime } from '@/types/booking';
import { CourtSettings } from '@/lib/config';
import { BookingMode } from '@/types/payment';
import BookingModal from '@/components/public/BookingModal';

interface Props {
  settings:    CourtSettings;
  bookingMode: BookingMode;   // 'whatsapp' | 'direct'
}

type RealtimeStatus = 'connecting' | 'live' | 'polling' | 'error';

const SLOT_STYLES = {
  available: {
    wrapper: 'border-2 border-[#40916C] bg-gradient-to-br from-[#1a3d2b] to-[#0f2a1a] hover:from-[#1e4a32] hover:to-[#122f1d] cursor-pointer active:scale-95 transition-all duration-150 shadow-sm shadow-[#40916C]/20 group',
    time:     'text-[#74C69D] font-bold font-display',
    sub:      'text-[#52B788]/80 group-hover:text-[#74C69D] transition-colors',
    icon:     '✓',
    iconColor:'text-[#52B788]',
  },
  available_direct: {
    wrapper: 'border-2 border-[#40916C] bg-gradient-to-br from-[#1a3d2b] to-[#0f2a1a] hover:from-[#1e4a32] hover:to-[#122f1d] cursor-pointer active:scale-95 transition-all duration-150 shadow-sm shadow-[#40916C]/20 group',
    time:     'text-[#74C69D] font-bold font-display',
    sub:      'text-[#52B788]/80 group-hover:text-[#74C69D] transition-colors',
    icon:     '✓',
    iconColor:'text-[#52B788]',
  },
  confirmed: {
    wrapper: 'border-2 border-red-500/50 bg-gradient-to-br from-red-950/60 to-red-900/40 cursor-pointer active:scale-95 transition-all duration-150',
    time:     'text-red-300 font-bold font-display',
    sub:      'text-red-400/70',
    icon:     '✕',
    iconColor:'text-red-500',
  },
  pending: {
    wrapper: 'border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/60 to-amber-900/40 cursor-pointer active:scale-95 transition-all duration-150',
    time:     'text-amber-300 font-bold font-display',
    sub:      'text-amber-400/70',
    icon:     '⏳',
    iconColor:'text-amber-500',
  },
  past: {
    wrapper: 'border border-white/5 bg-white/[0.02] cursor-not-allowed opacity-40',
    time:     'text-white/25 font-display',
    sub:      'text-white/15',
    icon:     '–',
    iconColor:'text-white/10',
  },
  closed: {
    wrapper: 'border border-white/8 bg-white/[0.02] cursor-not-allowed',
    time:     'text-white/20 font-display',
    sub:      'text-white/10',
    icon:     '🚫',
    iconColor:'text-white/15',
  },
};

export default function ScheduleGrid({ settings, bookingMode }: Props) {
  const [selectedDate, setSelectedDate]       = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [courts, setCourts]                   = useState<Court[]>([]);
  const [bookings, setBookings]               = useState<Booking[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [courtsLoading, setCourtsLoading]     = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [realtimeStatus, setRealtimeStatus]   = useState<RealtimeStatus>('connecting');
  const [lastUpdated, setLastUpdated]         = useState<Date | null>(null);
  const [isMounted, setIsMounted]             = useState(false);

  // ── State untuk BookingModal (mode direct) ──────────────────────────────
  const [modalOpen, setModalOpen]           = useState(false);
  const [selectedSlot, setSelectedSlot]     = useState('');
  const [selectedCourt, setSelectedCourt]   = useState<Court | null>(null);

  const pollingRef  = useRef<NodeJS.Timeout | null>(null);
  const timeSlots   = generateTimeSlots(settings.opening_hour, settings.closing_hour);
  const waNumber    = settings.whatsapp_number;
  const closedDates = settings.closed_dates ?? [];
  const isDirectMode = bookingMode === 'direct';

  useEffect(() => { setIsMounted(true); }, []);

  const isDateClosed = closedDates.includes(selectedDate);

  // ── Load courts ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCourts() {
      const { data } = await supabase.from('courts').select('*').eq('is_active', true).order('name');
      const list = (data || []) as Court[];
      setCourts(list);
      if (list.length > 0) setSelectedCourtId(list[0].id);
      setCourtsLoading(false);
    }
    loadCourts();
    const sub = supabase.channel('public-courts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => loadCourts())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchBookings = useCallback(async (date: string, courtId: string | null, silent = false) => {
    if (!silent) setLoading(true);
    let q = supabase.from('bookings').select('*, court:courts(id,name,price_per_hour)')
      .eq('booking_date', date).in('status', ['confirmed', 'pending'])
      .order('start_time', { ascending: true });
    if (courtId) q = q.eq('court_id', courtId);
    const { data, error } = await q;
    if (!error && data) { setBookings(data as Booking[]); setLastUpdated(new Date()); }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    if (courtsLoading) return;
    fetchBookings(selectedDate, selectedCourtId);
    const sub = supabase.channel(`schedule-${selectedDate}-${selectedCourtId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const rec = (payload.new || payload.old) as Record<string, string>;
        if (!rec?.booking_date || rec.booking_date === selectedDate)
          fetchBookings(selectedDate, selectedCourtId, true);
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live');
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        } else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
          setRealtimeStatus('polling');
          if (!pollingRef.current)
            pollingRef.current = setInterval(() => fetchBookings(selectedDate, selectedCourtId, true), 10_000);
        } else { setRealtimeStatus('connecting'); }
      });
    return () => {
      supabase.removeChannel(sub);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [selectedDate, selectedCourtId, courtsLoading, fetchBookings]);

  const activeCourt    = courts.find(c => c.id === selectedCourtId) ?? null;
  const pricePerHour   = activeCourt?.price_per_hour ?? settings.price_per_hour;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const bookedSlots    = timeSlots.filter(slot => isSlotBooked(slot, bookings)).length;
  const availableSlots = timeSlots.length - bookedSlots;

  const windowDays  = Math.max(settings.booking_window_days, 1);
  const dateOptions = Array.from({ length: windowDays }, (_, i) => {
    const date    = addDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      value:    dateStr,
      label:    format(date, 'EEE', { locale: id }),
      dayNum:   format(date, 'd'),
      month:    format(date, 'MMM', { locale: id }),
      isToday:  isToday(date),
      isClosed: closedDates.includes(dateStr),
    };
  });

  // ── Handler klik slot tersedia ───────────────────────────────────────────
  const handleAvailableSlotClick = (slot: string) => {
    if (isDirectMode) {
      // Buka BookingModal untuk pembayaran online
      setSelectedSlot(slot);
      setSelectedCourt(activeCourt);
      setModalOpen(true);
    } else {
      // Buka WhatsApp seperti sebelumnya
      window.open(makeWALink(slot), '_blank');
    }
  };

  const makeWALink = (slot: string) => {
    const dateLabel  = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
    const courtLabel = activeCourt ? `\n🏟️ Lapangan: ${activeCourt.name}` : '';
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(
      `Halo, saya ingin booking lapangan badminton.\n\n📅 Tanggal: ${dateLabel}${courtLabel}\n⏰ Jam: ${formatTime(slot)} WIB\n\nApakah masih tersedia?`
    )}`;
  };

  const rtIndicator = {
    connecting: { dot: 'bg-yellow-400 animate-pulse', text: 'Menghubungkan...', color: 'text-yellow-400' },
    live:       { dot: 'bg-[#52B788] animate-pulse',  text: 'Live',             color: 'text-[#52B788]'  },
    polling:    { dot: 'bg-blue-400 animate-pulse',   text: 'Polling 10s',      color: 'text-blue-400'  },
    error:      { dot: 'bg-red-400',                  text: 'Offline',          color: 'text-red-400'   },
  }[realtimeStatus];

  return (
    <div className="w-full">

      {/* ── Realtime + refresh ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${rtIndicator.dot}`}/>
          <span className={`text-xs font-medium ${rtIndicator.color}`}>{rtIndicator.text}</span>
          {isMounted && lastUpdated && (
            <span suppressHydrationWarning className="text-[#74C69D]/30 text-xs">
              · {format(lastUpdated, 'HH:mm:ss')}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchBookings(selectedDate, selectedCourtId)}
          className="p-1.5 rounded-lg text-[#74C69D]/40 hover:text-[#74C69D] hover:bg-[#52B788]/10 transition-colors text-sm"
          title="Refresh"
        >↻</button>
      </div>

      {/* ── Court selector ── */}
      {!courtsLoading && courts.length > 1 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-[#74C69D]/40 uppercase tracking-widest mb-2">Pilih Lapangan</p>
          <div className="flex gap-2 flex-wrap">
            {courts.map(court => {
              const sel = selectedCourtId === court.id;
              return (
                <button key={court.id}
                  onClick={() => { setSelectedCourtId(court.id); setSelectedBooking(null); }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                    sel
                      ? 'bg-[#40916C] border-[#40916C] text-white shadow-lg shadow-[#40916C]/30'
                      : 'border-[#52B788]/20 text-[#74C69D]/60 hover:border-[#52B788]/50 hover:text-[#74C69D] hover:bg-[#52B788]/5'
                  }`}>
                  <span>🏸</span>
                  <div className="text-left">
                    <div className="leading-tight">{court.name}</div>
                    <div className={`text-[11px] font-normal ${sel ? 'text-white/70' : 'text-[#74C69D]/40'}`}>
                      Rp {court.price_per_hour.toLocaleString('id')}/jam
                    </div>
                  </div>
                  {sel && <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5">✓</span>}
                </button>
              );
            })}
          </div>
          {activeCourt?.description && (
            <p className="mt-2 text-xs text-[#74C69D]/40 italic">{activeCourt.description}</p>
          )}
        </div>
      )}

      {/* ── Date selector ── */}
      <div className="mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {dateOptions.map(d => (
            <button key={d.value}
              onClick={() => { setSelectedDate(d.value); setSelectedBooking(null); }}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl transition-all min-w-[58px] border-2 relative ${
                selectedDate === d.value
                  ? d.isClosed
                    ? 'bg-red-900/40 border-red-500/50 text-white'
                    : 'bg-[#40916C] border-[#40916C] text-white shadow-lg shadow-[#40916C]/30'
                  : d.isClosed
                    ? 'border-red-500/20 text-red-400/40 hover:border-red-500/40'
                    : 'border-[#52B788]/15 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D] hover:bg-[#52B788]/5'
              }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wide ${
                selectedDate === d.value ? (d.isClosed ? 'text-red-300/70' : 'text-white/70') : d.isClosed ? 'text-red-400/40' : 'text-[#74C69D]/30'
              }`}>{d.label}</span>
              <span className="text-xl font-bold font-display leading-tight">{d.dayNum}</span>
              <span className={`text-[10px] ${
                selectedDate === d.value ? (d.isClosed ? 'text-red-300/60' : 'text-white/60') : d.isClosed ? 'text-red-400/30' : 'text-[#74C69D]/30'
              }`}>{d.month}</span>
              {d.isToday && (
                <span className={`text-[9px] font-bold mt-0.5 ${
                  selectedDate === d.value ? 'text-white/90' : d.isClosed ? 'text-red-400/40' : 'text-[#52B788]'
                }`}>Hari ini</span>
              )}
              {d.isClosed && <span className="text-[8px] font-bold mt-0.5 text-red-400/70">TUTUP</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Closure banner ── */}
      {isDateClosed && (
        <div className="mb-5 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/60 to-red-900/40 p-6 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h3 className="font-bold text-white font-display text-lg mb-1">Lapangan Tutup</h3>
          <p className="text-red-300/70 text-sm">
            Lapangan tidak beroperasi pada{' '}
            <strong className="text-red-200">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id })}
            </strong>.
          </p>
          <p className="text-red-400/50 text-xs mt-2">
            Silakan pilih tanggal lain atau hubungi admin untuk informasi lebih lanjut.
          </p>
          <a
            href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin tanya tentang jadwal lapangan.')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95">
            💬 Hubungi Admin
          </a>
        </div>
      )}

      {/* ── Stats strip ── */}
      {!isDateClosed && (
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { label:'Tersedia',   value: availableSlots,        bg:'border-[#40916C]/50 bg-[#40916C]/10', val:'text-[#74C69D]', dot:'bg-[#40916C]' },
            { label:'Pending',    value: pendingCount   || '—', bg:'border-amber-500/40 bg-amber-500/8',  val:'text-amber-400', dot:'bg-amber-500' },
            { label:'Terbooking', value: confirmedCount || '—', bg:'border-red-500/40   bg-red-500/8',    val:'text-red-400',   dot:'bg-red-500'   },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center border-2 ${s.bg}`}>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${s.dot}`}/>
                <span className={`text-2xl font-bold font-display ${s.val}`}>{s.value}</span>
              </div>
              <div className={`text-[11px] font-semibold ${s.val} opacity-80`}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ── */}
      {!isDateClosed && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-5">
          {[
            { color:'bg-[#40916C]', border:'border-[#40916C]',    label: isDirectMode ? 'Tersedia — klik untuk bayar online' : 'Tersedia — klik untuk booking' },
            { color:'bg-red-500',   border:'border-red-500/50',   label: 'Sudah dipesan' },
            { color:'bg-amber-500', border:'border-amber-500/50', label: 'Menunggu konfirmasi' },
            { color:'bg-white/10',  border:'border-white/10',     label: 'Sudah lewat' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-[#74C69D]/50">
              <span className={`w-2.5 h-2.5 rounded-sm border ${l.border} ${l.color}`}/>
              {l.label}
            </span>
          ))}
          <span className="ml-auto text-xs font-bold text-[#52B788]">
            Rp {pricePerHour.toLocaleString('id')}/jam
            {courts.length > 1 && activeCourt && (
              <span className="text-[#74C69D]/40 font-normal ml-1">· {activeCourt.name}</span>
            )}
          </span>
        </div>
      )}

      {/* ── Time slots grid ── */}
      {!isDateClosed && (
        <>
          {loading || courtsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {Array.from({ length: settings.closing_hour - settings.opening_hour }).map((_, i) => (
                <div key={i} className="h-[72px] rounded-xl animate-pulse border border-[#52B788]/5"
                  style={{ background: 'rgba(82,183,136,0.04)' }}/>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {timeSlots.map(slot => {
                const booked = isSlotBooked(slot, bookings);
                const isPast = isBefore(new Date(`${selectedDate}T${slot}`), new Date());

                // ── Slot sudah dibooking ──────────────────────────────────
                if (booked) {
                  const isConfirmed = booked.status === 'confirmed';
                  const s = isConfirmed ? SLOT_STYLES.confirmed : SLOT_STYLES.pending;
                  return (
                    <button key={slot}
                      onClick={() => setSelectedBooking(selectedBooking?.id === booked.id ? null : booked)}
                      className={`rounded-xl px-3 py-2.5 text-left relative overflow-hidden ${s.wrapper}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${s.time}`}>{slot.slice(0,5)}</span>
                        <span className={`text-base leading-none ${s.iconColor}`}>{s.icon}</span>
                      </div>
                      <div className={`text-[10px] ${s.sub}`}>s/d {booked.end_time.slice(0,5)}</div>
                      <div className={`text-[10px] font-bold mt-1 ${s.sub}`}>
                        {isConfirmed ? 'TERISI' : 'PENDING'}
                      </div>
                      {selectedBooking?.id === booked.id && (
                        <div className="absolute inset-0 ring-2 ring-white/20 rounded-xl pointer-events-none"/>
                      )}
                    </button>
                  );
                }

                // ── Slot sudah lewat ──────────────────────────────────────
                if (isPast) {
                  const s = SLOT_STYLES.past;
                  return (
                    <div key={slot} className={`rounded-xl px-3 py-2.5 ${s.wrapper}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${s.time}`}>{slot.slice(0,5)}</span>
                        <span className={`text-sm ${s.iconColor}`}>{s.icon}</span>
                      </div>
                      <div className={`text-[10px] ${s.sub}`}>Sudah lewat</div>
                    </div>
                  );
                }

                // ── Slot tersedia ─────────────────────────────────────────
                const s = SLOT_STYLES.available;
                return (
                  <button key={slot}
                    onClick={() => handleAvailableSlotClick(slot)}
                    className={`rounded-xl px-3 py-2.5 text-left w-full ${s.wrapper}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs ${s.time}`}>{slot.slice(0,5)}</span>
                      <span className={`text-base leading-none ${s.iconColor} group-hover:scale-110 transition-transform`}>{s.icon}</span>
                    </div>
                    <div className={`text-[10px] ${s.sub}`}>
                      1–{Math.min(2, settings.closing_hour - parseInt(slot))} jam
                    </div>
                    <div className="text-[10px] font-bold text-[#52B788]/80 mt-1 group-hover:text-[#74C69D] transition-colors">
                      {isDirectMode ? 'BAYAR ONLINE' : 'BOOKING WA'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Detail booking yang diklik ── */}
          {selectedBooking && (
            <div className="mt-4 rounded-2xl border border-[#52B788]/20 p-4 animate-fade-up"
              style={{ background: 'rgba(13,43,28,0.95)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-white font-display">{selectedBooking.customer_name}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border mt-1 ${
                    selectedBooking.status === 'confirmed'
                      ? 'bg-[#52B788]/15 border-[#52B788]/30 text-[#74C69D]'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"/>
                    {selectedBooking.status === 'confirmed' ? 'Dikonfirmasi' : 'Menunggu Konfirmasi'}
                  </span>
                </div>
                <button onClick={() => setSelectedBooking(null)}
                  className="text-[#74C69D]/40 hover:text-[#74C69D] p-1 transition-colors">✕</button>
              </div>
              <div className="space-y-2 text-sm text-[#A8D5BC]/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">⏰</span>
                  <span>
                    <strong className="text-white">{selectedBooking.start_time.slice(0,5)}</strong>
                    {' – '}
                    <strong className="text-white">{selectedBooking.end_time.slice(0,5)}</strong>
                    {' '}({selectedBooking.duration_hours} jam)
                  </span>
                </div>
                {selectedBooking.court && courts.length > 1 && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🏟️</span>
                    <span>{selectedBooking.court.name}</span>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">📝</span>
                    <span className="text-[#74C69D]/60">{selectedBooking.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CTA — berubah sesuai mode ── */}
          <div className="mt-5 rounded-2xl border border-[#40916C]/40 p-5 text-center"
            style={{ background: 'linear-gradient(135deg, #0d2b1a 0%, #0d1f16 100%)' }}>
            {isDirectMode ? (
              /* Mode pembayaran online */
              <>
                <p className="text-sm font-medium text-[#A8D5BC]/80 mb-3">
                  Klik slot <span className="text-[#52B788] font-bold">hijau ✓</span> untuk booking & bayar langsung online
                  {activeCourt && courts.length > 1 && (
                    <span className="text-[#74C69D]/50"> · {activeCourt.name}</span>
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#40916C]/20 border border-[#40916C]/30 text-[#74C69D] text-sm">
                    💳 Kartu &nbsp;·&nbsp; 🏦 Transfer &nbsp;·&nbsp; 💚 GoPay &nbsp;·&nbsp; 📱 QRIS
                  </div>
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya butuh bantuan untuk booking lapangan.')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#52B788]/30 text-[#74C69D]/70 hover:text-[#74C69D] hover:border-[#52B788]/50 text-sm transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                    </svg>
                    Butuh bantuan?
                  </a>
                </div>
              </>
            ) : (
              /* Mode WhatsApp (sama seperti semula) */
              <>
                <p className="text-sm font-medium text-[#A8D5BC]/80 mb-3">
                  Klik slot <span className="text-[#52B788] font-bold">hijau ✓</span> untuk langsung booking via WhatsApp
                  {activeCourt && courts.length > 1 && (
                    <span className="text-[#74C69D]/50"> · {activeCourt.name}</span>
                  )}
                </p>
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                    `Halo, saya ingin booking lapangan badminton.${activeCourt && courts.length > 1 ? `\n🏟️ Lapangan: ${activeCourt.name}` : ''}\n\nMohon info ketersediaan jadwal.`
                  )}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#40916C] hover:bg-[#52B788] text-white font-bold rounded-xl text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-[#40916C]/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                  </svg>
                  Chat WhatsApp Sekarang
                </a>
              </>
            )}
          </div>
        </>
      )}

      {/* ── BookingModal — hanya render di mode direct ── */}
      {isDirectMode && (
        <BookingModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          selectedCourt={selectedCourt}
          pricePerHour={pricePerHour}
          openingHour={settings.opening_hour}
          closingHour={settings.closing_hour}
          courtName={activeCourt?.name ?? settings.court_name}
        />
      )}
    </div>
  );
}
