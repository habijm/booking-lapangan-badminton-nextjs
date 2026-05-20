'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminInput, AdminTextarea, AdminButton, AdminSectionHeader } from '@/components/admin/AdminCard';
import { DEFAULT_SETTINGS, SETTINGS_LABELS, CourtSettings } from '@/lib/config';

export default function SettingsPage() {
  const { ready }                     = useAdminAuth();
  const router                        = useRouter();
  const { settings, loading }         = useSettings();
  const { can, loading: roleLoading } = useUserRole();
  const [form, setForm]               = useState<CourtSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [error,  setError]            = useState('');

  useEffect(() => {
    if (!loading) setForm(settings);
  }, [settings, loading]);

  // Auth guard — AFTER all hooks
  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1F16' }}>
      <span className="inline-block w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
    </div>
  );

  if (!roleLoading && !can('settings')) {
    return (
      <AdminLayout courtName={settings.court_name}>
        <div className="max-w-md mx-auto px-4 pt-20 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="font-bold text-white font-display text-xl mb-2">Akses Ditolak</h2>
          <p className="text-[#74C69D]/60 text-sm">Anda tidak memiliki izin mengakses halaman ini.</p>
          <AdminButton onClick={() => router.push('/admin/dashboard')} className="mt-4">← Kembali</AdminButton>
        </div>
      </AdminLayout>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    if (Number(form.opening_hour) >= Number(form.closing_hour)) {
      setError('Jam buka harus lebih kecil dari jam tutup'); setSaving(false); return;
    }
    const { error: err } = await supabase.from('settings').upsert(
      Object.entries(form).map(([key, value]) => ({ key, value: String(value) })),
      { onConflict: 'key' }
    );
    setSaving(false);
    if (err) { setError('Gagal menyimpan: ' + err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/30 focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/10 transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-[#74C69D]/80 mb-1.5";

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-white font-display">⚙️ Pengaturan Aplikasi</h1>
          <p className="text-[#74C69D]/50 text-sm mt-1">Perubahan langsung berlaku di halaman publik tanpa deploy ulang</p>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{background:'rgba(82,183,136,0.05)'}}/>
          ))}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">

            {/* Info GOR */}
            <AdminCard>
              <AdminSectionHeader title="🏟️ Informasi GOR"/>
              <div className="grid sm:grid-cols-2 gap-4">
                {(['court_name','court_address','whatsapp_number'] as (keyof CourtSettings)[]).map(key => (
                  <div key={key} className={key === 'court_address' ? 'sm:col-span-2' : ''}>
                    <label className={labelClass}>{SETTINGS_LABELS[key]}</label>
                    <input type="text" value={String(form[key])} className={inputClass}
                      placeholder={String(DEFAULT_SETTINGS[key])}
                      onChange={e => setForm(f => ({...f,[key]:e.target.value}))}/>
                  </div>
                ))}
              </div>
            </AdminCard>

            {/* Jam & Harga */}
            <AdminCard>
              <AdminSectionHeader title="⏰ Jam Operasional & Harga"/>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(['opening_hour','closing_hour','price_per_hour','booking_window_days','cancellation_window_hours'] as (keyof CourtSettings)[]).map(key => (
                  <div key={key}>
                    <label className={labelClass}>{SETTINGS_LABELS[key]}</label>
                    <input type="number" value={String(form[key])} min={0} className={inputClass}
                      onChange={e => setForm(f => ({...f,[key]:Number(e.target.value)}))}/>
                    {key === 'price_per_hour' && Number(form[key]) > 0 && (
                      <p className="text-xs text-[#74C69D]/50 mt-1">= Rp {Number(form[key]).toLocaleString('id')}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-xs text-[#74C69D]">
                ⏰ Buka <strong className="text-white">{form.opening_hour}:00</strong> –{' '}
                <strong className="text-white">{form.closing_hour}:00</strong> WIB
                <span className="text-[#74C69D]/50 ml-2">({Number(form.closing_hour) - Number(form.opening_hour)} jam operasional)</span>
              </div>
            </AdminCard>

            {/* Pengumuman */}
            <AdminCard>
              <AdminSectionHeader title="📢 Pengumuman Publik"/>
              <AdminTextarea value={form.announcement} rows={3}
                placeholder="Kosongkan jika tidak ada pengumuman. Contoh: Tutup 25 Desember 2025"
                onChange={e => setForm(f => ({...f,announcement:e.target.value}))}/>
              <p className="text-xs text-[#74C69D]/40 mt-2">Tampil sebagai banner kuning di halaman publik.</p>
            </AdminCard>

            {/* Notif WA */}
            <AdminCard>
              <AdminSectionHeader title="🔔 Notifikasi WhatsApp Otomatis"/>
              <div className="flex items-center justify-between p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
                <div>
                  <div className="text-white text-sm font-medium">Aktifkan via Fonnte</div>
                  <div className="text-[#74C69D]/50 text-xs mt-0.5">
                    Customer otomatis dapat WA saat booking dikonfirmasi/dibatalkan.{' '}
                    <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-[#74C69D] hover:underline">Daftar Fonnte ↗</a>
                  </div>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f,fonnte_enabled:!f.fonnte_enabled}))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.fonnte_enabled?'bg-[#40916C]':'bg-white/10'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.fonnte_enabled?'translate-x-6':'translate-x-1'}`}/>
                </button>
              </div>
              {form.fonnte_enabled && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  ⚠️ Pastikan <strong>FONNTE_TOKEN</strong> sudah diset di environment variables.
                </div>
              )}
            </AdminCard>

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
            {saved  && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ Pengaturan berhasil disimpan!</div>}

            <div className="flex gap-3">
              <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</> : '💾 Simpan Pengaturan'}
              </AdminButton>
              <AdminButton type="button" variant="secondary" onClick={() => setForm(settings)}>Reset</AdminButton>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
