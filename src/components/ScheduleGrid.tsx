'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format, addDays, isBefore, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Booking, Court, generateTimeSlots, isSlotBooked, formatTime, STATUS_CONFIG } from '@/types/booking';
import { CourtSettings } from '@/lib/config';

interface Props { settings: CourtSettings }

type RealtimeStatus = 'connecting' | 'live' | 'polling' | 'error';

export default function ScheduleGrid({ settings }: Props) {
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
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const timeSlots = generateTimeSlots(settings.opening_hour, settings.closing_hour);
  const waNumber  = settings.whatsapp_number;

  useEffect(() => { setIsMounted(true); }, []);

  // ── Load active courts ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCourts() {
      const { data } = await supabase
        .from('courts').select('*')
        .eq('is_active', true).order('name');
      const list = (data || []) as Court[];
      setCourts(list);
      // Auto-select first court
      if (list.length > 0) setSelectedCourtId(list[0].id);
      setCourtsLoading(false);
    }
    loadCourts();

    // Realtime: jika admin tambah/ubah lapangan, otomatis refresh
    const sub = supabase.channel('public-courts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courts' }, () => loadCourts())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // ── Fetch bookings per tanggal + lapangan ──────────────────────────────────
  const fetchBookings = useCallback(async (date: string, courtId: string | null, silent = false) => {
    if (!silent) setLoading(true);
    let q = supabase
      .from('bookings').select('*, court:courts(id,name,price_per_hour)')
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending'])
      .order('start_time', { ascending: true });

    // Filter by court jika ada lebih dari 1 lapangan
    if (courtId) q = q.eq('court_id', courtId);

    const { data, error } = await q;
    if (!error && data) {
      setBookings(data as Booking[]);
      setLastUpdated(new Date());
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    if (courtsLoading) return; // Tunggu courts selesai load
    fetchBookings(selectedDate, selectedCourtId);

    const channelName = `schedule-${selectedDate}-${selectedCourtId ?? 'all'}-${Date.now()}`;
    const sub = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, payload => {
        const rec = (payload.new || payload.old) as Record<string, string>;
        if (!rec?.booking_date || rec.booking_date === selectedDate) {
          fetchBookings(selectedDate, selectedCourtId, true);
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('live');
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        } else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) {
          setRealtimeStatus('polling');
          if (!pollingRef.current) {
            pollingRef.current = setInterval(() => fetchBookings(selectedDate, selectedCourtId, true), 10_000);
          }
        } else {
          setRealtimeStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(sub);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [selectedDate, selectedCourtId, courtsLoading, fetchBookings]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeCourt    = courts.find(c => c.id === selectedCourtId);
  // Harga: pakai harga lapangan spesifik jika ada, fallback ke settings global
  const pricePerHour   = activeCourt?.price_per_hour ?? settings.price_per_hour;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount   = bookings.filter(b => b.status === 'pending').length;
  const bookedSlots    = timeSlots.filter(slot => isSlotBooked(slot, bookings)).length;
  const availableSlots = timeSlots.length - bookedSlots;

  const windowDays = Math.max(settings.booking_window_days, 1);
  const dateOptions = Array.from({ length: windowDays }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      value:   format(date, 'yyyy-MM-dd'),
      label:   format(date, 'EEE', { locale: id }),
      dayNum:  format(date, 'd'),
      month:   format(date, 'MMM', { locale: id }),
      isToday: isToday(date),
    };
  });

  const makeWALink = (slot: string) => {
    const dateLabel   = format(new Date(selectedDate + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
    const courtLabel  = activeCourt ? `\n🏟️ Lapangan: ${activeCourt.name}` : '';
    const msg = `Halo, saya ingin booking lapangan badminton.\n\n📅 Tanggal: ${dateLabel}${courtLabel}\n⏰ Jam: ${formatTime(slot)} WIB\n\nApakah masih tersedia?`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  };

  const statusInd = {
    connecting: { dot: 'bg-yellow-400 animate-pulse', text: 'Menghubungkan...', color: 'text-yellow-600' },
    live:       { dot: 'bg-green-500 animate-pulse',  text: 'Live · Auto-update', color: 'text-green-600' },
    polling:    { dot: 'bg-blue-400 animate-pulse',   text: 'Auto-refresh 10 dtk', color: 'text-blue-600' },
    error:      { dot: 'bg-red-400',                  text: 'Offline', color: 'text-red-500' },
  }[realtimeStatus];

  return (
    <div className="w-full">

      {/* ── Realtime status ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${statusInd.dot}`}/>
          <span className={`text-xs font-medium ${statusInd.color}`}>{statusInd.text}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isMounted && lastUpdated && (
            <span suppressHydrationWarning>Update: {format(lastUpdated, 'HH:mm:ss')}</span>
          )}
          <button onClick={() => fetchBookings(selectedDate, selectedCourtId)}
            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-court-green-pale text-gray-500 hover:text-court-green transition-colors"
            title="Refresh manual">↻</button>
        </div>
      </div>

      {/* ── Court selector — hanya tampil jika ada > 1 lapangan aktif ── */}
      {!courtsLoading && courts.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pilih Lapangan</p>
          <div className="flex gap-2 flex-wrap">
            {courts.map(court => {
              const isSelected = selectedCourtId === court.id;
              return (
                <button
                  key={court.id}
                  onClick={() => {
                    setSelectedCourtId(court.id);
                    setSelectedBooking(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                    isSelected
                      ? 'bg-court-green border-court-green text-white shadow-court'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-court-green/40 hover:bg-court-green-pale'
                  }`}
                >
                  <span className="text-base">🏸</span>
                  <div className="text-left">
                    <div className="leading-tight">{court.name}</div>
                    <div className={`text-[11px] font-normal leading-tight ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      Rp {court.price_per_hour.toLocaleString('id')}/jam
                    </div>
                  </div>
                  {isSelected && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info lapangan terpilih */}
          {activeCourt?.description && (
            <p className="mt-2 text-xs text-gray-400 italic">{activeCourt.description}</p>
          )}
        </div>
      )}

      {/* ── Date selector ── */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {dateOptions.map(d => (
            <button key={d.value}
              onClick={() => { setSelectedDate(d.value); setSelectedBooking(null); }}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl transition-all duration-200 min-w-[60px] border-2 ${
                selectedDate === d.value
                  ? 'bg-court-green border-court-green text-white shadow-court'
                  : 'bg-white border-gray-100 text-gray-600 hover:border-court-green/30 hover:bg-court-green-pale'
              }`}>
              <span className={`text-xs font-medium uppercase tracking-wide ${selectedDate===d.value?'text-white/80':'text-gray-400'}`}>{d.label}</span>
              <span className="text-xl font-bold font-display leading-tight">{d.dayNum}</span>
              <span className={`text-xs ${selectedDate===d.value?'text-white/70':'text-gray-400'}`}>{d.month}</span>
              {d.isToday && <span className={`text-[10px] font-semibold mt-0.5 ${selectedDate===d.value?'text-white/90':'text-court-green'}`}>Hari ini</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label:'Tersedia',   value: availableSlots,         color:'text-court-green', bg:'bg-court-green-pale border-court-green/20' },
          { label:'Pending',    value: pendingCount   || '-',  color:'text-amber-600',   bg:'bg-amber-50 border-amber-200' },
          { label:'Terbooking', value: confirmedCount || '-',  color:'text-red-500',     bg:'bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center border ${s.bg}`}>
            <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className={`text-xs font-medium ${s.color} opacity-80`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Legend + harga lapangan terpilih ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-court-green/30 bg-court-green-pale/60 inline-block"/>Tersedia
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-court-shuttle/40 bg-court-shuttle/10 inline-block"/>Dikonfirmasi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border-2 border-amber-300/60 bg-amber-50 inline-block"/>Menunggu
        </span>
        <span className="ml-auto font-semibold text-court-green">
          Rp {pricePerHour.toLocaleString('id')}/jam
          {courts.length > 1 && activeCourt && (
            <span className="text-gray-400 font-normal ml-1">· {activeCourt.name}</span>
          )}
        </span>
      </div>

      {/* ── Time slots ── */}
      {loading || courtsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {Array.from({ length: settings.closing_hour - settings.opening_hour }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl"/>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {timeSlots.map(slot => {
            const booked = isSlotBooked(slot, bookings);
            const isPast = isBefore(new Date(`${selectedDate}T${slot}`), new Date());

            if (booked) {
              return (
                <button key={slot}
                  onClick={() => setSelectedBooking(selectedBooking?.id === booked.id ? null : booked)}
                  className={`time-slot ${booked.status==='pending'?'time-slot-pending':'time-slot-booked'} text-left px-3 py-2.5 hover:opacity-80 active:scale-95 transition-all`}>
                  <div className={`text-xs font-bold font-display ${booked.status==='pending'?'text-amber-700':'text-court-shuttle-dark'}`}>
                    {formatTime(slot)}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${booked.status==='pending'?'text-amber-600':'text-court-shuttle'}`}>
                    {booked.status==='pending'?'⏳ Menunggu':'✗ Terisi'}
                  </div>
                </button>
              );
            }

            if (isPast) {
              return (
                <div key={slot} className="time-slot time-slot-closed px-3 py-2.5">
                  <div className="text-xs font-bold text-gray-400 font-display">{formatTime(slot)}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Sudah lewat</div>
                </div>
              );
            }

            return (
              <a key={slot} href={makeWALink(slot)} target="_blank" rel="noopener noreferrer"
                className="time-slot time-slot-available px-3 py-2.5 group">
                <div className="text-xs font-bold text-court-green font-display">{formatTime(slot)}</div>
                <div className="text-[11px] text-court-green/70 mt-0.5 group-hover:text-court-green transition-colors">✓ Booking WA</div>
              </a>
            );
          })}
        </div>
      )}

      {/* ── Selected booking detail ── */}
      {selectedBooking && (
        <div className="mt-4 p-4 rounded-2xl border-2 border-court-shuttle/30 bg-court-shuttle/5 animate-fade-up">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-court-charcoal font-display">{selectedBooking.customer_name}</h3>
              <span className={`status-badge mt-1 ${STATUS_CONFIG[selectedBooking.status].bg} ${STATUS_CONFIG[selectedBooking.status].color} ${STATUS_CONFIG[selectedBooking.status].border}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block"/>
                {STATUS_CONFIG[selectedBooking.status].label}
              </span>
            </div>
            <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
          </div>
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>⏰</span>
              <span>{selectedBooking.start_time.slice(0,5)} – {selectedBooking.end_time.slice(0,5)} ({selectedBooking.duration_hours} jam)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span>Rp {(selectedBooking.duration_hours * pricePerHour).toLocaleString('id')}</span>
            </div>
            {selectedBooking.court && courts.length > 1 && (
              <div className="flex items-center gap-2">
                <span>🏟️</span>
                <span>{selectedBooking.court.name}</span>
              </div>
            )}
            {selectedBooking.notes && (
              <div className="flex items-start gap-2"><span>📝</span><span>{selectedBooking.notes}</span></div>
            )}
          </div>
        </div>
      )}

      {/* ── WA CTA ── */}
      <div className="mt-6 p-4 rounded-2xl bg-court-green text-white text-center">
        <p className="text-sm font-medium mb-3 text-white/90">
          Klik slot tersedia (✓) untuk booking via WhatsApp
          {activeCourt && courts.length > 1 && ` · ${activeCourt.name}`}
        </p>
        <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Halo, saya ingin booking lapangan badminton.${activeCourt && courts.length > 1 ? `\n🏟️ Lapangan: ${activeCourt.name}` : ''}\n\nMohon info ketersediaan jadwal.`
        )}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-court-green font-bold rounded-xl text-sm hover:bg-court-green-pale transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
          </svg>
          Chat WhatsApp Sekarang
        </a>
      </div>
    </div>
  );
}
