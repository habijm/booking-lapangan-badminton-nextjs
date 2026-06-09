'use client';

import { useState, useCallback } from 'react';
import { format, parseISO, addMonths, eachWeekOfInterval, nextDay, setHours, setMinutes } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { useMemberships, useMembershipPlans } from '@/hooks/useMemberships';
import { useCourts } from '@/hooks/useCourts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import {
  Membership, MembershipStatus, MembershipSchedule,
  DAY_NAMES, DAY_SHORT, MEMBERSHIP_STATUS_CONFIG,
} from '@/types/booking';

type View = 'list' | 'form' | 'detail';

const STATUS_FILTERS: { id: MembershipStatus | 'all'; label: string }[] = [
  { id:'all',       label:'Semua'      },
  { id:'active',    label:'🟢 Aktif'   },
  { id:'pending',   label:'🟡 Pending' },
  { id:'expired',   label:'⚫ Habis'   },
  { id:'cancelled', label:'🔴 Batal'   },
];

function generateMonthlySessions(
  startDate: string,
  schedules: { day_of_week: number; start_time: string }[],
  sessionsPerWeek: number,
  hoursPerSession: number,
): { date: string; start_time: string; end_time: string }[] {
  const start = parseISO(startDate);
  const end   = addMonths(start, 1);
  const sessions: { date: string; start_time: string; end_time: string }[] = [];

  schedules.forEach(sch => {
    const dayIndex = sch.day_of_week as 0|1|2|3|4|5|6;
    const [h, m]   = sch.start_time.split(':').map(Number);
    const endH     = h + hoursPerSession;

    // Get all weeks in the month for this day
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
    weeks.forEach(weekStart => {
      // Get the specific day in that week
      let dayDate = nextDay(weekStart, dayIndex as 0|1|2|3|4|5|6);
      // Adjust for day 0 (Sunday) which nextDay handles differently
      if (dayIndex === 0) dayDate = weekStart;
      if (dayDate >= start && dayDate < end) {
        sessions.push({
          date:       format(dayDate, 'yyyy-MM-dd'),
          start_time: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`,
          end_time:   `${endH.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`,
        });
      }
    });
  });

  return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

export default function AdminMembershipsPage() {
  const { ready }              = useAdminAuth();
  const { settings }           = useSettings();
  const { memberships, loading, refetch } = useMemberships();
  const { plans }              = useMembershipPlans();
  const { courts }             = useCourts(true);

  const [view, setView]        = useState<View>('list');
  const [selected, setSelected]= useState<Membership | null>(null);
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | 'all'>('all');
  const [search, setSearch]    = useState('');
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState('');
  const [success, setSuccess]  = useState('');

  // Form state
  const [form, setForm] = useState({
    plan_id:        '',
    customer_name:  '',
    customer_phone: '',
    start_date:     format(new Date(), 'yyyy-MM-dd'),
    status:         'active' as MembershipStatus,
    notes:          '',
  });

  // Schedule slots — support up to 2 per week
  const [scheduleSlots, setScheduleSlots] = useState<{ day_of_week: number; start_time: string; court_id: string }[]>([
    { day_of_week: 1, start_time: `${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id: courts[0]?.id ?? '' },
  ]);

  const selectedPlan = plans.find(p => p.id === form.plan_id);

  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
    placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 transition-all text-sm`;
  const labelClass = "block text-xs font-semibold text-[#74C69D]/70 mb-1.5";

  const setSlot = (i: number, key: string, val: string | number) =>
    setScheduleSlots(s => s.map((slot, idx) => idx === i ? { ...slot, [key]: val } : slot));

  const openNew = () => {
    setForm({
      plan_id: plans[0]?.id ?? '',
      customer_name: '', customer_phone: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'active', notes: '',
    });
    setScheduleSlots([
      { day_of_week: 1, start_time: `${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id: courts[0]?.id ?? '' },
    ]);
    setError(''); setSuccess('');
    setView('form');
  };

  // When plan changes, adjust schedule slots count
  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setForm(f => ({ ...f, plan_id: planId }));
    const count = plan.sessions_per_week;
    setScheduleSlots(prev => {
      const result = [...prev];
      while (result.length < count) result.push({ day_of_week: 3, start_time: `${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id: courts[0]?.id ?? '' });
      return result.slice(0, count);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);

    if (!form.plan_id) { setError('Pilih paket langganan'); setSaving(false); return; }
    if (!selectedPlan) { setSaving(false); return; }
    if (scheduleSlots.length !== selectedPlan.sessions_per_week) {
      setError(`Paket ini butuh ${selectedPlan.sessions_per_week} jadwal per minggu`); setSaving(false); return;
    }
    // Check no duplicate days for 2x/week
    if (selectedPlan.sessions_per_week === 2 && scheduleSlots[0].day_of_week === scheduleSlots[1].day_of_week) {
      setError('Hari jadwal tidak boleh sama'); setSaving(false); return;
    }

    const endDate = format(addMonths(parseISO(form.start_date), 1), 'yyyy-MM-dd');
    const totalSessions = selectedPlan.sessions_per_week * 4;

    // Insert membership
    const { data: mb, error: mbErr } = await supabase.from('memberships').insert({
      plan_id:        form.plan_id,
      customer_name:  form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      start_date:     form.start_date,
      end_date:       endDate,
      status:         form.status,
      notes:          form.notes.trim() || null,
      total_sessions: totalSessions,
      used_sessions:  0,
    }).select().single();

    if (mbErr || !mb) { setError('Gagal membuat membership: ' + mbErr?.message); setSaving(false); return; }

    // Insert schedules
    const { error: schErr } = await supabase.from('membership_schedules').insert(
      scheduleSlots.map(s => ({
        membership_id: mb.id,
        day_of_week:   s.day_of_week,
        start_time:    s.start_time,
        court_id:      s.court_id || null,
      }))
    );

    if (schErr) { setError('Jadwal gagal disimpan: ' + schErr.message); setSaving(false); return; }

    // Auto-create bookings for all sessions this month
    const sessions = generateMonthlySessions(form.start_date, scheduleSlots, selectedPlan.sessions_per_week, selectedPlan.hours_per_session);
    if (sessions.length > 0) {
      await supabase.from('bookings').insert(
        sessions.map(s => ({
          customer_name:  form.customer_name.trim(),
          customer_phone: form.customer_phone.trim(),
          booking_date:   s.date,
          start_time:     s.start_time,
          end_time:       s.end_time,
          duration_hours: selectedPlan.hours_per_session,
          status:         form.status === 'active' ? 'confirmed' : 'pending',
          notes:          `[Langganan] ${selectedPlan.name}`,
          court_id:       scheduleSlots[0]?.court_id || null,
        }))
      );
    }

    setSaving(false);
    setSuccess(`Membership berhasil dibuat! ${sessions.length} sesi otomatis dijadwalkan.`);
    refetch();
    setTimeout(() => { setView('list'); setSuccess(''); }, 2000);
  };

  const updateStatus = async (id: string, status: MembershipStatus) => {
    await supabase.from('memberships').update({ status }).eq('id', id);
    refetch();
  };

  const deleteMembership = async (id: string) => {
    if (!confirm('Yakin hapus membership ini? Booking yang sudah dibuat tidak akan terhapus.')) return;
    await supabase.from('memberships').delete().eq('id', id);
    refetch();
    if (view === 'detail') setView('list');
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  const filtered = memberships.filter(m => {
    const okStatus = filterStatus === 'all' || m.status === filterStatus;
    const okSearch = !search.trim() ||
      m.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      m.customer_phone.includes(search);
    return okStatus && okSearch;
  });

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    const sta = MEMBERSHIP_STATUS_CONFIG[selected.status];
    const sessions = selected.schedules
      ? generateMonthlySessions(selected.start_date, selected.schedules, selected.plan?.sessions_per_week ?? 1, selected.plan?.hours_per_session ?? 2)
      : [];

    return (
      <AdminLayout courtName={settings.court_name}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setView('list')} className="text-[#74C69D]/50 hover:text-[#74C69D] text-sm transition-colors">← Kembali</button>
            <h1 className="text-xl font-bold text-white font-display">Detail Membership</h1>
          </div>

          {/* Member info */}
          <AdminCard>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-white font-display text-lg">{selected.customer_name}</h2>
                <a href={`https://wa.me/${selected.customer_phone.replace(/^0/,'62')}`} target="_blank" rel="noopener noreferrer"
                  className="text-[#52B788] text-sm hover:underline">📱 {selected.customer_phone}</a>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${sta.bg} ${sta.border} ${sta.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`}/>{sta.label}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                { label:'Paket', value: selected.plan?.name ?? '-' },
                { label:'Periode', value: `${format(parseISO(selected.start_date),'d MMM',{locale:id})} – ${format(parseISO(selected.end_date),'d MMM yyyy',{locale:id})}` },
                { label:'Sesi Terpakai', value: `${selected.used_sessions} / ${selected.total_sessions} sesi` },
                { label:'Harga', value: selected.plan ? `Rp ${selected.plan.price.toLocaleString('id')}` : '-' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl border border-[#52B788]/10 bg-[#52B788]/5">
                  <div className="text-[10px] text-[#74C69D]/40 uppercase tracking-wide font-bold mb-1">{item.label}</div>
                  <div className="text-white font-medium text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            {selected.notes && (
              <div className="mt-3 p-3 rounded-xl border border-[#52B788]/10 bg-[#52B788]/5 text-xs text-[#74C69D]/60">
                📝 {selected.notes}
              </div>
            )}
          </AdminCard>

          {/* Jadwal mingguan */}
          <AdminCard>
            <AdminSectionHeader title="📅 Jadwal Mingguan"/>
            {selected.schedules && selected.schedules.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {selected.schedules.map((sch, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                    <div className="w-10 h-10 rounded-full bg-[#40916C]/20 border border-[#52B788]/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-[#74C69D]">{DAY_SHORT[sch.day_of_week]}</span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">{DAY_NAMES[sch.day_of_week]}</div>
                      <div className="text-[#74C69D]/60 text-xs">
                        {sch.start_time.slice(0,5)} – {(() => {
                          const [h] = sch.start_time.split(':').map(Number);
                          return `${(h + (selected.plan?.hours_per_session ?? 2)).toString().padStart(2,'0')}:00`;
                        })()} WIB
                        {sch.court && <span className="ml-1">· {sch.court.name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#74C69D]/40 text-sm">Belum ada jadwal</p>
            )}
          </AdminCard>

          {/* Semua sesi bulan ini */}
          <AdminCard>
            <AdminSectionHeader title={`🗓 Sesi Bulan Ini (${sessions.length} sesi)`}/>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-[#52B788]/10 bg-[#52B788]/3">
                  <span className="text-[#74C69D]/40 text-xs w-6 text-center font-bold">{i+1}</span>
                  <span className="text-[#74C69D]/60 text-xs">{DAY_SHORT[parseISO(s.date).getDay()]}</span>
                  <span className="text-white text-xs font-medium">{format(parseISO(s.date), 'd MMM yyyy', { locale: id })}</span>
                  <span className="text-[#52B788] text-xs ml-auto">{s.start_time}–{s.end_time}</span>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {selected.status === 'pending' && (
              <AdminButton variant="primary" onClick={() => { updateStatus(selected.id,'active'); setSelected(s => s ? {...s, status:'active'} : s); }}>
                ✓ Aktifkan
              </AdminButton>
            )}
            {selected.status === 'active' && (
              <AdminButton variant="secondary" onClick={() => { updateStatus(selected.id,'cancelled'); setSelected(s => s ? {...s, status:'cancelled'} : s); }}>
                Batalkan
              </AdminButton>
            )}
            <AdminButton variant="danger" onClick={() => deleteMembership(selected.id)}>
              🗑️ Hapus
            </AdminButton>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── FORM VIEW ────────────────────────────────────────────────────────────
  if (view === 'form') return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView('list')} className="text-[#74C69D]/50 hover:text-[#74C69D] text-sm transition-colors">← Kembali</button>
          <h1 className="text-xl font-bold text-white font-display">➕ Tambah Member Baru</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Pilih paket */}
          <AdminCard>
            <AdminSectionHeader title="📦 Pilih Paket Langganan"/>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans.filter(p => p.is_active).map(plan => (
                <button key={plan.id} type="button" onClick={() => handlePlanChange(plan.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.plan_id === plan.id
                      ? 'border-[#40916C] bg-[#40916C]/15'
                      : 'border-[#52B788]/15 bg-white/2 hover:border-[#52B788]/35'
                  }`}>
                  <div className="font-bold text-white font-display text-sm">{plan.name}</div>
                  <div className="text-[#74C69D]/60 text-xs mt-1">{plan.description}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[#52B788] font-bold text-base">Rp {plan.price.toLocaleString('id')}</div>
                    <div className="text-[10px] text-[#74C69D]/40">/bulan</div>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D]/70">
                      {plan.hours_per_session} jam/sesi
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D]/70">
                      {plan.sessions_per_week}x/minggu
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D]/70">
                      {plan.sessions_per_week * 4} sesi/bulan
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </AdminCard>

          {/* Data customer */}
          <AdminCard>
            <AdminSectionHeader title="👤 Data Customer"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nama Lengkap *</label>
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
          </AdminCard>

          {/* Jadwal mingguan */}
          {selectedPlan && (
            <AdminCard>
              <AdminSectionHeader
                title={`📅 Jadwal Mingguan (${selectedPlan.sessions_per_week}x/minggu)`}
                subtitle="Pilih hari dan jam untuk setiap sesi per minggu"/>
              <div className="space-y-3">
                {scheduleSlots.map((slot, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
                    <div className="text-xs font-bold text-[#74C69D]/50 mb-3 uppercase tracking-wide">
                      Jadwal {i+1}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Day picker */}
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelClass}>Hari</label>
                        <select value={slot.day_of_week}
                          onChange={e => setSlot(i, 'day_of_week', Number(e.target.value))}
                          className={inputClass + " bg-[#0D1F16]"}>
                          {DAY_NAMES.map((d, idx) => (
                            <option key={idx} value={idx}>{d}</option>
                          ))}
                        </select>
                      </div>
                      {/* Time picker */}
                      <div>
                        <label className={labelClass}>Jam Mulai</label>
                        <select value={slot.start_time}
                          onChange={e => setSlot(i, 'start_time', e.target.value)}
                          className={inputClass + " bg-[#0D1F16]"}>
                          {Array.from({ length: settings.closing_hour - settings.opening_hour - selectedPlan.hours_per_session + 1 }, (_, h) => {
                            const hour = settings.opening_hour + h;
                            const val  = `${hour.toString().padStart(2,'0')}:00`;
                            const endH = hour + selectedPlan.hours_per_session;
                            return (
                              <option key={val} value={val}>
                                {val} – {endH.toString().padStart(2,'0')}:00
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {/* Court picker */}
                      {courts.length > 1 && (
                        <div>
                          <label className={labelClass}>Lapangan</label>
                          <select value={slot.court_id}
                            onChange={e => setSlot(i, 'court_id', e.target.value)}
                            className={inputClass + " bg-[#0D1F16]"}>
                            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    {/* Preview end time */}
                    <div className="mt-2 text-xs text-[#74C69D]/40">
                      ⏰ Setiap {DAY_NAMES[slot.day_of_week]}, pukul {slot.start_time} –{' '}
                      {`${(parseInt(slot.start_time) + selectedPlan.hours_per_session).toString().padStart(2,'0')}:00`} WIB
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}

          {/* Tanggal & Status */}
          <AdminCard>
            <AdminSectionHeader title="📆 Periode & Status"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tanggal Mulai *</label>
                <input type="date" value={form.start_date} required
                  onChange={e => setForm(f => ({...f, start_date: e.target.value}))}
                  className={inputClass + " bg-[#0D1F16]"}/>
                {form.start_date && (
                  <p className="text-xs text-[#74C69D]/40 mt-1">
                    Berakhir: {format(addMonths(parseISO(form.start_date), 1), 'd MMMM yyyy', { locale: id })}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Status Awal</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as MembershipStatus}))}
                  className={inputClass + " bg-[#0D1F16]"}>
                  <option value="active">Aktif (langsung confirmed)</option>
                  <option value="pending">Pending (menunggu pembayaran)</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Catatan (opsional)</label>
              <textarea value={form.notes} rows={2}
                onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className={inputClass + " resize-none"}
                placeholder="Catatan khusus untuk member ini..."/>
            </div>
          </AdminCard>

          {/* Preview sessions */}
          {selectedPlan && form.start_date && scheduleSlots.length > 0 && (
            <AdminCard>
              <AdminSectionHeader title="🗓 Preview Sesi yang Akan Dibuat"/>
              {(() => {
                const sessions = generateMonthlySessions(form.start_date, scheduleSlots, selectedPlan.sessions_per_week, selectedPlan.hours_per_session);
                return (
                  <>
                    <div className="mb-3 p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-xs text-[#74C69D]">
                      ✅ <strong className="text-white">{sessions.length} sesi</strong> akan otomatis terjadwal sebagai booking {form.status === 'active' ? 'confirmed' : 'pending'}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {sessions.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/2 text-xs">
                          <span className="text-[#74C69D]/40 w-5 text-center">{i+1}</span>
                          <span className="text-[#74C69D]/50">{DAY_SHORT[parseISO(s.date).getDay()]}</span>
                          <span className="text-white">{format(parseISO(s.date), 'd MMM yyyy', { locale: id })}</span>
                          <span className="text-[#52B788] ml-auto">{s.start_time}–{s.end_time}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </AdminCard>
          )}

          {error   && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
          {success && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ {success}</div>}

          <div className="flex gap-3 pb-8">
            <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving || !form.plan_id}>
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
                : '✓ Buat Membership & Jadwal Otomatis'}
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setView('list')}>Batal</AdminButton>
          </div>
        </form>
      </div>
    </AdminLayout>
  );

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  const stats = {
    all:       memberships.length,
    active:    memberships.filter(m => m.status === 'active').length,
    pending:   memberships.filter(m => m.status === 'pending').length,
    expired:   memberships.filter(m => m.status === 'expired').length,
    cancelled: memberships.filter(m => m.status === 'cancelled').length,
  };

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white font-display">🎫 Manajemen Langganan</h1>
            <p className="text-[#74C69D]/50 text-sm mt-0.5">Kelola paket member bulanan lapangan</p>
          </div>
          <div className="sm:ml-auto">
            <AdminButton variant="primary" onClick={openNew}>+ Tambah Member</AdminButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_FILTERS.filter(f => f.id !== 'cancelled').map(f => {
            const count = f.id === 'all' ? stats.all : stats[f.id as keyof typeof stats];
            return (
              <button key={f.id} onClick={() => setFilterStatus(f.id as MembershipStatus | 'all')}
                className={`rounded-xl p-3 text-left border-2 transition-all ${
                  filterStatus === f.id ? 'border-[#40916C] bg-[#40916C]/15' : 'border-[#52B788]/10 bg-white/2 hover:border-[#52B788]/25'
                }`}>
                <div className="text-2xl font-bold font-display text-white">{count}</div>
                <div className="text-xs text-[#74C69D]/50 mt-0.5">{f.label}</div>
              </button>
            );
          })}
        </div>

        {/* Paket info */}
        <div className="grid sm:grid-cols-2 gap-3">
          {plans.filter(p => p.is_active).map(plan => (
            <div key={plan.id} className="rounded-xl border border-[#52B788]/15 p-4 flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-10 h-10 rounded-full bg-[#40916C]/20 border border-[#52B788]/30 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{plan.sessions_per_week === 1 ? '🥈' : '🥇'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white font-display text-sm">{plan.name}</div>
                <div className="text-xs text-[#74C69D]/50">{plan.description}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-[#52B788]">Rp {plan.price.toLocaleString('id')}</div>
                <div className="text-[10px] text-[#74C69D]/40">/bulan</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="rounded-2xl border border-[#52B788]/15 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {STATUS_FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id as MembershipStatus | 'all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filterStatus === f.id ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                }`}>{f.label}</button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74C69D]/30">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 transition-all"/>
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74C69D]/40 hover:text-[#74C69D]">✕</button>}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{Array.from({length:4}).map((_,i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse border border-[#52B788]/10" style={{background:'rgba(82,183,136,0.04)'}}/>
          ))}</div>
        ) : filtered.length === 0 ? (
          <AdminCard>
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">🎫</div>
              <h3 className="text-white font-bold font-display mb-1">Belum Ada Member</h3>
              <p className="text-[#74C69D]/40 text-sm mb-4">Tambahkan member langganan pertama.</p>
              <AdminButton variant="primary" onClick={openNew}>+ Tambah Member</AdminButton>
            </div>
          </AdminCard>
        ) : (
          <div className="space-y-2">
            {filtered.map(m => {
              const sta = MEMBERSHIP_STATUS_CONFIG[m.status];
              const pct = m.total_sessions > 0 ? Math.round((m.used_sessions / m.total_sessions) * 100) : 0;
              return (
                <div key={m.id} className="rounded-2xl border border-[#52B788]/15 p-4 cursor-pointer hover:border-[#52B788]/30 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => { setSelected(m); setView('detail'); }}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-white font-display text-sm">{m.customer_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sta.bg} ${sta.border} ${sta.color}`}>
                          <span className={`w-1 h-1 rounded-full ${sta.dot} inline-block mr-1`}/>{sta.label}
                        </span>
                        <span className="text-[10px] text-[#74C69D]/40 border border-[#52B788]/15 px-2 py-0.5 rounded-full">
                          {m.plan?.name ?? 'Unknown Plan'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[#74C69D]/40">
                        <span>📱 {m.customer_phone}</span>
                        <span>📅 s/d {format(parseISO(m.end_date), 'd MMM yyyy', { locale: id })}</span>
                        <span>🗓 {m.schedules?.map(s => DAY_SHORT[s.day_of_week]).join(' & ')} · {m.schedules?.[0]?.start_time.slice(0,5)}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5">
                          <div className="h-1.5 rounded-full bg-[#40916C] transition-all" style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-[10px] text-[#74C69D]/40 flex-shrink-0">
                          {m.used_sessions}/{m.total_sessions} sesi
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#74C69D]/30 text-xs">Lihat detail →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
