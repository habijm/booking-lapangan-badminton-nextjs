'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, subMonths, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAllBookings } from '@/hooks/useAllBookings';
import { useBookings } from '@/hooks/useBookings';
import { useCourts } from '@/hooks/useCourts';
import { useSettings } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAnalytics } from '@/hooks/useAnalytics';
import { generateTimeSlots, isSlotBooked, formatTime, STATUS_CONFIG } from '@/types/booking';
import { BarChart } from '@/components/admin/charts/BarChart';
import { DonutChart } from '@/components/admin/charts/DonutChart';
import { MiniCalendar } from '@/components/admin/charts/MiniCalendar';
import { PeriodFilter, ChartPeriod } from '@/components/admin/charts/PeriodFilter';
import { BookingCard } from '@/components/admin/BookingCard';
import { BookingFilters, BookingFilter } from '@/components/admin/BookingFilters';
import { AddBookingForm } from '@/components/admin/AddBookingForm';
import { ExportButton } from '@/components/admin/ExportButton';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminBadge } from '@/components/admin/AdminCard';

type TabView = 'overview' | 'schedule' | 'bookings' | 'add';

function getPeriodRange(period: ChartPeriod, customFrom: string, customTo: string) {
  const now = new Date(); const today = format(now, 'yyyy-MM-dd');
  switch (period) {
    case '7d':  return { from: format(addDays(now,-6),  'yyyy-MM-dd'), to: today };
    case '14d': return { from: format(addDays(now,-13), 'yyyy-MM-dd'), to: today };
    case '30d': return { from: format(addDays(now,-29), 'yyyy-MM-dd'), to: today };
    case '3m':  return { from: format(subMonths(now,3), 'yyyy-MM-dd'), to: today };
    case '6m':  return { from: format(subMonths(now,6), 'yyyy-MM-dd'), to: today };
    default:    return { from: customFrom, to: customTo };
  }
}

function fmtRupiah(n: number) {
  return n >= 1_000_000 ? `Rp ${(n/1_000_000).toFixed(1)}jt` : `Rp ${(n/1000).toFixed(0)}rb`;
}

