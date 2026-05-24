'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useEvents } from '@/hooks/useEvents';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import {
  BadmintonEvent, EventCategory, EventStatus,
  EVENT_CATEGORY_CONFIG, EVENT_STATUS_CONFIG,
} from '@/types/booking';

const EMPTY_FORM = {
  title: '', description: '', category: 'tournament' as EventCategory,
  status: 'upcoming' as EventStatus,
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date:   format(new Date(), 'yyyy-MM-dd'),
  start_time: '08:00',
  registration_deadline: '',
  max_participants: '',
  prize_pool: '', entry_fee: '0',
  contact_wa: '', image_url: '',
  is_published: true,
};

type FormState = typeof EMPTY_FORM;

export default function AdminEventsPage() {
  const { ready }            = useAdminAuth();
  const { settings }         = useSettings();
  const { can }              = useUserRole();
  const { events, loading, refetch } = useEvents(false);

  const [view, setView]         = useState<'list' | 'form'>('list');
  const [editing, setEditing]   = useState<BadmintonEvent | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Auth guard
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
    placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 transition-all text-sm`;
  const labelClass = "block text-xs font-semibold text-[#74C69D]/70 mb-1.5";

  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, contact_wa: settings.whatsapp_number });
    setError(''); setSuccess('');
    setView('form');
  };

  const openEdit = (ev: BadmintonEvent) => {
    setEditing(ev);
    setForm({
      title:                 ev.title,
      description:           ev.description ?? '',
      category:              ev.category,
      status:                ev.status,
      start_date:            ev.start_date,
      end_date:              ev.end_date,
      start_time:            ev.start_time?.slice(0,5) ?? '08:00',
      registration_deadline: ev.registration_deadline ?? '',
      max_participants:      ev.max_participants ? String(ev.max_participants) : '',
      prize_pool:            ev.prize_pool ?? '',
      entry_fee:             String(ev.entry_fee),
      contact_wa:            ev.contact_wa ?? settings.whatsapp_number,
      image_url:             ev.image_url ?? '',
      is_published:          ev.is_published,
    });
    setError(''); setSuccess('');
    setView('form');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);

    if (!form.title.trim()) { setError('Judul event wajib diisi'); setSaving(false); return; }
    if (form.end_date < form.start_date) { setError('Tanggal selesai tidak boleh sebelum tanggal mulai'); setSaving(false); return; }

    const payload = {
      title:                 form.title.trim(),
      description:           form.description.trim() || null,
      category:              form.category,
      status:                form.status,
      start_date:            form.start_date,
      end_date:              form.end_date,
      start_time:            form.start_time || null,
      registration_deadline: form.registration_deadline || null,
      max_participants:      form.max_participants ? Number(form.max_participants) : null,
      prize_pool:            form.prize_pool.trim() || null,
      entry_fee:             Number(form.entry_fee) || 0,
      contact_wa:            form.contact_wa.trim() || null,
      image_url:             form.image_url.trim() || null,
      is_published:          form.is_published,
    };

    const { error: err } = editing
      ? await supabase.from('events').update(payload).eq('id', editing.id)
      : await supabase.from('events').insert(payload);

    setSaving(false);
    if (err) { setError('Gagal menyimpan: ' + err.message); return; }

    setSuccess(editing ? 'Event berhasil diperbarui!' : 'Event berhasil ditambahkan!');
    refetch();
    setTimeout(() => { setView('list'); setSuccess(''); }, 1500);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setDeleteConfirm(null);
    refetch();
  };

  const togglePublish = async (ev: BadmintonEvent) => {
    await supabase.from('events').update({ is_published: !ev.is_published }).eq('id', ev.id);
    refetch();
  };

  const filtered = events.filter(e => filterStatus === 'all' || e.status === filterStatus);

  // ── LIST VIEW ────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <AdminLayout courtName={settings.court_name}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white font-display">🏆 Manajemen Event</h1>
              <p className="text-[#74C69D]/50 text-sm mt-0.5">Kelola pertandingan dan perlombaan badminton</p>
            </div>
            <div className="sm:ml-auto flex gap-2">
              <a href="/events" target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#52B788]/20 text-[#74C69D]/60 hover:text-[#74C69D] text-xs transition-colors hover:border-[#52B788]/40">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Lihat Publik
              </a>
              <AdminButton variant="primary" onClick={openNew}>
                + Tambah Event
              </AdminButton>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { status:'all',       label:'Total',       val: events.length,                                    dot:'bg-white/30'            },
              { status:'upcoming',  label:'Akan Datang', val: events.filter(e=>e.status==='upcoming').length,   dot:'bg-[#52B788] animate-pulse' },
              { status:'ongoing',   label:'Berlangsung', val: events.filter(e=>e.status==='ongoing').length,    dot:'bg-yellow-400 animate-pulse' },
              { status:'completed', label:'Selesai',     val: events.filter(e=>e.status==='completed').length,  dot:'bg-white/20'            },
            ] as { status: EventStatus|'all'; label: string; val: number; dot: string }[]).map(s => (
              <button key={s.status} onClick={() => setFilterStatus(s.status)}
                className={`rounded-xl p-3 text-left border-2 transition-all ${
                  filterStatus === s.status
                    ? 'border-[#40916C] bg-[#40916C]/15'
                    : 'border-[#52B788]/10 bg-white/2 hover:border-[#52B788]/25'
                }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`}/>
                  <span className="text-xs text-[#74C69D]/50 font-medium">{s.label}</span>
                </div>
                <div className="text-2xl font-bold font-display text-white">{s.val}</div>
              </button>
            ))}
          </div>

          {/* Event list */}
          {loading ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse border border-[#52B788]/10" style={{background:'rgba(82,183,136,0.04)'}}/>
            ))}</div>
          ) : filtered.length === 0 ? (
            <AdminCard>
              <div className="py-16 text-center">
                <div className="text-5xl mb-3">🏸</div>
                <h3 className="text-white font-bold font-display mb-1">Belum Ada Event</h3>
                <p className="text-[#74C69D]/40 text-sm mb-4">Tambahkan pertandingan atau perlombaan pertama.</p>
                <AdminButton variant="primary" onClick={openNew}>+ Tambah Event Pertama</AdminButton>
              </div>
            </AdminCard>
          ) : (
            <div className="space-y-3">
              {filtered.map(ev => {
                const cat = EVENT_CATEGORY_CONFIG[ev.category];
                const sta = EVENT_STATUS_CONFIG[ev.status];
                const startDate = parseISO(ev.start_date);
                return (
                  <div key={ev.id} className={`rounded-2xl border border-[#52B788]/15 p-4 transition-all ${!ev.is_published ? 'opacity-50' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.color}`}>
                            {cat.icon} {cat.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${sta.bg} ${sta.border} ${sta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`}/>{sta.label}
                          </span>
                          {!ev.is_published && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/30">
                              Disembunyikan
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white font-display text-sm">{ev.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-[#74C69D]/40">
                          <span>📅 {format(startDate, 'EEE, d MMM yyyy', { locale: id })}</span>
                          {ev.prize_pool && <span>🏆 {ev.prize_pool}</span>}
                          {ev.max_participants && <span>👥 {ev.current_participants}/{ev.max_participants}</span>}
                          {ev.entry_fee > 0 && <span>💰 Rp {ev.entry_fee.toLocaleString('id')}</span>}
                          {ev.entry_fee === 0 && <span className="text-[#52B788]">🆓 Gratis</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <AdminButton variant="ghost" className="text-xs px-2.5 py-1.5"
                          onClick={() => togglePublish(ev)}>
                          {ev.is_published ? '👁️ Sembunyikan' : '👁️ Publikasikan'}
                        </AdminButton>
                        <AdminButton variant="secondary" className="text-xs px-2.5 py-1.5"
                          onClick={() => openEdit(ev)}>
                          ✏️ Edit
                        </AdminButton>
                        {deleteConfirm === ev.id ? (
                          <div className="flex items-center gap-1">
                            <AdminButton variant="danger" className="text-xs px-2.5 py-1.5"
                              onClick={() => handleDelete(ev.id)}>
                              Yakin Hapus
                            </AdminButton>
                            <AdminButton variant="ghost" className="text-xs px-2 py-1.5"
                              onClick={() => setDeleteConfirm(null)}>Batal</AdminButton>
                          </div>
                        ) : (
                          <AdminButton variant="danger" className="text-xs px-2.5 py-1.5"
                            onClick={() => setDeleteConfirm(ev.id)}>
                            🗑️
                          </AdminButton>
                        )}
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

  // ── FORM VIEW ────────────────────────────────────────────────────────────
  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setView('list')}
            className="text-[#74C69D]/50 hover:text-[#74C69D] transition-colors text-sm">← Kembali</button>
          <h1 className="text-xl font-bold text-white font-display">
            {editing ? '✏️ Edit Event' : '➕ Tambah Event Baru'}
          </h1>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Informasi Dasar */}
          <AdminCard>
            <AdminSectionHeader title="📋 Informasi Dasar"/>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Judul Event *</label>
                <input type="text" value={form.title} required
                  onChange={e => set('title', e.target.value)}
                  className={inputClass} placeholder="Turnamen Badminton Open 2025"/>
              </div>
              <div>
                <label className={labelClass}>Deskripsi</label>
                <textarea value={form.description} rows={3}
                  onChange={e => set('description', e.target.value)}
                  className={inputClass + " resize-none"}
                  placeholder="Deskripsi singkat tentang event ini..."/>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Kategori *</label>
                  <select value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className={inputClass + " bg-[#0D1F16]"}>
                    {Object.entries(EVENT_CATEGORY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status *</label>
                  <select value={form.status}
                    onChange={e => set('status', e.target.value)}
                    className={inputClass + " bg-[#0D1F16]"}>
                    {Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Tanggal & Waktu */}
          <AdminCard>
            <AdminSectionHeader title="📅 Tanggal & Waktu"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tanggal Mulai *</label>
                <input type="date" value={form.start_date} required
                  onChange={e => set('start_date', e.target.value)}
                  className={inputClass + " bg-[#0D1F16]"}/>
              </div>
              <div>
                <label className={labelClass}>Tanggal Selesai *</label>
                <input type="date" value={form.end_date} required min={form.start_date}
                  onChange={e => set('end_date', e.target.value)}
                  className={inputClass + " bg-[#0D1F16]"}/>
              </div>
              <div>
                <label className={labelClass}>Jam Mulai</label>
                <input type="time" value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                  className={inputClass + " bg-[#0D1F16]"}/>
              </div>
              <div>
                <label className={labelClass}>Deadline Pendaftaran</label>
                <input type="date" value={form.registration_deadline}
                  max={form.start_date}
                  onChange={e => set('registration_deadline', e.target.value)}
                  className={inputClass + " bg-[#0D1F16]"}/>
              </div>
            </div>
          </AdminCard>

          {/* Detail Event */}
          <AdminCard>
            <AdminSectionHeader title="🏆 Detail Event"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Total Hadiah</label>
                <input type="text" value={form.prize_pool}
                  onChange={e => set('prize_pool', e.target.value)}
                  className={inputClass} placeholder="Rp 2.000.000"/>
              </div>
              <div>
                <label className={labelClass}>Biaya Pendaftaran (Rp)</label>
                <input type="number" value={form.entry_fee} min={0}
                  onChange={e => set('entry_fee', e.target.value)}
                  className={inputClass}/>
                {Number(form.entry_fee) === 0 && (
                  <p className="text-xs text-[#52B788] mt-1">🆓 Gratis</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Maks Peserta</label>
                <input type="number" value={form.max_participants} min={0}
                  onChange={e => set('max_participants', e.target.value)}
                  className={inputClass} placeholder="32"/>
              </div>
              <div>
                <label className={labelClass}>No WA Kontak Event</label>
                <input type="tel" value={form.contact_wa}
                  onChange={e => set('contact_wa', e.target.value)}
                  className={inputClass} placeholder="6281234567890"/>
              </div>
            </div>
          </AdminCard>

          {/* Media */}
          <AdminCard>
            <AdminSectionHeader title="🖼️ Media"/>
            <div>
              <label className={labelClass}>URL Gambar / Poster Event</label>
              <input type="url" value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                className={inputClass} placeholder="https://..."/>
              <p className="text-[10px] text-[#74C69D]/30 mt-1">
                Upload ke Cloudinary/Supabase Storage, paste URL di sini. Disarankan 800×450px.
              </p>
              {form.image_url && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt="Preview"
                    className="w-full max-h-40 object-cover rounded-xl border border-[#52B788]/20"
                    onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
                </div>
              )}
            </div>
          </AdminCard>

          {/* Publikasi */}
          <AdminCard>
            <AdminSectionHeader title="📢 Publikasi"/>
            <div className="flex items-center justify-between p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
              <div>
                <div className="text-white text-sm font-medium">Tampilkan ke Publik</div>
                <div className="text-[#74C69D]/50 text-xs mt-0.5">
                  {form.is_published ? 'Event terlihat di halaman /events' : 'Event disembunyikan dari publik'}
                </div>
              </div>
              <button type="button" onClick={() => set('is_published', !form.is_published)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_published ? 'bg-[#40916C]' : 'bg-white/10'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_published ? 'translate-x-6' : 'translate-x-1'}`}/>
              </button>
            </div>
          </AdminCard>

          {error   && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
          {success && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm animate-fade-up">✅ {success}</div>}

          <div className="flex gap-3 pb-8">
            <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving
                ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
                : editing ? '💾 Simpan Perubahan' : '➕ Tambah Event'}
            </AdminButton>
            <AdminButton type="button" variant="secondary" onClick={() => setView('list')}>
              Batal
            </AdminButton>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
