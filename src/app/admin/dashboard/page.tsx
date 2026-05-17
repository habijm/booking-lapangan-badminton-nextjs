'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  format, addDays, subDays, subMonths, subWeeks,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, parseISO,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import {
  Booking, generateTimeSlots, isSlotBooked, formatTime,
  STATUS_CONFIG, OPENING_HOUR, CLOSING_HOUR,
} from '@/types/booking';

type TabView = 'overview' | 'schedule' | 'bookings' | 'add';
type ChartPeriod = '7d' | '14d' | '30d' | '3m' | '6m' | 'custom';

// ─── Chart Components ─────────────────────────────────────────────────────────

function BarChart({
  data, maxVal, color = '#2D6A4F', showValue = false,
}: {
  data: { label: string; value: number; sublabel?: string }[];
  maxVal: number;
  color?: string;
  showValue?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-end gap-0.5 sm:gap-1 h-28 w-full relative">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 min-w-0 relative group"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Tooltip */}
          {hovered === i && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-court-charcoal text-white text-[10px] font-medium px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
              {d.sublabel || d.label}: <strong>{d.value}</strong>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-court-charcoal" />
            </div>
          )}
          <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
            <div
              className="w-full rounded-t-md transition-all duration-500 cursor-pointer"
              style={{
                height: maxVal > 0 ? `${Math.max(4, (d.value / maxVal) * 96)}px` : '4px',
                backgroundColor: d.value > 0 ? (hovered === i ? '#40916C' : color) : '#E5E7EB',
              }}
            />
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ confirmed, pending, cancelled }: {
  confirmed: number; pending: number; cancelled: number;
}) {
  const total = confirmed + pending + cancelled || 1;
  const r = 38; const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = [
    { value: confirmed, color: '#2D6A4F', label: 'Confirmed' },
    { value: pending,   color: '#F59E0B', label: 'Pending' },
    { value: cancelled, color: '#EF4444', label: 'Dibatalkan' },
  ].map(s => ({ ...s, dash: (s.value / total) * circ }));

  return (
    <div className="flex items-center gap-4">
      <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#F3F4F6" strokeWidth="13" />
        {segments.map((seg, i) => {
          const el = (
            <circle key={i} cx="46" cy="46" r={r} fill="none"
              stroke={seg.color} strokeWidth="13"
              strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 46 46)" />
          );
          offset += seg.dash; return el;
        })}
        <text x="46" y="42" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1B2028">{confirmed + pending}</text>
        <text x="46" y="56" textAnchor="middle" fontSize="9" fill="#9CA3AF">aktif</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-500 flex-1">{s.label}</span>
            <span className="text-xs font-bold text-gray-700">{s.value}</span>
            <span className="text-[10px] text-gray-400 w-8 text-right">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCalendar({ bookingsByDate, month }: {
  bookingsByDate: Record<string, number>; month: Date;
}) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDay = startOfMonth(month).getDay();
  const max = Math.max(...Object.values(bookingsByDate), 1);
  return (
    <div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['M','S','S','R','K','J','S'].map((d, i) => (
          <div key={i} className="text-[10px] text-gray-400 text-center font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const count = bookingsByDate[key] || 0;
          const intensity = count > 0 ? Math.max(0.18, count / max) : 0;
          const isToday = isSameDay(day, new Date());
          return (
            <div key={key} title={`${format(day, 'd MMM')}: ${count} booking`}
              className={`aspect-square rounded flex items-center justify-center text-[9px] font-medium ${isToday ? 'ring-2 ring-court-green ring-offset-1' : ''}`}
              style={{
                backgroundColor: count > 0 ? `rgba(45,106,79,${intensity})` : '#F9FAFB',
                color: intensity > 0.5 ? 'white' : '#6B7280',
              }}>
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeakHours(bookings: Booking[]) {
  const hourCount: Record<string, number> = {};
  for (let h = OPENING_HOUR; h < CLOSING_HOUR; h++) hourCount[`${h}`] = 0;
  bookings.filter(b => b.status === 'confirmed').forEach(b => {
    const s = parseInt(b.start_time.slice(0, 2));
    const e = parseInt(b.end_time.slice(0, 2));
    for (let h = s; h < e; h++) hourCount[`${h}`] = (hourCount[`${h}`] || 0) + 1;
  });
  return Object.entries(hourCount).map(([h, v]) => ({
    label: h, sublabel: `${h}:00–${parseInt(h)+1}:00`, value: v,
  }));
}

function formatRupiah(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  return `Rp ${(n / 1000).toFixed(0)}rb`;
}

// ─── Export utilities ─────────────────────────────────────────────────────────

function exportCSV(data: Booking[], filename: string) {
  const headers = ['No','Tanggal','Jam Mulai','Jam Selesai','Durasi (jam)','Nama Customer','No HP','Status','Catatan','Dibuat'];
  const rows = data.map((b, i) => [
    i + 1,
    b.booking_date,
    b.start_time.slice(0, 5),
    b.end_time.slice(0, 5),
    b.duration_hours,
    b.customer_name,
    b.customer_phone,
    b.status,
    b.notes || '',
    format(parseISO(b.created_at), 'dd/MM/yyyy HH:mm'),
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(data: Booking[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Period filter logic ──────────────────────────────────────────────────────

function getPeriodRange(period: ChartPeriod, customFrom: string, customTo: string) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  switch (period) {
    case '7d':     return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: todayStr };
    case '14d':    return { from: format(subDays(now, 13), 'yyyy-MM-dd'), to: todayStr };
    case '30d':    return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: todayStr };
    case '3m':     return { from: format(subMonths(now, 3), 'yyyy-MM-dd'), to: todayStr };
    case '6m':     return { from: format(subMonths(now, 6), 'yyyy-MM-dd'), to: todayStr };
    case 'custom': return { from: customFrom, to: customTo };
    default:       return { from: format(subDays(now, 13), 'yyyy-MM-dd'), to: todayStr };
  }
}

function buildDailyBarData(bookings: Booking[], from: string, to: string) {
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
  return days.map(day => {
    const key = format(day, 'yyyy-MM-dd');
    return {
      label: days.length <= 14 ? format(day, 'd/M') : days.length <= 31 ? format(day, 'd') : format(day, 'MMM'),
      sublabel: format(day, 'EEE, d MMM yyyy', { locale: id }),
      value: bookings.filter(b => b.booking_date === key && b.status === 'confirmed').length,
    };
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab]                 = useState<TabView>('overview');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Chart period filter
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('14d');
  const [customFrom, setCustomFrom]   = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [customTo, setCustomTo]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Export state
  const [exportDropdown, setExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Booking list filter
  type BookingFilter = 'upcoming' | 'all' | 'pending' | 'confirmed' | 'cancelled';
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('upcoming');
  const [searchQuery, setSearchQuery]     = useState('');

  // Add form
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00', duration_hours: 1 as 1 | 2, notes: '',
  });
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const timeSlots = generateTimeSlots();

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/admin');
    });
  }, [router]);

  const fetchBookings = useCallback(async (date: string) => {
    setLoading(true);
    const { data } = await supabase.from('bookings').select('*')
      .eq('booking_date', date).order('start_time', { ascending: true });
    setBookings((data || []) as Booking[]);
    setLoading(false);
  }, []);

  const fetchAllBookings = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: true })
      .limit(1000);
    setAllBookings((data || []) as Booking[]);
  }, []);

  useEffect(() => {
    fetchBookings(selectedDate);
    fetchAllBookings();
    const sub = supabase.channel('admin-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings(selectedDate); fetchAllBookings();
      }).subscribe();
    return () => { supabase.removeChannel(sub); };
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
    e.preventDefault(); setFormError(''); setFormSuccess('');
    const startH = parseInt(form.start_time.split(':')[0]);
    const endH   = startH + form.duration_hours;
    if (endH > CLOSING_HOUR) { setFormError(`Jam selesai (${endH}:00) melewati jam tutup`); return; }
    const endTime = `${endH.toString().padStart(2, '0')}:00`;
    const { data: existing } = await supabase.from('bookings').select('id')
      .eq('booking_date', form.booking_date).neq('status', 'cancelled')
      .lt('start_time', endTime).gt('end_time', form.start_time);
    if (existing && existing.length > 0) { setFormError('Slot waktu tersebut sudah ada booking lain.'); return; }
    const { error } = await supabase.from('bookings').insert({
      customer_name: form.customer_name, customer_phone: form.customer_phone,
      booking_date: form.booking_date, start_time: form.start_time,
      end_time: endTime, duration_hours: form.duration_hours,
      notes: form.notes || null, status: 'confirmed',
    });
    if (error) setFormError('Gagal: ' + error.message);
    else {
      setFormSuccess('Booking berhasil ditambahkan!');
      setForm({ customer_name: '', customer_phone: '', booking_date: format(new Date(), 'yyyy-MM-dd'), start_time: '08:00', duration_hours: 1, notes: '' });
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/admin'); };

  // ── Analytics ──────────────────────────────────────────────────────────────
  const today         = format(new Date(), 'yyyy-MM-dd');
  const thisMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const lastMonthEnd   = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

  const confirmed  = allBookings.filter(b => b.status === 'confirmed');
  const pending    = allBookings.filter(b => b.status === 'pending');
  const cancelled  = allBookings.filter(b => b.status === 'cancelled');

  const todayBookings     = confirmed.filter(b => b.booking_date === today);
  const tomorrowBookings  = confirmed.filter(b => b.booking_date === format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const thisMonthBookings = confirmed.filter(b => b.booking_date >= thisMonthStart && b.booking_date <= today);
  const lastMonthBookings = confirmed.filter(b => b.booking_date >= lastMonthStart && b.booking_date <= lastMonthEnd);

  const PRICE_PER_HOUR   = 30000;
  const thisMonthRevenue = thisMonthBookings.reduce((s, b) => s + b.duration_hours * PRICE_PER_HOUR, 0);
  const lastMonthRevenue = lastMonthBookings.reduce((s, b) => s + b.duration_hours * PRICE_PER_HOUR, 0);
  const revenueGrowth    = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;
  const bookingGrowth    = lastMonthBookings.length > 0 ? Math.round(((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100) : 0;

  // Period-filtered data
  const { from: periodFrom, to: periodTo } = getPeriodRange(chartPeriod, customFrom, customTo);
  const periodBookings = allBookings.filter(b => b.booking_date >= periodFrom && b.booking_date <= periodTo);
  const periodConfirmed = periodBookings.filter(b => b.status === 'confirmed');

  // Bar chart - daily trend
  const dailyBarData = buildDailyBarData(allBookings, periodFrom, periodTo);
  const maxDay = Math.max(...dailyBarData.map(d => d.value), 1);

  // Peak hours within period
  const peakHoursData = getPeakHours(periodBookings);
  const maxPeak = Math.max(...peakHoursData.map(d => d.value), 1);

  // DOW within period
  const dowLabels = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const dowData = dowLabels.map((label, dow) => ({
    label,
    value: periodConfirmed.filter(b => parseISO(b.booking_date).getDay() === dow).length,
  }));
  const maxDow = Math.max(...dowData.map(d => d.value), 1);

  // Calendar heatmap
  const bookingsByDate: Record<string, number> = {};
  confirmed.forEach(b => { bookingsByDate[b.booking_date] = (bookingsByDate[b.booking_date] || 0) + 1; });

  // Top customers within period
  const custMap: Record<string, { name: string; phone: string; count: number; hours: number }> = {};
  periodConfirmed.forEach(b => {
    if (!custMap[b.customer_phone]) custMap[b.customer_phone] = { name: b.customer_name, phone: b.customer_phone, count: 0, hours: 0 };
    custMap[b.customer_phone].count++;
    custMap[b.customer_phone].hours += b.duration_hours;
  });
  const topCustomers = Object.values(custMap).sort((a, b) => b.count - a.count).slice(0, 5);

  // Period revenue
  const periodRevenue = periodConfirmed.reduce((s, b) => s + b.duration_hours * PRICE_PER_HOUR, 0);
  const periodHours   = periodConfirmed.reduce((s, b) => s + b.duration_hours, 0);

  // Utilization today
  const totalOpHours  = CLOSING_HOUR - OPENING_HOUR;
  const todayHours    = todayBookings.reduce((s, b) => s + b.duration_hours, 0);
  const utilizationPct = Math.round((todayHours / totalOpHours) * 100);
  const upcomingToday  = confirmed.filter(b => b.booking_date === today).sort((a,b) => a.start_time.localeCompare(b.start_time));

  const pendingCount = pending.length;

  // ── Form helpers ──
  const bookedForForm = allBookings.filter(b => b.booking_date === form.booking_date && b.status !== 'cancelled');
  const isToday = form.booking_date === today;
  const currentHour = new Date().getHours();
  const availableStartTimes = timeSlots.filter(slot => {
    const slotH = parseInt(slot.split(':')[0]);
    const endH = slotH + form.duration_hours;
    if (endH > CLOSING_HOUR) return false;
    // Hide past slots when booking is for today
    if (isToday && slotH <= currentHour) return false;
    const endTime = `${endH.toString().padStart(2, '0')}:00`;
    return !bookedForForm.some(b => b.start_time.slice(0,5) < endTime && b.end_time.slice(0,5) > slot);
  });

  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return { value: format(date, 'yyyy-MM-dd'), label: format(date, 'EEE d MMM', { locale: id }) };
  });

  // ── Period label for display ──
  const periodLabel = {
    '7d': '7 Hari Terakhir', '14d': '14 Hari Terakhir', '30d': '30 Hari Terakhir',
    '3m': '3 Bulan Terakhir', '6m': '6 Bulan Terakhir',
    'custom': `${format(parseISO(periodFrom), 'd MMM yyyy', { locale: id })} – ${format(parseISO(periodTo), 'd MMM yyyy', { locale: id })}`,
  }[chartPeriod];

  // ── Export helpers ──
  const doExport = (type: 'csv-period' | 'csv-all' | 'csv-confirmed' | 'csv-pending' | 'json') => {
    setExportDropdown(false);
    const ts = format(new Date(), 'yyyyMMdd-HHmm');
    if (type === 'csv-period') {
      exportCSV(periodBookings.sort((a,b) => a.booking_date.localeCompare(b.booking_date)), `booking-${periodFrom}-${periodTo}_${ts}.csv`);
    } else if (type === 'csv-all') {
      exportCSV([...allBookings].sort((a,b) => a.booking_date.localeCompare(b.booking_date)), `booking-semua_${ts}.csv`);
    } else if (type === 'csv-confirmed') {
      exportCSV([...confirmed].sort((a,b) => a.booking_date.localeCompare(b.booking_date)), `booking-confirmed_${ts}.csv`);
    } else if (type === 'csv-pending') {
      exportCSV([...pending], `booking-pending_${ts}.csv`);
    } else if (type === 'json') {
      exportJSON([...allBookings].sort((a,b) => a.booking_date.localeCompare(b.booking_date)), `booking-semua_${ts}.json`);
    }
  };

  // ── Period filter pill UI ──
  const PeriodFilter = () => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400 font-medium">Periode:</span>
      <div className="flex gap-1 flex-wrap">
        {(['7d','14d','30d','3m','6m','custom'] as ChartPeriod[]).map(p => (
          <button key={p} onClick={() => { setChartPeriod(p); setShowCustomRange(p === 'custom'); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              chartPeriod === p ? 'bg-court-green text-white border-court-green' : 'bg-white text-gray-500 border-gray-200 hover:border-court-green/40'
            }`}>
            {{ '7d':'7H','14d':'14H','30d':'30H','3m':'3Bln','6m':'6Bln','custom':'Custom' }[p]}
          </button>
        ))}
      </div>
      {showCustomRange && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input type="date" value={customFrom} max={customTo}
            onChange={e => setCustomFrom(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-court-green" />
          <span className="text-gray-400 text-xs">–</span>
          <input type="date" value={customTo} min={customFrom} max={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => setCustomTo(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-court-green" />
        </div>
      )}
    </div>
  );

  // ── Export button ──
  const ExportButton = () => (
    <div className="relative" ref={exportRef}>
      <button onClick={() => setExportDropdown(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-court-green text-white text-xs font-bold rounded-lg hover:bg-court-green-light transition-colors shadow-sm">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Export
        <svg className={`w-3 h-3 transition-transform ${exportDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {exportDropdown && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-card-hover border border-gray-100 z-30 overflow-hidden animate-scale-in">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Export CSV</p>
          </div>
          {[
            { id: 'csv-period', label: `📅 Periode Aktif (${periodLabel})`, sub: `${periodBookings.length} data` },
            { id: 'csv-all',    label: '🗂 Semua Booking', sub: `${allBookings.length} data` },
            { id: 'csv-confirmed', label: '✅ Confirmed saja', sub: `${confirmed.length} data` },
            { id: 'csv-pending',   label: '⏳ Pending saja', sub: `${pending.length} data` },
          ].map(opt => (
            <button key={opt.id} onClick={() => doExport(opt.id as Parameters<typeof doExport>[0])}
              className="w-full text-left px-3 py-2.5 hover:bg-court-green-pale transition-colors">
              <div className="text-xs font-medium text-gray-700">{opt.label}</div>
              <div className="text-[10px] text-gray-400">{opt.sub}</div>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Export JSON</p>
          </div>
          <button onClick={() => doExport('json')}
            className="w-full text-left px-3 py-2.5 hover:bg-court-green-pale transition-colors">
            <div className="text-xs font-medium text-gray-700">{'{ } Semua Booking (JSON)'}</div>
            <div className="text-[10px] text-gray-400">{allBookings.length} data · untuk developer</div>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen court-bg">
      {/* Navbar */}
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
        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-100 shadow-card mb-6 overflow-x-auto">
          {([
            { id: 'overview', label: '📊 Dashboard' },
            { id: 'schedule', label: '📅 Jadwal' },
            { id: 'bookings', label: `📋 Booking${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id: 'add',      label: '➕ Tambah' },
          ] as { id: TabView; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-court-green text-white shadow-court' : 'text-gray-500 hover:text-court-green hover:bg-court-green-pale'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-5 animate-fade-up">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label:'Booking Hari Ini', value: todayBookings.length, sub:`${todayHours} jam terisi`, icon:'📅', accent:'bg-court-green text-white', badge: null },
                { label:'Bulan Ini', value: thisMonthBookings.length, sub:`vs ${lastMonthBookings.length} bln lalu`, icon:'📈', accent:'bg-blue-600 text-white',
                  badge: bookingGrowth !== 0 ? `${bookingGrowth > 0?'+':''}${bookingGrowth}%` : null, badgeColor: bookingGrowth >= 0 ? 'bg-white/20' : 'bg-red-400/30' },
                { label:'Est. Pendapatan', value: formatRupiah(thisMonthRevenue), sub:`vs ${formatRupiah(lastMonthRevenue)} bln lalu`, icon:'💰', accent:'bg-emerald-600 text-white',
                  badge: revenueGrowth !== 0 ? `${revenueGrowth > 0?'+':''}${revenueGrowth}%` : null, badgeColor: revenueGrowth >= 0 ? 'bg-white/20' : 'bg-red-400/30' },
                { label:'Pending', value: pendingCount, sub: pendingCount > 0 ? 'Perlu konfirmasi' : 'Semua terkonfirmasi', icon:'⏳',
                  accent: pendingCount > 0 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600', badge: null },
              ].map((card, i) => (
                <div key={i} className={`rounded-2xl p-4 ${card.accent} shadow-card`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl">{card.icon}</span>
                    {card.badge && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${(card as { badgeColor?: string }).badgeColor || 'bg-white/20'}`}>
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold font-display">{card.value}</div>
                  <div className="text-xs opacity-75 mt-0.5 font-medium">{card.label}</div>
                  <div className="text-[11px] opacity-60 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Utilization + donut + tomorrow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="booking-card p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Utilisasi Hari Ini</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-bold text-court-green font-display">{utilizationPct}%</span>
                  <span className="text-sm text-gray-400 mb-1">terisi</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                  <div className="bg-court-green h-3 rounded-full transition-all duration-700" style={{ width: `${utilizationPct}%` }} />
                </div>
                <div className="text-xs text-gray-400">{todayHours} / {totalOpHours} jam</div>
                {upcomingToday.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-400 uppercase">Jadwal hari ini</div>
                    {upcomingToday.slice(0, 4).map(b => (
                      <div key={b.id} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-court-green flex-shrink-0" />
                        <span className="font-medium text-gray-600">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</span>
                        <span className="text-gray-400 truncate">{b.customer_name}</span>
                      </div>
                    ))}
                    {upcomingToday.length > 4 && <div className="text-[11px] text-court-green">+{upcomingToday.length-4} lainnya</div>}
                  </div>
                )}
              </div>

              <div className="booking-card p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Status Booking (Semua)</h3>
                <DonutChart confirmed={confirmed.length} pending={pending.length} cancelled={cancelled.length} />
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                  {allBookings.length} booking total tercatat
                </div>
              </div>

              <div className="booking-card p-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                  Besok ({format(addDays(new Date(), 1), 'd MMM', { locale: id })})
                </h3>
                {tomorrowBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-gray-200">
                    <span className="text-3xl mb-1">📭</span>
                    <span className="text-xs text-gray-400">Belum ada booking</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tomorrowBookings.map(b => (
                      <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-court-green-pale border border-court-green/20">
                        <span className="text-court-green text-sm">⏰</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-court-green">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</div>
                          <div className="text-[11px] text-gray-500 truncate">{b.customer_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  {tomorrowBookings.reduce((s,b) => s + b.duration_hours, 0)} jam terbooking dari {totalOpHours} jam
                </div>
              </div>
            </div>

            {/* ── CHART SECTION with period filter + export ── */}
            <div className="booking-card p-5">
              {/* Chart toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-court-charcoal font-display text-sm">Analitik Booking</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{periodLabel} · {periodConfirmed.length} booking · {periodHours} jam · {formatRupiah(periodRevenue)}</p>
                </div>
                <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
                  <ExportButton />
                </div>
              </div>

              <div className="mb-4">
                <PeriodFilter />
              </div>

              {/* Period summary mini-cards */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { label: 'Total Booking', value: periodConfirmed.length, icon: '📋' },
                  { label: 'Total Jam', value: `${periodHours} jam`, icon: '⏱' },
                  { label: 'Est. Revenue', value: formatRupiah(periodRevenue), icon: '💰' },
                ].map((s, i) => (
                  <div key={i} className="bg-court-green-pale rounded-xl p-3 border border-court-green/20 text-center">
                    <div className="text-lg mb-0.5">{s.icon}</div>
                    <div className="font-bold text-court-green text-sm font-display">{s.value}</div>
                    <div className="text-[11px] text-court-green/70">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tren harian */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tren Booking Harian</h4>
                  <span className="text-[11px] text-gray-400">Rata-rata: {dailyBarData.length > 0 ? (dailyBarData.reduce((s,d)=>s+d.value,0)/dailyBarData.length).toFixed(1) : 0}/hari</span>
                </div>
                <BarChart data={dailyBarData} maxVal={maxDay} color="#2D6A4F" showValue />
              </div>

              {/* Peak hours + DOW side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Jam Tersibuk</h4>
                    <span className="text-[11px] text-gray-400">
                      Peak: {peakHoursData.reduce((a, b) => a.value >= b.value ? a : b, peakHoursData[0] || { label: '-', value: 0 }).label}:00
                    </span>
                  </div>
                  <BarChart data={peakHoursData} maxVal={maxPeak} color="#40916C" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Hari Tersibuk</h4>
                    <span className="text-[11px] text-gray-400">
                      Top: {dowData.reduce((a, b) => a.value >= b.value ? a : b, dowData[0] || { label: '-', value: 0 }).label}
                    </span>
                  </div>
                  <BarChart data={dowData} maxVal={maxDow} color="#74C69D" />
                </div>
              </div>
            </div>

            {/* Calendar heatmap + top customers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="booking-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Heatmap Kalender</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCalendarMonth(m => subMonths(m, 1))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 text-xs">‹</button>
                    <span className="text-xs font-medium text-gray-600 min-w-[80px] text-center">
                      {format(calendarMonth, 'MMM yyyy', { locale: id })}
                    </span>
                    <button onClick={() => setCalendarMonth(m => addDays(endOfMonth(m), 1))}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 text-xs">›</button>
                  </div>
                </div>
                <MiniCalendar bookingsByDate={bookingsByDate} month={calendarMonth} />
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
                  <span>Sedikit</span>
                  {[0.18,0.36,0.54,0.72,1].map(o => (
                    <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(45,106,79,${o})` }} />
                  ))}
                  <span>Banyak</span>
                </div>
              </div>

              <div className="booking-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pelanggan Terbanyak</h3>
                  <span className="text-[11px] text-gray-400">{periodLabel}</span>
                </div>
                {topCustomers.length === 0 ? (
                  <div className="text-center text-gray-300 py-8">
                    <div className="text-3xl mb-2">👤</div>
                    <div className="text-xs text-gray-400">Belum ada data</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topCustomers.map((c, i) => (
                      <div key={c.phone} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i===0?'bg-yellow-100 text-yellow-700':i===1?'bg-gray-100 text-gray-600':i===2?'bg-orange-100 text-orange-700':'bg-court-green-pale text-court-green'
                        }`}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-700 truncate">{c.name}</div>
                          <a href={`https://wa.me/${c.phone.replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-court-green hover:underline">{c.phone}</a>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-gray-700">{c.count}× booking</div>
                          <div className="text-[11px] text-gray-400">{c.hours} jam · {formatRupiah(c.hours * PRICE_PER_HOUR)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending alert */}
            {pendingCount > 0 && (
              <div className="booking-card p-4 border-l-4 border-l-amber-400 bg-amber-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="font-bold text-amber-800 font-display text-sm">{pendingCount} Booking Menunggu Konfirmasi</div>
                      <div className="text-xs text-amber-600 mt-0.5">Segera konfirmasi agar customer mendapat kepastian</div>
                    </div>
                  </div>
                  <button onClick={() => { setTab('bookings'); setBookingFilter('pending'); }}
                    className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
                    Lihat →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            SCHEDULE TAB
        ════════════════════════════════ */}
        {tab === 'schedule' && (
          <div className="animate-fade-up">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
              {dateOptions.map(d => (
                <button key={d.value} onClick={() => setSelectedDate(d.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    selectedDate === d.value ? 'bg-court-green border-court-green text-white' : 'bg-white border-gray-100 text-gray-600 hover:border-court-green/30'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="booking-card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-court-charcoal font-display">
                  {format(parseISO(selectedDate), 'EEEE, d MMMM yyyy', { locale: id })}
                </h2>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span className="text-court-green font-medium">{bookings.filter(b=>b.status!=='cancelled').length} booking</span>
                  <span>{bookings.filter(b=>b.status==='pending').length} pending</span>
                  <span>{bookings.filter(b=>b.status==='confirmed').length} confirmed</span>
                </div>
              </div>
              {loading ? (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({length:14}).map((_,i) => <div key={i} className="skeleton h-16"/>)}
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {timeSlots.map(slot => {
                      const booking = bookings.find(b => {
                        const s = b.start_time.slice(0,5), e = b.end_time.slice(0,5);
                        return slot >= s && slot < e && b.status !== 'cancelled';
                      });
                      if (booking) {
                        const cfg = STATUS_CONFIG[booking.status];
                        return (
                          <div key={slot} className={`rounded-xl border-2 px-3 py-2.5 ${cfg.bg} ${cfg.border}`}>
                            <div className={`text-xs font-bold font-display ${cfg.color}`}>{formatTime(slot)}</div>
                            <div className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{booking.customer_name}</div>
                            <div className={`text-[10px] mt-0.5 ${cfg.color}`}>{cfg.label}</div>
                            {booking.status === 'pending' && (
                              <div className="flex gap-1 mt-2">
                                <button onClick={() => updateStatus(booking.id,'confirmed')} disabled={actionLoading===booking.id+'confirmed'}
                                  className="flex-1 py-1 text-[10px] font-bold bg-court-green text-white rounded-md hover:bg-court-green-light disabled:opacity-50">
                                  {actionLoading===booking.id+'confirmed'?'...':'✓ OK'}
                                </button>
                                <button onClick={() => updateStatus(booking.id,'cancelled')} disabled={actionLoading===booking.id+'cancelled'}
                                  className="flex-1 py-1 text-[10px] font-bold bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50">
                                  {actionLoading===booking.id+'cancelled'?'...':'✕'}
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

        {/* ════════════════════════════════
            BOOKINGS LIST TAB
        ════════════════════════════════ */}
        {tab === 'bookings' && (() => {
          let filtered = allBookings;
          if (bookingFilter==='upcoming')  filtered = allBookings.filter(b => b.booking_date >= today && b.status !== 'cancelled');
          else if (bookingFilter==='pending')   filtered = allBookings.filter(b => b.status === 'pending');
          else if (bookingFilter==='confirmed') filtered = allBookings.filter(b => b.status === 'confirmed');
          else if (bookingFilter==='cancelled') filtered = allBookings.filter(b => b.status === 'cancelled');
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(b => b.customer_name.toLowerCase().includes(q) || b.customer_phone.includes(q));
          }
          filtered = [...filtered].sort((a, b) =>
            bookingFilter==='upcoming'
              ? a.booking_date < b.booking_date ? -1 : a.booking_date > b.booking_date ? 1 : a.start_time < b.start_time ? -1 : 1
              : a.booking_date > b.booking_date ? -1 : a.booking_date < b.booking_date ? 1 : a.start_time < b.start_time ? -1 : 1
          );
          const filterOptions: { id: BookingFilter; label: string; count: number }[] = [
            { id:'upcoming',  label:'📅 Mendatang', count: allBookings.filter(b=>b.booking_date>=today&&b.status!=='cancelled').length },
            { id:'all',       label:'🗂 Semua',     count: allBookings.length },
            { id:'pending',   label:'⏳ Pending',   count: pending.length },
            { id:'confirmed', label:'✅ Confirmed',  count: confirmed.length },
            { id:'cancelled', label:'✕ Batal',      count: cancelled.length },
          ];
          return (
            <div className="animate-fade-up space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="font-bold text-court-charcoal font-display">Daftar Booking</h2>
                <div className="sm:ml-auto flex items-center gap-2">
                  <span className="text-sm text-gray-400">{filtered.length} dari {allBookings.length}</span>
                  <ExportButton />
                </div>
              </div>
              <div className="booking-card p-3">
                <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
                  {filterOptions.map(opt => (
                    <button key={opt.id} onClick={() => setBookingFilter(opt.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        bookingFilter===opt.id?'bg-court-green text-white border-court-green':'bg-white text-gray-600 border-gray-200 hover:border-court-green/40'
                      }`}>
                      {opt.label}
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${bookingFilter===opt.id?'bg-white/20':'bg-gray-100 text-gray-500'}`}>
                        {opt.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama atau nomor HP..."
                    className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-court-green transition-all" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
                  )}
                </div>
              </div>
              {filtered.length === 0 ? (
                <div className="booking-card p-12 text-center">
                  <div className="text-4xl mb-3">{searchQuery?'🔍':'📭'}</div>
                  <p className="text-gray-500">{searchQuery?`Tidak ada hasil untuk "${searchQuery}"`:'Tidak ada booking'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(booking => {
                    const cfg = STATUS_CONFIG[booking.status];
                    const isPast = booking.booking_date < today;
                    return (
                      <div key={booking.id} className={`booking-card p-4 border-l-4 ${
                        booking.status==='pending'?'border-l-amber-400':booking.status==='confirmed'?'border-l-court-green':'border-l-red-300'
                      } ${isPast&&booking.status!=='cancelled'?'opacity-60':''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-court-charcoal font-display">{booking.customer_name}</h3>
                              <span className={`status-badge ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"/>{cfg.label}
                              </span>
                              {isPast&&booking.status!=='cancelled'&&<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Sudah lewat</span>}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                              <span>📅 {format(parseISO(booking.booking_date), 'EEE, d MMM yyyy', { locale: id })}</span>
                              <span>⏰ {booking.start_time.slice(0,5)}–{booking.end_time.slice(0,5)} ({booking.duration_hours} jam)</span>
                              <a href={`https://wa.me/${booking.customer_phone.replace(/^0/,'62').replace(/\+/g,'')}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-court-green hover:underline font-medium">
                                📱 {booking.customer_phone}
                              </a>
                            </div>
                            {booking.notes && <p className="text-xs text-gray-400 mt-1 italic">📝 {booking.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {booking.status==='pending'&&(
                              <button onClick={() => updateStatus(booking.id,'confirmed')} disabled={!!actionLoading}
                                className="btn-confirm text-xs px-3 py-1.5">
                                {actionLoading===booking.id+'confirmed'?'...':'✓ Konfirmasi'}
                              </button>
                            )}
                            {booking.status!=='cancelled'&&(
                              <button onClick={() => updateStatus(booking.id,'cancelled')} disabled={!!actionLoading}
                                className="btn-danger text-xs px-3 py-1.5">
                                {actionLoading===booking.id+'cancelled'?'...':'✕ Batalkan'}
                              </button>
                            )}
                            <button onClick={() => deleteBooking(booking.id)} disabled={!!actionLoading}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════════════════════════════
            ADD BOOKING TAB
        ════════════════════════════════ */}
        {tab === 'add' && (
          <div className="animate-fade-up max-w-lg">
            <div className="booking-card p-5 sm:p-6">
              <h2 className="font-bold text-court-charcoal font-display text-lg mb-5">Tambah Booking Manual</h2>
              <form onSubmit={handleAddBooking} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Nama Customer *</label>
                    <input type="text" value={form.customer_name} onChange={e => setForm(f=>({...f,customer_name:e.target.value}))}
                      className="form-input" placeholder="Budi Santoso" required />
                  </div>
                  <div>
                    <label className="form-label">No. WhatsApp *</label>
                    <input type="tel" value={form.customer_phone} onChange={e => setForm(f=>({...f,customer_phone:e.target.value}))}
                      className="form-input" placeholder="081234567890" required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Tanggal *</label>
                  <input type="date" value={form.booking_date} min={format(new Date(),'yyyy-MM-dd')}
                    onChange={e => setForm(f=>({...f,booking_date:e.target.value,start_time:''}))}
                    className="form-input" required />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Jam Mulai *</label>
                    <select
                      value={availableStartTimes.includes(form.start_time) ? form.start_time : availableStartTimes[0] || ''}
                      onChange={e => setForm(f=>({...f,start_time:e.target.value}))}
                      className="form-input"
                      required
                    >
                      {availableStartTimes.length === 0 ? (
                        <option value="" disabled>Tidak ada slot tersedia</option>
                      ) : (
                        availableStartTimes.map(slot => (
                          <option key={slot} value={slot}>{formatTime(slot)}</option>
                        ))
                      )}
                    </select>
                    {availableStartTimes.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Semua slot untuk tanggal ini sudah terisi atau sudah lewat.</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Durasi *</label>
                    <select value={form.duration_hours} onChange={e => setForm(f=>({...f,duration_hours:parseInt(e.target.value) as 1|2, start_time:''}))} className="form-input">
                      <option value={1}>1 Jam</option>
                      <option value={2}>2 Jam</option>
                    </select>
                  </div>
                </div>
                {form.start_time && availableStartTimes.includes(form.start_time) && (
                  <div className="p-3 rounded-xl bg-court-green-pale border border-court-green/20 text-sm text-court-green">
                    ⏰ <strong>{formatTime(form.start_time)}</strong> – <strong>{formatTime(`${(parseInt(form.start_time)+form.duration_hours).toString().padStart(2,'0')}:00`)}</strong>
                    <span className="text-court-green/70 ml-2">({form.duration_hours} jam)</span>
                  </div>
                )}
                <div>
                  <label className="form-label">Catatan (opsional)</label>
                  <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
                    className="form-input resize-none" rows={2} placeholder="Catatan tambahan..." />
                </div>
                {formError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">⚠️ {formError}</div>}
                {formSuccess && <div className="p-3 rounded-xl bg-court-green-pale border border-court-green/20 text-court-green text-sm animate-fade-up">✅ {formSuccess}</div>}
                <button type="submit" className="btn-primary w-full">Tambah Booking (Confirmed)</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