// ── Stat card component ───────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, badge, badgeOk }: {
  icon: string; label: string; value: string | number; sub: string;
  badge?: string; badgeOk?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 border border-[#52B788]/15" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {badge && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeOk ? 'bg-[#52B788]/20 text-[#74C69D]' : 'bg-red-500/20 text-red-400'}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold font-display text-white">{value}</div>
      <div className="text-xs text-[#74C69D]/70 mt-0.5 font-medium">{label}</div>
      <div className="text-[11px] text-[#74C69D]/40 mt-0.5">{sub}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { ready }  = useAdminAuth();
  const router     = useRouter();
  const [tab, setTab]                   = useState<TabView>('overview');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState<string | undefined>(undefined);
  const [chartPeriod, setChartPeriod]   = useState<ChartPeriod>('14d');
  const [customFrom, setCustomFrom]     = useState(format(addDays(new Date(),-29), 'yyyy-MM-dd'));
  const [customTo, setCustomTo]         = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('upcoming');
  const [searchQuery, setSearchQuery]   = useState('');

  const { settings }    = useSettings();
  const { courts }      = useCourts(true);
  const { role, can }   = useUserRole();
  const { bookings: dayBookings, loading: dayLoading } = useBookings(selectedDate, selectedCourt);
  const { bookings: allBookings } = useAllBookings();

  const { from: periodFrom, to: periodTo } = getPeriodRange(chartPeriod, customFrom, customTo);
  const analytics = useAnalytics(
    allBookings, periodFrom, periodTo,
    settings.price_per_hour, settings.opening_hour, settings.closing_hour,
  );

  // Auth guard — AFTER all hooks
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  const timeSlots  = generateTimeSlots(settings.opening_hour, settings.closing_hour);
  const today      = format(new Date(), 'yyyy-MM-dd');
  const pendingCount   = analytics.pending.length;
  const todayBookings  = analytics.confirmed.filter(b => b.booking_date === today);
  const tomorrowBookings = analytics.confirmed.filter(b => b.booking_date === format(addDays(new Date(),1),'yyyy-MM-dd'));
  const totalOpHours   = settings.closing_hour - settings.opening_hour;
  const todayHours     = todayBookings.reduce((s,b) => s + b.duration_hours, 0);
  const utilizationPct = Math.round((todayHours / totalOpHours) * 100);

  const periodLabel = {
    '7d':'7 Hari','14d':'14 Hari','30d':'30 Hari','3m':'3 Bulan','6m':'6 Bulan',
    'custom':`${format(parseISO(periodFrom),'d MMM',{locale:id})}–${format(parseISO(periodTo),'d MMM',{locale:id})}`,
  }[chartPeriod];

  const updateStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setActionLoading(bookingId + status);
    await supabase.from('bookings').update({ status }).eq('id', bookingId);
    if (settings.fonnte_enabled) {
      fetch('/api/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, type: status }),
      }).catch(console.error);
    }
    setActionLoading(null);
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Yakin hapus booking ini?')) return;
    setActionLoading(bookingId + 'delete');
    await supabase.from('bookings').delete().eq('id', bookingId);
    setActionLoading(null);
  };

  const filteredBookings = (() => {
    let list = allBookings;
    if (bookingFilter === 'upcoming') list = allBookings.filter(b => b.booking_date >= today && b.status !== 'cancelled');
    else if (bookingFilter !== 'all') list = allBookings.filter(b => b.status === bookingFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => b.customer_name.toLowerCase().includes(q) || b.customer_phone.includes(q));
    }
    return [...list].sort((a, b) =>
      bookingFilter === 'upcoming'
        ? a.booking_date < b.booking_date ? -1 : 1
        : a.booking_date > b.booking_date ? -1 : 1
    );
  })();

  const dateOptions = Array.from({length:7}, (_,i) => {
    const date = addDays(new Date(), i);
    return { value: format(date,'yyyy-MM-dd'), label: format(date,'EEE d MMM',{locale:id}) };
  });

  const maxDay  = Math.max(...analytics.dailyBarData.map(d=>d.value), 1);
  const maxPeak = Math.max(...analytics.peakHoursData.map(d=>d.value), 1);
  const maxDow  = Math.max(...analytics.dowData.map(d=>d.value), 1);

  // ── Dark-style slot colors ────────────────────────────────────────────────
  const slotColors = {
    available: 'border-[#52B788]/30 bg-[#52B788]/10 hover:bg-[#52B788]/20',
    confirmed: 'border-red-500/25 bg-red-500/8',
    pending:   'border-amber-500/25 bg-amber-500/8',
    past:      'border-white/5 bg-white/3 opacity-40',
  };

  return (
    <AdminLayout courtName={settings.court_name} pendingCount={pendingCount}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Tab nav */}
        <div className="flex gap-1 p-1 rounded-xl border border-[#52B788]/15 mb-6 overflow-x-auto"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {([
            { id:'overview', label:'📊 Overview' },
            { id:'schedule', label:'📅 Jadwal' },
            { id:'bookings', label:`📋 Booking${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { id:'add',      label:'➕ Tambah' },
          ] as { id: TabView; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#40916C] text-white shadow-lg shadow-[#40916C]/20'
                  : 'text-[#74C69D]/60 hover:text-[#74C69D] hover:bg-[#52B788]/10'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════
            OVERVIEW TAB
        ═══════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="space-y-5 animate-fade-up">

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="📅" label="Booking Hari Ini" value={todayBookings.length} sub={`${todayHours} jam terisi`}/>
              <StatCard icon="📈" label="Bulan Ini" value={analytics.thisMonthBookings.length}
                sub={`vs ${analytics.lastMonthBookings.length} bln lalu`}
                badge={analytics.bookingGrowth !== 0 ? `${analytics.bookingGrowth>0?'+':''}${analytics.bookingGrowth}%` : undefined}
                badgeOk={analytics.bookingGrowth >= 0}/>
              <StatCard icon="💰" label="Est. Pendapatan" value={fmtRupiah(analytics.thisMonthRevenue)}
                sub={`vs ${fmtRupiah(analytics.lastMonthRevenue)}`}
                badge={analytics.revenueGrowth !== 0 ? `${analytics.revenueGrowth>0?'+':''}${analytics.revenueGrowth}%` : undefined}
                badgeOk={analytics.revenueGrowth >= 0}/>
              <StatCard icon="⏳" label="Pending" value={pendingCount}
                sub={pendingCount > 0 ? 'Perlu konfirmasi' : 'Semua terkonfirmasi'}/>
            </div>

            {/* Utilization + Donut + Tomorrow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Utilization */}
              <AdminCard>
                <AdminSectionHeader title="Utilisasi Hari Ini"/>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-4xl font-bold font-display text-white">{utilizationPct}%</span>
                  <span className="text-sm text-[#74C69D]/50 mb-1">terisi</span>
                </div>
                <div className="w-full rounded-full h-2.5 mb-1" style={{ background: 'rgba(82,183,136,0.1)' }}>
                  <div className="bg-[#40916C] h-2.5 rounded-full transition-all duration-700" style={{ width: `${utilizationPct}%` }}/>
                </div>
                <div className="text-xs text-[#74C69D]/40">{todayHours} / {totalOpHours} jam</div>
                {todayBookings.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[10px] font-bold text-[#74C69D]/40 uppercase tracking-wide">Jadwal hari ini</div>
                    {todayBookings.slice(0,4).map(b => (
                      <div key={b.id} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#52B788] flex-shrink-0"/>
                        <span className="font-medium text-[#74C69D]">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</span>
                        <span className="text-[#74C69D]/40 truncate">{b.customer_name}</span>
                      </div>
                    ))}
                    {todayBookings.length > 4 && <div className="text-[11px] text-[#52B788]">+{todayBookings.length-4} lainnya</div>}
                  </div>
                )}
              </AdminCard>

              {/* Status donut */}
              <AdminCard>
                <AdminSectionHeader title="Status Semua Booking"/>
                <DonutChart confirmed={analytics.confirmed.length} pending={pendingCount} cancelled={analytics.cancelled.length}/>
                <div className="mt-4 pt-3 border-t border-[#52B788]/10 text-xs text-[#74C69D]/40 text-center">
                  {allBookings.length} total booking tercatat
                </div>
              </AdminCard>

              {/* Tomorrow */}
              <AdminCard>
                <AdminSectionHeader title={`Besok (${format(addDays(new Date(),1),'d MMM',{locale:id})})`}/>
                {tomorrowBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 text-[#74C69D]/20">
                    <span className="text-3xl mb-1">📭</span>
                    <span className="text-xs">Belum ada booking</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tomorrowBookings.map(b => (
                      <div key={b.id} className="flex items-center gap-2 p-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                        <span className="text-[#52B788] text-sm">⏰</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#74C69D]">{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</div>
                          <div className="text-[11px] text-[#74C69D]/50 truncate">{b.customer_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </div>

            {/* Charts section */}
            <AdminCard>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 pb-4 border-b border-[#52B788]/10">
                <div>
                  <h3 className="font-bold text-white font-display text-sm">Analitik Booking</h3>
                  <p className="text-xs text-[#74C69D]/50 mt-0.5">
                    {periodLabel} · {analytics.periodConfirmed.length} booking · {analytics.periodHours} jam · {fmtRupiah(analytics.periodRevenue)}
                  </p>
                </div>
                <div className="sm:ml-auto">
                  <ExportButton allBookings={allBookings} periodBookings={analytics.periodBookings} periodLabel={periodLabel}/>
                </div>
              </div>

              <div className="mb-4">
                <PeriodFilter period={chartPeriod} customFrom={customFrom} customTo={customTo}
                  showCustom={chartPeriod==='custom'}
                  onChange={p => setChartPeriod(p)}
                  onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}/>
              </div>

              {/* Period summary */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  {label:'Total Booking',value:analytics.periodConfirmed.length,icon:'📋'},
                  {label:'Total Jam',value:`${analytics.periodHours}j`,icon:'⏱'},
                  {label:'Est. Revenue',value:fmtRupiah(analytics.periodRevenue),icon:'💰'},
                ].map((s,i) => (
                  <div key={i} className="rounded-xl p-3 text-center border border-[#52B788]/15 bg-[#52B788]/5">
                    <div className="text-base mb-0.5">{s.icon}</div>
                    <div className="font-bold text-[#74C69D] text-sm font-display">{s.value}</div>
                    <div className="text-[11px] text-[#74C69D]/40">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Daily trend */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#74C69D]/60 uppercase tracking-wide">Tren Harian</h4>
                  <span className="text-[11px] text-[#74C69D]/40">
                    Rata-rata: {analytics.dailyBarData.length > 0 ? (analytics.dailyBarData.reduce((s,d)=>s+d.value,0)/analytics.dailyBarData.length).toFixed(1) : 0}/hari
                  </span>
                </div>
                <BarChart data={analytics.dailyBarData} maxVal={maxDay} color="#40916C"/>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-[#74C69D]/60 uppercase tracking-wide mb-3">Jam Tersibuk</h4>
                  <BarChart data={analytics.peakHoursData} maxVal={maxPeak} color="#52B788"/>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#74C69D]/60 uppercase tracking-wide mb-3">Hari Tersibuk</h4>
                  <BarChart data={analytics.dowData} maxVal={maxDow} color="#74C69D"/>
                </div>
              </div>
            </AdminCard>

            {/* Calendar + Top customers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AdminCard>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-[#74C69D]/60 uppercase tracking-wide">Heatmap Kalender</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCalendarMonth(m => { const d=new Date(m); d.setMonth(d.getMonth()-1); return d; })}
                      className="p-1 rounded text-[#74C69D]/40 hover:text-[#74C69D] hover:bg-[#52B788]/10 text-xs transition-colors">‹</button>
                    <span className="text-xs text-[#74C69D]/60 w-20 text-center">{format(calendarMonth,'MMM yyyy',{locale:id})}</span>
                    <button onClick={() => setCalendarMonth(m => { const d=new Date(m); d.setMonth(d.getMonth()+1); return d; })}
                      className="p-1 rounded text-[#74C69D]/40 hover:text-[#74C69D] hover:bg-[#52B788]/10 text-xs transition-colors">›</button>
                  </div>
                </div>
                <MiniCalendar bookingsByDate={analytics.bookingsByDate} month={calendarMonth}/>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[#74C69D]/30">
                  <span>Sedikit</span>
                  {[0.18,0.36,0.54,0.72,1].map(o => (
                    <div key={o} className="w-3 h-3 rounded-sm" style={{backgroundColor:`rgba(64,145,108,${o})`}}/>
                  ))}
                  <span>Banyak</span>
                </div>
              </AdminCard>

              <AdminCard>
                <AdminSectionHeader title="Pelanggan Terbanyak" subtitle={periodLabel}/>
                {analytics.topCustomers.length === 0 ? (
                  <div className="text-center py-8 text-[#74C69D]/20">
                    <div className="text-3xl mb-2">👤</div>
                    <div className="text-xs">Belum ada data</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topCustomers.map((c,i) => (
                      <div key={c.phone} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                          i===0?'bg-yellow-500/20 border-yellow-500/30 text-yellow-400':
                          i===1?'bg-white/10 border-white/20 text-white/50':
                          i===2?'bg-orange-500/20 border-orange-500/30 text-orange-400':
                          'bg-[#52B788]/15 border-[#52B788]/20 text-[#74C69D]'
                        }`}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{c.name}</div>
                          <a href={`https://wa.me/${c.phone.replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-[#52B788] hover:underline">{c.phone}</a>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-white">{c.count}×</div>
                          <div className="text-[11px] text-[#74C69D]/40">{c.hours}j · {fmtRupiah(c.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminCard>
            </div>

            {/* Pending alert */}
            {pendingCount > 0 && (
              <div className="p-4 rounded-2xl border border-amber-500/25 bg-amber-500/8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-bold text-amber-400 font-display text-sm">{pendingCount} Booking Menunggu Konfirmasi</div>
                    <div className="text-xs text-amber-400/60 mt-0.5">Segera konfirmasi agar customer mendapat kepastian</div>
                  </div>
                </div>
                <button onClick={() => { setTab('bookings'); setBookingFilter('pending'); }}
                  className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors">
                  Lihat →
                </button>
              </div>
            )}

            {/* Quick links */}
            {(can('settings') || can('courts') || can('roles')) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {can('courts') && (
                  <button onClick={() => router.push('/admin/courts')}
                    className="rounded-2xl p-4 text-left border border-[#52B788]/15 hover:border-[#52B788]/30 hover:bg-[#52B788]/5 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl mb-2">🏟️</div>
                    <div className="font-bold text-sm text-white font-display group-hover:text-[#74C69D] transition-colors">Lapangan</div>
                    <div className="text-xs text-[#74C69D]/40 mt-0.5">Tambah & kelola</div>
                  </button>
                )}
                {can('settings') && (
                  <button onClick={() => router.push('/admin/settings')}
                    className="rounded-2xl p-4 text-left border border-[#52B788]/15 hover:border-[#52B788]/30 hover:bg-[#52B788]/5 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl mb-2">⚙️</div>
                    <div className="font-bold text-sm text-white font-display group-hover:text-[#74C69D] transition-colors">Pengaturan</div>
                    <div className="text-xs text-[#74C69D]/40 mt-0.5">Harga, jam, notifikasi</div>
                  </button>
                )}
                {can('roles') && (
                  <button onClick={() => router.push('/admin/roles')}
                    className="rounded-2xl p-4 text-left border border-[#52B788]/15 hover:border-[#52B788]/30 hover:bg-[#52B788]/5 transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl mb-2">👥</div>
                    <div className="font-bold text-sm text-white font-display group-hover:text-[#74C69D] transition-colors">Roles</div>
                    <div className="text-xs text-[#74C69D]/40 mt-0.5">Kelola akses admin</div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            SCHEDULE TAB
        ═══════════════════════════════════════ */}
        {tab === 'schedule' && (
          <div className="animate-fade-up space-y-4">
            {/* Court selector */}
            {courts.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedCourt(undefined)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    !selectedCourt ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40'
                  }`}>
                  Semua Lapangan
                </button>
                {courts.map(c => (
                  <button key={c.id} onClick={() => setSelectedCourt(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedCourt===c.id ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40'
                    }`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Date tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map(d => (
                <button key={d.value} onClick={() => setSelectedDate(d.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedDate===d.value ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>

            <AdminCard padding="none">
              <div className="px-5 py-4 border-b border-[#52B788]/10">
                <h2 className="font-bold text-white font-display">{format(parseISO(selectedDate),'EEEE, d MMMM yyyy',{locale:id})}</h2>
                <div className="flex gap-3 mt-1 text-xs text-[#74C69D]/50">
                  <span>{dayBookings.filter(b=>b.status!=='cancelled').length} booking</span>
                  <span className="text-amber-400">{dayBookings.filter(b=>b.status==='pending').length} pending</span>
                  <span className="text-[#52B788]">{dayBookings.filter(b=>b.status==='confirmed').length} confirmed</span>
                </div>
              </div>

              {dayLoading ? (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({length:14}).map((_,i) => (
                    <div key={i} className="h-16 rounded-xl animate-pulse" style={{background:'rgba(82,183,136,0.05)'}}/>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {timeSlots.map(slot => {
                      const booking = dayBookings.find(b => {
                        const s=b.start_time.slice(0,5), e=b.end_time.slice(0,5);
                        return slot>=s && slot<e && b.status!=='cancelled';
                      });

                      if (booking) {
                        const isPending = booking.status === 'pending';
                        return (
                          <div key={slot} className={`rounded-xl border px-3 py-2.5 ${isPending ? 'border-amber-500/25 bg-amber-500/8' : 'border-red-500/20 bg-red-500/6'}`}>
                            <div className={`text-xs font-bold font-display ${isPending ? 'text-amber-400' : 'text-red-400/70'}`}>{formatTime(slot)}</div>
                            <div className="text-[11px] font-semibold text-white/70 mt-0.5 truncate">{booking.customer_name}</div>
                            <AdminBadge status={booking.status}/>
                            {booking.status === 'pending' && can('confirm') && (
                              <div className="flex gap-1 mt-2">
                                <button onClick={() => updateStatus(booking.id,'confirmed')} disabled={!!actionLoading}
                                  className="flex-1 py-1 text-[10px] font-bold bg-[#40916C] text-white rounded-md hover:bg-[#52B788] disabled:opacity-50 transition-colors">
                                  {actionLoading===booking.id+'confirmed'?'...':'✓'}
                                </button>
                                <button onClick={() => updateStatus(booking.id,'cancelled')} disabled={!!actionLoading}
                                  className="flex-1 py-1 text-[10px] font-bold bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                                  {actionLoading===booking.id+'cancelled'?'...':'✕'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={slot} className="rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 px-3 py-2.5">
                          <div className="text-xs font-bold text-[#74C69D] font-display">{formatTime(slot)}</div>
                          <div className="text-[11px] text-[#74C69D]/40 mt-0.5">Kosong</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </AdminCard>
          </div>
        )}

        {/* ═══════════════════════════════════════
            BOOKINGS TAB
        ═══════════════════════════════════════ */}
        {tab === 'bookings' && (
          <div className="animate-fade-up space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="font-bold text-white font-display">Daftar Booking</h2>
              <div className="sm:ml-auto flex items-center gap-2">
                <span className="text-sm text-[#74C69D]/40">{filteredBookings.length} / {allBookings.length}</span>
                <ExportButton allBookings={allBookings} periodBookings={analytics.periodBookings} periodLabel={periodLabel}/>
              </div>
            </div>

            <BookingFilters allBookings={allBookings} today={today}
              filter={bookingFilter} search={searchQuery}
              onFilter={setBookingFilter} onSearch={setSearchQuery}/>

            {filteredBookings.length === 0 ? (
              <AdminCard>
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">{searchQuery ? '🔍' : '📭'}</div>
                  <p className="text-[#74C69D]/40 text-sm">
                    {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Tidak ada booking'}
                  </p>
                </div>
              </AdminCard>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} today={today}
                    actionLoading={actionLoading}
                    canConfirm={can('confirm')} canCancel={can('cancel')} canDelete={can('delete')}
                    courtName={settings.court_name}
                    onConfirm={id => updateStatus(id,'confirmed')}
                    onCancel={id => updateStatus(id,'cancelled')}
                    onDelete={deleteBooking}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            ADD TAB
        ═══════════════════════════════════════ */}
        {tab === 'add' && (
          <div className="animate-fade-up max-w-lg">
            <AddBookingForm courts={courts} openingHour={settings.opening_hour} closingHour={settings.closing_hour} courtName={settings.court_name}/>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
