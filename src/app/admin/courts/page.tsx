'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCourts } from '@/hooks/useCourts';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useSettings } from '@/hooks/useSettings';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton, AdminInput } from '@/components/admin/AdminCard';
import { Court } from '@/types/booking';

export default function CourtsPage() {
  const { ready }                    = useAdminAuth();
  const router                       = useRouter();
  const { settings }                 = useSettings();
  const { courts, loading, refetch } = useCourts();
  const { can }                      = useUserRole();
  const [form, setForm]              = useState({ name: '', description: '', price_per_hour: 30000 });
  const [editing, setEditing]        = useState<Court | null>(null);
  const [saving, setSaving]          = useState(false);
  const [error, setError]            = useState('');

  // Auth guard — AFTER all hooks
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    if (editing) {
      const { error: err } = await supabase.from('courts').update({
        name: form.name, description: form.description || null, price_per_hour: form.price_per_hour,
      }).eq('id', editing.id);
      if (err) { setError(err.message); setSaving(false); return; }
      setEditing(null);
    } else {
      const { error: err } = await supabase.from('courts').insert({
        name: form.name, description: form.description || null, price_per_hour: form.price_per_hour, is_active: true,
      });
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setForm({ name: '', description: '', price_per_hour: 30000 });
    setSaving(false); refetch();
  };

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">🏟️ Manajemen Lapangan</h1>
          <p className="text-[#74C69D]/50 text-sm mt-1">Tambah lapangan → selector otomatis muncul di halaman publik</p>
        </div>

        {/* Form */}
        {can('courts') && (
          <AdminCard>
            <AdminSectionHeader title={editing ? `✏️ Edit: ${editing.name}` : '➕ Tambah Lapangan Baru'}/>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <AdminInput label="Nama Lapangan *" value={form.name} required placeholder="Lapangan A"
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}/>
                <div>
                  <AdminInput label="Harga per Jam (Rp) *" type="number" value={form.price_per_hour} min={0} required
                    onChange={e => setForm(f => ({...f, price_per_hour: Number(e.target.value)}))}/>
                  {form.price_per_hour > 0 && (
                    <p className="text-xs text-[#74C69D]/50 mt-1">= Rp {form.price_per_hour.toLocaleString('id')}/jam</p>
                  )}
                </div>
              </div>
              <AdminInput label="Deskripsi (opsional)" value={form.description} placeholder="Lapangan badminton standar dengan lantai vinyl"
                onChange={e => setForm(f => ({...f, description: e.target.value}))}/>
              {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
              <div className="flex gap-2">
                <AdminButton type="submit" variant="primary" disabled={saving}>
                  {saving ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</> : editing ? 'Simpan Perubahan' : 'Tambah Lapangan'}
                </AdminButton>
                {editing && (
                  <AdminButton type="button" variant="secondary"
                    onClick={() => { setEditing(null); setForm({name:'',description:'',price_per_hour:30000}); setError(''); }}>
                    Batal
                  </AdminButton>
                )}
              </div>
            </form>
          </AdminCard>
        )}

        {/* List */}
        <AdminCard padding="none">
          <div className="px-5 py-4 border-b border-[#52B788]/10 flex items-center justify-between">
            <AdminSectionHeader title={`Daftar Lapangan (${courts.length})`} subtitle="Klik Nonaktifkan untuk sembunyikan dari publik"/>
            <AdminButton variant="ghost" onClick={refetch} className="text-xs">↻ Refresh</AdminButton>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{background:'rgba(82,183,136,0.05)'}}/>
            ))}</div>
          ) : courts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-2">🏟️</div>
              <p className="text-[#74C69D]/50 text-sm">Belum ada lapangan. Tambahkan di atas.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#52B788]/10">
              {courts.map(court => (
                <div key={court.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${court.is_active ? 'bg-[#52B788]' : 'bg-white/20'}`}/>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white font-display text-sm">{court.name}</div>
                    {court.description && <div className="text-xs text-[#74C69D]/50 mt-0.5">{court.description}</div>}
                    <div className="text-xs text-[#52B788] font-medium mt-0.5">Rp {court.price_per_hour.toLocaleString('id')}/jam</div>
                  </div>
                  <div className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex-shrink-0 ${
                    court.is_active ? 'bg-[#52B788]/15 text-[#74C69D] border-[#52B788]/20' : 'bg-white/5 text-white/30 border-white/10'
                  }`}>{court.is_active ? 'Aktif' : 'Nonaktif'}</div>
                  {can('courts') && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <AdminButton variant="ghost" className="text-xs px-2.5 py-1.5"
                        onClick={() => { setEditing(court); setForm({name:court.name,description:court.description??'',price_per_hour:court.price_per_hour}); }}>
                        Edit
                      </AdminButton>
                      <AdminButton variant={court.is_active ? 'secondary' : 'primary'} className="text-xs px-2.5 py-1.5"
                        onClick={async () => { await supabase.from('courts').update({is_active:!court.is_active}).eq('id',court.id); refetch(); }}>
                        {court.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </AdminButton>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminCard>

        <div className="p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5 text-xs text-[#74C69D]/70">
          <strong className="text-[#74C69D]">💡 Multi-Lapangan:</strong> Setelah ada lebih dari 1 lapangan aktif, halaman publik otomatis menampilkan selector lapangan dengan jadwal dan harga terpisah.
        </div>
      </div>
    </AdminLayout>
  );
}
