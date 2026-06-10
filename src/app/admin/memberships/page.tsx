'use client';

import { useState, useCallback } from 'react';
import { format, parseISO, addMonths, eachWeekOfInterval, nextDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { useMemberships, useMembershipPlans } from '@/hooks/useMemberships';
import { useCourts } from '@/hooks/useCourts';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import {
  Membership, MembershipPlan, MembershipStatus, MembershipSchedule,
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
) {
  const start = parseISO(startDate);
  const end   = addMonths(start, 1);
  const sessions: { date: string; start_time: string; end_time: string }[] = [];

  schedules.forEach(sch => {
    const dayIndex = sch.day_of_week as 0|1|2|3|4|5|6;
    const [h, m]   = sch.start_time.split(':').map(Number);
    const endH     = h + Math.round(hoursPerSession);
    const weeks    = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });
    weeks.forEach(weekStart => {
      let dayDate = nextDay(weekStart, dayIndex);
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

  return sessions.sort((a,b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN MANAGER — inline, collapsible
// ─────────────────────────────────────────────────────────────────────────────
function PlanManager({ plans, onRefresh }: { plans: MembershipPlan[]; onRefresh: () => void }) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [isNew,   setIsNew]   = useState(false);
  const [form,    setForm]    = useState({ name:'', description:'', hours_per_session:2, sessions_per_week:1, price:0 });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white text-sm placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/60 transition-all disabled:opacity-50';
  const labelCls = 'block text-xs font-semibold text-[#74C69D]/70 mb-1';
  const selectCls = `${inputCls} bg-[#0D1F16] cursor-pointer`;

  const openEdit = (p: MembershipPlan) => {
    setEditing(p); setIsNew(false);
    setForm({ name:p.name, description:p.description??'', hours_per_session:p.hours_per_session, sessions_per_week:p.sessions_per_week, price:p.price });
    setError('');
  };
  const openNew = () => {
    setEditing(null); setIsNew(true);
    setForm({ name:'', description:'', hours_per_session:2, sessions_per_week:1, price:0 });
    setError('');
  };
  const cancel  = () => { setEditing(null); setIsNew(false); setError(''); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())  { setError('Nama paket wajib diisi'); return; }
    if (form.price <= 0)    { setError('Harga harus lebih dari 0'); return; }
    setSaving(true); setError('');
    const payload = {
      name:              form.name.trim(),
      description:       form.description?.trim() || null,
      hours_per_session: Number(form.hours_per_session),
      sessions_per_week: Number(form.sessions_per_week),
      price:             Number(form.price),
    };
    const { error: err } = editing
      ? await supabase.from('membership_plans').update(payload).eq('id', editing.id)
      : await supabase.from('membership_plans').insert({ ...payload, is_active: true });
    setSaving(false);
    if (err) { setError('Gagal: ' + err.message); return; }
    onRefresh(); cancel();
  };

  const toggleActive = async (p: MembershipPlan) => {
    await supabase.from('membership_plans').update({ is_active: !p.is_active }).eq('id', p.id);
    onRefresh();
  };

  const perSession = (f: typeof form) =>
    f.price > 0 && f.sessions_per_week > 0
      ? Math.round(f.price / (f.sessions_per_week * 4)).toLocaleString('id')
      : '—';

  const InlineForm = ({ isEditing }: { isEditing: boolean }) => (
    <form onSubmit={handleSave} className="mt-3 pt-4 border-t border-[#52B788]/15 space-y-3 animate-fade-up">
      <p className="text-[10px] font-bold text-[#74C69D]/50 uppercase tracking-wide">
        {isEditing ? `✏️ Edit: ${editing?.name}` : '➕ Paket Baru'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Nama Paket *</label>
          <input type="text" required value={form.name}
            onChange={e => setForm(f=>({...f,name:e.target.value}))}
            className={inputCls} placeholder="Paket Silver"/>
        </div>
        <div>
          <label className={labelCls}>
            Harga / Bulan (Rp) *
            {form.price > 0 && (
              <span className="font-normal text-[#74C69D]/35 ml-1">≈ Rp {perSession(form)}/sesi</span>
            )}
          </label>
          <input type="number" required min={1} value={form.price || ''}
            onChange={e => setForm(f=>({...f,price:Number(e.target.value)}))}
            className={inputCls} placeholder="300000"/>
        </div>
        <div>
          <label className={labelCls}>Jam per Sesi</label>
          <select value={form.hours_per_session}
            onChange={e => setForm(f=>({...f,hours_per_session:Number(e.target.value)}))}
            className={selectCls} style={{ colorScheme:'dark' }}>
            {[1, 2, 3, 4].map(h => (
              <option key={h} value={h} style={{ background:'#0D1F16' }}>{h} jam/sesi</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sesi per Minggu</label>
          <select value={form.sessions_per_week}
            onChange={e => setForm(f=>({...f,sessions_per_week:Number(e.target.value)}))}
            className={selectCls} style={{ colorScheme:'dark' }}>
            {[1,2,3,4,5].map(n => (
              <option key={n} value={n} style={{ background:'#0D1F16' }}>
                {n}× — {n*4} sesi/bln
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Deskripsi (opsional)</label>
          <input type="text" value={form.description}
            onChange={e => setForm(f=>({...f,description:e.target.value}))}
            className={inputCls} placeholder="Cocok untuk pemain rutin 1x/minggu"/>
        </div>
      </div>
      {/* Summary pill */}
      {form.price > 0 && (
        <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-xs text-[#74C69D] flex flex-wrap gap-4">
          <span>⏱ {form.hours_per_session} jam/sesi</span>
          <span>📅 {form.sessions_per_week}×/minggu</span>
          <span>🗓 {form.sessions_per_week*4} sesi/bln</span>
          <span className="font-bold text-[#52B788]">Rp {Number(form.price).toLocaleString('id')}/bln</span>
          <span className="text-[#74C69D]/40">≈ Rp {perSession(form)}/sesi</span>
        </div>
      )}
      {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}
      <div className="flex gap-2">
        <AdminButton type="submit" variant="primary" disabled={saving} className="text-xs">
          {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Menyimpan...</> : (isEditing ? '💾 Simpan' : '➕ Tambah Paket')}
        </AdminButton>
        <AdminButton type="button" variant="ghost" className="text-xs" onClick={cancel}>Batal</AdminButton>
      </div>
    </form>
  );

  return (
    <AdminCard padding="none">
      <button type="button" onClick={() => { setOpen(v=>!v); if (open) cancel(); }}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#52B788]/5 rounded-2xl transition-colors">
        <div>
          <div className="font-bold text-white font-display text-sm flex items-center gap-2">
            📦 Kelola Paket Langganan
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#52B788]/20 bg-[#52B788]/10 text-[#74C69D]/60 font-normal">
              {plans.filter(p=>p.is_active).length} aktif
            </span>
          </div>
          <div className="text-[#74C69D]/35 text-xs mt-0.5">Ubah nama, harga, dan detail paket Silver / Gold / dll</div>
        </div>
        <span className="text-[#74C69D]/40 text-sm ml-4">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-[#52B788]/10 px-5 pb-5 pt-4 space-y-3">

          {/* Existing plans */}
          {plans.map(plan => (
            <div key={plan.id} className={`rounded-xl border p-4 ${plan.is_active ? 'border-[#52B788]/20 bg-[#52B788]/5' : 'border-white/8 bg-white/2 opacity-60'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-white font-display text-sm">
                      {plan.sessions_per_week >= 2 ? '🥇' : '🥈'} {plan.name}
                    </span>
                    {!plan.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/30">Nonaktif</span>}
                  </div>
                  {plan.description && <p className="text-xs text-[#74C69D]/45 mb-1">{plan.description}</p>}
                  <div className="flex flex-wrap gap-2.5 text-xs text-[#74C69D]/55">
                    <span>⏱ {plan.hours_per_session}j/sesi</span>
                    <span>📅 {plan.sessions_per_week}×/mgg</span>
                    <span>🗓 {plan.sessions_per_week*4} sesi/bln</span>
                    <span className="font-bold text-[#52B788]">Rp {plan.price.toLocaleString('id')}/bln</span>
                    <span className="text-[#74C69D]/35">≈ Rp {Math.round(plan.price/(plan.sessions_per_week*4)).toLocaleString('id')}/sesi</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <AdminButton variant="ghost" className="text-xs px-2.5 py-1.5"
                    onClick={() => editing?.id === plan.id ? cancel() : openEdit(plan)}>
                    {editing?.id === plan.id ? 'Batal' : '✏️'}
                  </AdminButton>
                  <AdminButton variant={plan.is_active ? 'secondary' : 'primary'} className="text-xs px-2.5 py-1.5"
                    onClick={() => toggleActive(plan)}>
                    {plan.is_active ? 'Off' : 'On'}
                  </AdminButton>
                </div>
              </div>
              {editing?.id === plan.id && <InlineForm isEditing={true}/>}
            </div>
          ))}

          {/* New plan button / form */}
          {!isNew ? (
            <button type="button" onClick={openNew}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#52B788]/20 text-[#74C69D]/40 hover:border-[#52B788]/40 hover:text-[#74C69D] text-sm transition-all">
              ＋ Tambah Paket Baru
            </button>
          ) : (
            <div className="rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 p-4">
              <InlineForm isEditing={false}/>
            </div>
          )}
        </div>
      )}
    </AdminCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminMembershipsPage() {
  const { ready }              = useAdminAuth();
  const { settings }           = useSettings();
  const { memberships, loading, refetch } = useMemberships();
  const { plans, loading: plansLoading }  = useMembershipPlans();
  const [refetchPlans, setRefetchPlans]   = useState(0);
  const { courts }             = useCourts(true);

  const [view, setView]        = useState<View>('list');
  const [selected, setSelected]= useState<Membership | null>(null);
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | 'all'>('all');
  const [search, setSearch]    = useState('');
  const [saving,  setSaving]   = useState(false);
  const [error,   setError]    = useState('');
  const [success, setSuccess]  = useState('');

  const [form, setForm] = useState({
    plan_id: '', customer_name: '', customer_phone: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'active' as MembershipStatus, notes: '',
  });
  const [scheduleSlots, setScheduleSlots] = useState<{ day_of_week: number; start_time: string; court_id: string }[]>([
    { day_of_week: 1, start_time: `${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id: courts[0]?.id ?? '' },
  ]);

  const selectedPlan   = plans.find(p => p.id === form.plan_id);
  const inputCls       = 'w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 transition-all text-sm disabled:opacity-50';
  const labelCls       = 'block text-xs font-semibold text-[#74C69D]/70 mb-1.5';
  const selectCls      = `${inputCls} bg-[#0D1F16] cursor-pointer`;

  const setSlot = (i: number, key: string, val: string | number) =>
    setScheduleSlots(s => s.map((sl, idx) => idx === i ? { ...sl, [key]: val } : sl));

  const openNew = () => {
    setForm({ plan_id: plans[0]?.id??'', customer_name:'', customer_phone:'',
      start_date: format(new Date(),'yyyy-MM-dd'), status:'active', notes:'' });
    setScheduleSlots([{ day_of_week:1, start_time:`${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id:courts[0]?.id??'' }]);
    setError(''); setSuccess(''); setView('form');
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    setForm(f => ({ ...f, plan_id: planId }));
    setScheduleSlots(prev => {
      const result = [...prev];
      while (result.length < plan.sessions_per_week)
        result.push({ day_of_week:3, start_time:`${settings.opening_hour.toString().padStart(2,'0')}:00`, court_id:courts[0]?.id??'' });
      return result.slice(0, plan.sessions_per_week);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    if (!form.plan_id) { setError('Pilih paket'); setSaving(false); return; }
    if (!selectedPlan) { setSaving(false); return; }
    if (scheduleSlots.length !== selectedPlan.sessions_per_week) {
      setError(`Paket ini butuh ${selectedPlan.sessions_per_week} jadwal/minggu`); setSaving(false); return;
    }
    if (selectedPlan.sessions_per_week === 2 && scheduleSlots[0].day_of_week === scheduleSlots[1].day_of_week) {
      setError('Hari jadwal tidak boleh sama'); setSaving(false); return;
    }
    const endDate = format(addMonths(parseISO(form.start_date), 1), 'yyyy-MM-dd');
    const totalSessions = selectedPlan.sessions_per_week * 4;
    const { data: mb, error: mbErr } = await supabase.from('memberships').insert({
      plan_id: form.plan_id, customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(), start_date: form.start_date,
      end_date: endDate, status: form.status, notes: form.notes.trim()||null,
      total_sessions: totalSessions, used_sessions: 0,
    }).select().single();
    if (mbErr || !mb) { setError('Gagal: '+(mbErr?.message??'')); setSaving(false); return; }
    await supabase.from('membership_schedules').insert(
      scheduleSlots.map(s => ({ membership_id: mb.id, day_of_week: s.day_of_week, start_time: s.start_time, court_id: s.court_id||null }))
    );
    const sessions = generateMonthlySessions(form.start_date, scheduleSlots, selectedPlan.sessions_per_week, selectedPlan.hours_per_session);
    if (sessions.length > 0) {
      await supabase.from('bookings').insert(
        sessions.map(s => ({
          customer_name: form.customer_name.trim(), customer_phone: form.customer_phone.trim(),
          booking_date: s.date, start_time: s.start_time, end_time: s.end_time,
          duration_hours: Math.round(selectedPlan.hours_per_session),
          status: form.status === 'active' ? 'confirmed' : 'pending',
          notes: `[Langganan] ${selectedPlan.name}`, court_id: scheduleSlots[0]?.court_id||null,
        }))
      );
    }
    setSaving(false);
    setSuccess(`Berhasil! ${sessions.length} sesi otomatis dijadwalkan.`);
    refetch();
    setTimeout(() => { setView('list'); setSuccess(''); }, 2000);
  };

  const updateStatus = async (id: string, status: MembershipStatus) => {
    await supabase.from('memberships').update({ status }).eq('id', id);
    refetch();
  };

  const deleteMembership = async (id: string) => {
    if (!confirm('Yakin hapus membership? Booking yang sudah dibuat tidak akan terhapus.')) return;
    await supabase.from('memberships').delete().eq('id', id);
    refetch();
    if (view === 'detail') setView('list');
  };

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background:'#0D1F16' }}>
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
      ? generateMonthlySessions(selected.start_date, selected.schedules, selected.plan?.sessions_per_week??1, selected.plan?.hours_per_session??2)
      : [];
    return (
      <AdminLayout courtName={settings.court_name}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setView('list')} className="text-[#74C69D]/50 hover:text-[#74C69D] text-sm transition-colors">← Kembali</button>
            <h1 className="text-xl font-bold text-white font-display">Detail Membership</h1>
          </div>
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
                { label:'Paket',  value: selected.plan?.name??'-' },
                { label:'Periode',value: `${format(parseISO(selected.start_date),'d MMM',{locale:id})} – ${format(parseISO(selected.end_date),'d MMM yyyy',{locale:id})}` },
                { label:'Sesi',   value: `${selected.used_sessions} / ${selected.total_sessions} sesi` },
                { label:'Harga',  value: selected.plan ? `Rp ${selected.plan.price.toLocaleString('id')}` : '-' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl border border-[#52B788]/10 bg-[#52B788]/5">
                  <div className="text-[10px] text-[#74C69D]/40 uppercase tracking-wide font-bold mb-1">{item.label}</div>
                  <div className="text-white font-medium text-sm">{item.value}</div>
                </div>
              ))}
            </div>
            {selected.notes && <div className="mt-3 p-3 rounded-xl border border-[#52B788]/10 bg-[#52B788]/5 text-xs text-[#74C69D]/60">📝 {selected.notes}</div>}
          </AdminCard>
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
                        {sch.start_time.slice(0,5)} – {(() => { const [h] = sch.start_time.split(':').map(Number); return `${(h+(selected.plan?.hours_per_session??2)).toString().padStart(2,'0')}:00`; })()} WIB
                        {sch.court && <span className="ml-1">· {sch.court.name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-[#74C69D]/40 text-sm">Belum ada jadwal</p>}
          </AdminCard>
          <AdminCard>
            <AdminSectionHeader title={`🗓 Sesi Bulan Ini (${sessions.length} sesi)`}/>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-[#52B788]/10 bg-[#52B788]/3">
                  <span className="text-[#74C69D]/40 text-xs w-6 text-center font-bold">{i+1}</span>
                  <span className="text-[#74C69D]/60 text-xs">{DAY_SHORT[parseISO(s.date).getDay()]}</span>
                  <span className="text-white text-xs font-medium">{format(parseISO(s.date),'d MMM yyyy',{locale:id})}</span>
                  <span className="text-[#52B788] text-xs ml-auto">{s.start_time}–{s.end_time}</span>
                </div>
              ))}
            </div>
          </AdminCard>
          <div className="flex flex-wrap gap-2">
            {selected.status === 'pending' && (
              <AdminButton variant="primary" onClick={() => { updateStatus(selected.id,'active'); setSelected(s=>s?{...s,status:'active'}:s); }}>✓ Aktifkan</AdminButton>
            )}
            {selected.status === 'active' && (
              <AdminButton variant="secondary" onClick={() => { updateStatus(selected.id,'cancelled'); setSelected(s=>s?{...s,status:'cancelled'}:s); }}>Batalkan</AdminButton>
            )}
            <AdminButton variant="danger" onClick={() => deleteMembership(selected.id)}>🗑️ Hapus</AdminButton>
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
            <AdminSectionHeader title="📦 Pilih Paket"/>
            <div className="grid sm:grid-cols-2 gap-3">
              {plans.filter(p=>p.is_active).map(plan => (
                <button key={plan.id} type="button" onClick={() => handlePlanChange(plan.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${form.plan_id===plan.id ? 'border-[#40916C] bg-[#40916C]/15' : 'border-[#52B788]/15 bg-white/2 hover:border-[#52B788]/35'}`}>
                  <div className="font-bold text-white font-display text-sm">{plan.sessions_per_week>=2?'🥇':'🥈'} {plan.name}</div>
                  {plan.description && <div className="text-[#74C69D]/50 text-xs mt-0.5">{plan.description}</div>}
                  <div className="mt-2 text-[#52B788] font-bold">Rp {plan.price.toLocaleString('id')}<span className="text-[#74C69D]/40 font-normal text-xs">/bln</span></div>
                  <div className="flex gap-1.5 flex-wrap mt-1">
                    {[`${plan.hours_per_session}j/sesi`, `${plan.sessions_per_week}×/mgg`, `${plan.sessions_per_week*4} sesi/bln`].map(t=>(
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-[#52B788]/20 bg-[#52B788]/10 text-[#74C69D]/60">{t}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </AdminCard>
          {/* Customer */}
          <AdminCard>
            <AdminSectionHeader title="👤 Data Customer"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Nama *</label><input type="text" required value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))} className={inputCls} placeholder="Budi Santoso"/></div>
              <div><label className={labelCls}>No. WA *</label><input type="tel" required value={form.customer_phone} onChange={e=>setForm(f=>({...f,customer_phone:e.target.value}))} className={inputCls} placeholder="081234567890"/></div>
            </div>
          </AdminCard>
          {/* Jadwal */}
          {selectedPlan && (
            <AdminCard>
              <AdminSectionHeader title={`📅 Jadwal (${selectedPlan.sessions_per_week}×/minggu)`}/>
              <div className="space-y-3">
                {scheduleSlots.map((slot, i) => (
                  <div key={i} className="p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
                    <div className="text-xs font-bold text-[#74C69D]/50 mb-3 uppercase tracking-wide">Jadwal {i+1}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className={labelCls}>Hari</label>
                        <select value={slot.day_of_week} onChange={e=>setSlot(i,'day_of_week',Number(e.target.value))} className={selectCls} style={{colorScheme:'dark'}}>
                          {DAY_NAMES.map((d,idx)=><option key={idx} value={idx} style={{background:'#0D1F16'}}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Jam Mulai</label>
                        <select value={slot.start_time} onChange={e=>setSlot(i,'start_time',e.target.value)} className={selectCls} style={{colorScheme:'dark'}}>
                          {Array.from({length:settings.closing_hour-settings.opening_hour-Math.round(selectedPlan.hours_per_session)+1},(_,h)=>{
                            const hour=settings.opening_hour+h; const val=`${hour.toString().padStart(2,'0')}:00`;
                            return <option key={val} value={val} style={{background:'#0D1F16'}}>{val} – {(hour+Math.round(selectedPlan.hours_per_session)).toString().padStart(2,'00')}:00</option>;
                          })}
                        </select>
                      </div>
                      {courts.length > 1 && (
                        <div>
                          <label className={labelCls}>Lapangan</label>
                          <select value={slot.court_id} onChange={e=>setSlot(i,'court_id',e.target.value)} className={selectCls} style={{colorScheme:'dark'}}>
                            {courts.map(c=><option key={c.id} value={c.id} style={{background:'#0D1F16'}}>{c.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-[#74C69D]/40">
                      ⏰ Setiap {DAY_NAMES[slot.day_of_week]}, {slot.start_time} – {`${(parseInt(slot.start_time)+Math.round(selectedPlan.hours_per_session)).toString().padStart(2,'0')}:00`} WIB
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
          {/* Periode */}
          <AdminCard>
            <AdminSectionHeader title="📆 Periode & Status"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tanggal Mulai *</label>
                <input type="date" required value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} className={`${inputCls} bg-[#0D1F16]`} style={{colorScheme:'dark'}}/>
                {form.start_date && <p className="text-xs text-[#74C69D]/40 mt-1">Berakhir: {format(addMonths(parseISO(form.start_date),1),'d MMMM yyyy',{locale:id})}</p>}
              </div>
              <div>
                <label className={labelCls}>Status Awal</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as MembershipStatus}))} className={selectCls} style={{colorScheme:'dark'}}>
                  <option value="active" style={{background:'#0D1F16'}}>Aktif (langsung confirmed)</option>
                  <option value="pending" style={{background:'#0D1F16'}}>Pending (menunggu bayar)</option>
                </select>
              </div>
            </div>
            <div className="mt-3"><label className={labelCls}>Catatan</label><textarea value={form.notes} rows={2} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={`${inputCls} resize-none`} placeholder="Catatan khusus..."/></div>
          </AdminCard>
          {error   && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
          {success && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ {success}</div>}
          <div className="flex gap-3 pb-8">
            <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving || !form.plan_id}>
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Menyimpan...</> : '✓ Buat Membership'}
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setView('list')}>Batal</AdminButton>
          </div>
        </form>
      </div>
    </AdminLayout>
  );

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  const stats = {
    all: memberships.length,
    active: memberships.filter(m=>m.status==='active').length,
    pending: memberships.filter(m=>m.status==='pending').length,
    expired: memberships.filter(m=>m.status==='expired').length,
    cancelled: memberships.filter(m=>m.status==='cancelled').length,
  };

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white font-display">🎫 Manajemen Langganan</h1>
            <p className="text-[#74C69D]/50 text-sm mt-0.5">Kelola paket member bulanan lapangan</p>
          </div>
          <div className="sm:ml-auto"><AdminButton variant="primary" onClick={openNew}>+ Tambah Member</AdminButton></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_FILTERS.filter(f=>f.id!=='cancelled').map(f => {
            const count = f.id==='all' ? stats.all : stats[f.id as keyof typeof stats];
            return (
              <button key={f.id} onClick={() => setFilterStatus(f.id as MembershipStatus|'all')}
                className={`rounded-xl p-3 text-left border-2 transition-all ${filterStatus===f.id ? 'border-[#40916C] bg-[#40916C]/15' : 'border-[#52B788]/10 bg-white/2 hover:border-[#52B788]/25'}`}>
                <div className="text-2xl font-bold font-display text-white">{count}</div>
                <div className="text-xs text-[#74C69D]/50 mt-0.5">{f.label}</div>
              </button>
            );
          })}
        </div>

        {/* ─── PLAN MANAGER ─── */}
        {!plansLoading && (
          <PlanManager plans={plans} onRefresh={() => setRefetchPlans(v => v + 1)}/>
        )}

        {/* Search + filter */}
        <div className="rounded-2xl border border-[#52B788]/15 p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
            {STATUS_FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilterStatus(f.id as MembershipStatus|'all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filterStatus===f.id ? 'bg-[#40916C] border-[#40916C] text-white' : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'}`}>
                {f.label}
              </button>
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

        {/* Member list */}
        {loading ? (
          <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-20 rounded-2xl animate-pulse border border-[#52B788]/10" style={{background:'rgba(82,183,136,0.04)'}}/>)}</div>
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
                        <span className="text-[10px] text-[#74C69D]/40 border border-[#52B788]/15 px-2 py-0.5 rounded-full">{m.plan?.name??'–'}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[#74C69D]/40">
                        <span>📱 {m.customer_phone}</span>
                        <span>📅 s/d {format(parseISO(m.end_date),'d MMM yyyy',{locale:id})}</span>
                        <span>🗓 {m.schedules?.map(s=>DAY_SHORT[s.day_of_week]).join(' & ')} · {m.schedules?.[0]?.start_time.slice(0,5)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5">
                          <div className="h-1.5 rounded-full bg-[#40916C] transition-all" style={{ width:`${pct}%` }}/>
                        </div>
                        <span className="text-[10px] text-[#74C69D]/40 shrink-0">{m.used_sessions}/{m.total_sessions} sesi</span>
                      </div>
                    </div>
                    <span className="text-[#74C69D]/30 text-xs shrink-0">Lihat →</span>
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
