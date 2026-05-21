'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import { DEFAULT_SETTINGS, SETTINGS_LABELS, CourtSettings, BannerType } from '@/lib/config';

type SettingsFlat = Record<string, string>;

function toFlat(s: CourtSettings): SettingsFlat {
  return {
    court_name:               s.court_name,
    court_address:            s.court_address,
    whatsapp_number:          s.whatsapp_number,
    opening_hour:             String(s.opening_hour),
    closing_hour:             String(s.closing_hour),
    price_per_hour:           String(s.price_per_hour),
    booking_window_days:      String(s.booking_window_days),
    cancellation_window_hours:String(s.cancellation_window_hours),
    announcement:             s.announcement,
    fonnte_enabled:           String(s.fonnte_enabled),
    // Banners
    banner_promo_enabled:     String(s.banners.promo_enabled),
    banner_promo_type:        s.banners.promo_type,
    banner_promo_title:       s.banners.promo_title,
    banner_promo_body:        s.banners.promo_body,
    banner_promo_cta_text:    s.banners.promo_cta_text,
    banner_promo_cta_url:     s.banners.promo_cta_url,
    banner_sponsor_enabled:   String(s.banners.sponsor_enabled),
    banner_sponsor_image:     s.banners.sponsor_image,
    banner_sponsor_title:     s.banners.sponsor_title,
    banner_sponsor_url:       s.banners.sponsor_url,
    banner_info_enabled:      String(s.banners.info_enabled),
    banner_info_text:         s.banners.info_text,
  };
}

export default function SettingsPage() {
  const { ready }                     = useAdminAuth();
  const router                        = useRouter();
  const { settings, loading }         = useSettings();
  const { can, loading: roleLoading } = useUserRole();
  const [form, setForm]               = useState<SettingsFlat>({});
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [error,  setError]            = useState('');
  const [activeTab, setActiveTab]     = useState<'general'|'banners'>('general');

  useEffect(() => {
    if (!loading) setForm(toFlat(settings));
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

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const toggle = (key: string) => setForm(f => ({ ...f, [key]: f[key] === 'true' ? 'false' : 'true' }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);

    if (Number(form.opening_hour) >= Number(form.closing_hour)) {
      setError('Jam buka harus lebih kecil dari jam tutup'); setSaving(false); return;
    }

    const upserts = Object.entries(form).map(([key, value]) => ({ key, value: String(value) }));
    const { error: err } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });

    setSaving(false);
    if (err) { setError('Gagal menyimpan: ' + err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputClass = `w-full px-4 py-2.5 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white
    placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/50 focus:bg-[#52B788]/8 transition-all text-sm`;
  const labelClass = "block text-xs font-semibold text-[#74C69D]/70 mb-1.5";

  const Toggle = ({ k, label, desc }: { k: string; label: string; desc?: string }) => (
    <div className="flex items-center justify-between p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
      <div>
        <div className="text-white text-sm font-medium">{label}</div>
        {desc && <div className="text-[#74C69D]/50 text-xs mt-0.5">{desc}</div>}
      </div>
      <button type="button" onClick={() => toggle(k)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${form[k] === 'true' ? 'bg-[#40916C]' : 'bg-white/10'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form[k] === 'true' ? 'translate-x-6' : 'translate-x-1'}`}/>
      </button>
    </div>
  );

  const BANNER_TYPES: { value: BannerType; label: string; preview: string }[] = [
    { value: 'promo',   label: '🎉 Promo',   preview: 'Hijau gelap — cocok untuk promo/diskon' },
    { value: 'info',    label: 'ℹ️ Info',    preview: 'Biru — cocok untuk pengumuman netral' },
    { value: 'warning', label: '⚠️ Penting', preview: 'Kuning/amber — cocok untuk peringatan' },
    { value: 'sponsor', label: '✨ Sponsor',  preview: 'Ungu — cocok untuk iklan mitra' },
  ];

  return (
    <AdminLayout courtName={settings.court_name}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white font-display">⚙️ Pengaturan Aplikasi</h1>
          <p className="text-[#74C69D]/50 text-sm mt-1">Perubahan langsung berlaku di halaman publik tanpa deploy ulang</p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex gap-1 p-1 rounded-xl border border-[#52B788]/15 mb-5"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          {([
            { id: 'general', label: '⚙️ Umum'      },
            { id: 'banners', label: '📢 Banner / Iklan' },
          ] as { id: typeof activeTab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[#40916C] text-white'
                  : 'text-[#74C69D]/50 hover:text-[#74C69D] hover:bg-[#52B788]/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({length:5}).map((_,i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{background:'rgba(82,183,136,0.05)'}}/>
          ))}</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">

            {/* ══ GENERAL TAB ══════════════════════════════════════════════ */}
            {activeTab === 'general' && (
              <>
                {/* Info GOR */}
                <AdminCard>
                  <AdminSectionHeader title="🏟️ Informasi GOR"/>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(['court_name','court_address','whatsapp_number'] as (keyof typeof SETTINGS_LABELS)[]).map(key => (
                      <div key={key} className={key === 'court_address' ? 'sm:col-span-2' : ''}>
                        <label className={labelClass}>{SETTINGS_LABELS[key]}</label>
                        <input type="text" value={form[key] ?? ''} className={inputClass}
                          placeholder={String(DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] ?? '')}
                          onChange={e => set(key, e.target.value)}/>
                      </div>
                    ))}
                  </div>
                </AdminCard>

                {/* Jam & Harga */}
                <AdminCard>
                  <AdminSectionHeader title="⏰ Jam Operasional & Harga"/>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(['opening_hour','closing_hour','price_per_hour','booking_window_days','cancellation_window_hours'] as (keyof typeof SETTINGS_LABELS)[]).map(key => (
                      <div key={key}>
                        <label className={labelClass}>{SETTINGS_LABELS[key]}</label>
                        <input type="number" value={form[key] ?? ''} min={0} className={inputClass}
                          onChange={e => set(key, e.target.value)}/>
                        {key === 'price_per_hour' && Number(form[key]) > 0 && (
                          <p className="text-xs text-[#74C69D]/40 mt-1">= Rp {Number(form[key]).toLocaleString('id')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-xs text-[#74C69D]">
                    ⏰ Buka <strong className="text-white">{form.opening_hour}:00</strong> – <strong className="text-white">{form.closing_hour}:00</strong> WIB
                    <span className="text-[#74C69D]/40 ml-2">({Number(form.closing_hour) - Number(form.opening_hour)} jam operasional)</span>
                  </div>
                </AdminCard>

                {/* Pengumuman */}
                <AdminCard>
                  <AdminSectionHeader title="📢 Pengumuman Navbar"/>
                  <textarea value={form.announcement ?? ''} rows={2}
                    onChange={e => set('announcement', e.target.value)}
                    className={inputClass + " resize-none"}
                    placeholder="Kosongkan jika tidak ada. Contoh: Tutup 25 Desember 2025 (Hari Natal)"/>
                  <p className="text-xs text-[#74C69D]/30 mt-2">Tampil sebagai banner kuning di bawah navbar.</p>
                </AdminCard>

                {/* Notif WA */}
                <AdminCard>
                  <AdminSectionHeader title="🔔 Notifikasi WhatsApp"/>
                  <Toggle k="fonnte_enabled" label="Aktifkan via Fonnte"
                    desc="Customer otomatis dapat WA saat booking dikonfirmasi/dibatalkan"/>
                  {form.fonnte_enabled === 'true' && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                      ⚠️ Pastikan <strong>FONNTE_TOKEN</strong> sudah diset di environment variables.
                    </div>
                  )}
                </AdminCard>
              </>
            )}

            {/* ══ BANNERS TAB ══════════════════════════════════════════════ */}
            {activeTab === 'banners' && (
              <>
                {/* Info posisi banner */}
                <div className="grid sm:grid-cols-3 gap-3 mb-2">
                  {[
                    { pos:'1', icon:'🎉', label:'Banner Promo', desc:'Di bawah hero, sebelum jadwal', key:'promo' },
                    { pos:'2', icon:'🖼️', label:'Banner Sponsor', desc:'Di antara jadwal dan cara booking', key:'sponsor' },
                    { pos:'3', icon:'📌', label:'Info Strip', desc:'Strip tipis di atas footer', key:'info' },
                  ].map(b => (
                    <div key={b.pos} className={`p-3 rounded-xl border text-center transition-all ${
                      form[`banner_${b.key}_enabled`] === 'true'
                        ? 'border-[#52B788]/40 bg-[#52B788]/10'
                        : 'border-[#52B788]/10 bg-white/2'
                    }`}>
                      <div className="text-xl mb-1">{b.icon}</div>
                      <div className="text-xs font-bold text-white">{b.label}</div>
                      <div className="text-[10px] text-[#74C69D]/40 mt-0.5">{b.desc}</div>
                      <div className={`text-[10px] font-semibold mt-1.5 ${form[`banner_${b.key}_enabled`] === 'true' ? 'text-[#52B788]' : 'text-white/20'}`}>
                        {form[`banner_${b.key}_enabled`] === 'true' ? '● Aktif' : '○ Nonaktif'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Banner Promo ── */}
                <AdminCard>
                  <AdminSectionHeader title="🎉 Banner Promo"
                    subtitle="Muncul di bawah hero section, bisa ditutup user"/>
                  <div className="space-y-4">
                    <Toggle k="banner_promo_enabled" label="Aktifkan Banner Promo"/>

                    {form.banner_promo_enabled === 'true' && (
                      <>
                        {/* Type selector */}
                        <div>
                          <label className={labelClass}>Tipe Banner</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {BANNER_TYPES.map(t => (
                              <button key={t.value} type="button"
                                onClick={() => set('banner_promo_type', t.value)}
                                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                  form.banner_promo_type === t.value
                                    ? 'border-[#52B788]/60 bg-[#52B788]/15 text-white'
                                    : 'border-[#52B788]/15 text-[#74C69D]/50 hover:border-[#52B788]/30'
                                }`}>
                                <div>{t.label}</div>
                                <div className="text-[10px] font-normal mt-0.5 opacity-60">{t.preview}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className={labelClass}>Judul Banner *</label>
                          <input type="text" value={form.banner_promo_title ?? ''} className={inputClass}
                            placeholder="Promo Akhir Tahun! 🎉"
                            onChange={e => set('banner_promo_title', e.target.value)}/>
                        </div>

                        <div>
                          <label className={labelClass}>Isi Teks Banner</label>
                          <textarea value={form.banner_promo_body ?? ''} rows={2}
                            className={inputClass + " resize-none"}
                            placeholder="Booking 2 jam gratis 1 jam setiap Senin–Jumat. Berlaku s/d 31 Desember."
                            onChange={e => set('banner_promo_body', e.target.value)}/>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Teks Tombol (opsional)</label>
                            <input type="text" value={form.banner_promo_cta_text ?? ''} className={inputClass}
                              placeholder="Booking Sekarang"
                              onChange={e => set('banner_promo_cta_text', e.target.value)}/>
                          </div>
                          <div>
                            <label className={labelClass}>URL Tombol (kosong = WA admin)</label>
                            <input type="url" value={form.banner_promo_cta_url ?? ''} className={inputClass}
                              placeholder="https://... (kosongkan untuk WA)"
                              onChange={e => set('banner_promo_cta_url', e.target.value)}/>
                          </div>
                        </div>

                        {/* Live preview */}
                        {form.banner_promo_title && (
                          <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                            <p className="text-[10px] text-[#74C69D]/40 mb-2 uppercase tracking-wide font-bold">Preview</p>
                            <div className="rounded-xl border border-[#52B788]/30 bg-[#0D2B1C] p-3">
                              <div className="flex items-start gap-3">
                                <span className="text-xl">🎉</span>
                                <div className="flex-1">
                                  <div className="font-bold text-white text-sm">{form.banner_promo_title}</div>
                                  {form.banner_promo_body && <p className="text-xs text-[#A8D5BC] mt-0.5">{form.banner_promo_body}</p>}
                                  {form.banner_promo_cta_text && (
                                    <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-[#40916C] text-white text-xs font-bold">
                                      {form.banner_promo_cta_text} →
                                    </span>
                                  )}
                                </div>
                                <span className="text-white/20 text-xs">✕</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AdminCard>

                {/* ── Banner Sponsor ── */}
                <AdminCard>
                  <AdminSectionHeader title="🖼️ Banner Sponsor / Iklan Gambar"
                    subtitle="Gambar penuh lebar, muncul di antara jadwal dan cara booking"/>
                  <div className="space-y-4">
                    <Toggle k="banner_sponsor_enabled" label="Aktifkan Banner Sponsor"/>

                    {form.banner_sponsor_enabled === 'true' && (
                      <>
                        <div>
                          <label className={labelClass}>URL Gambar * (disarankan 1200×300 px)</label>
                          <input type="url" value={form.banner_sponsor_image ?? ''} className={inputClass}
                            placeholder="https://example.com/gambar-sponsor.jpg"
                            onChange={e => set('banner_sponsor_image', e.target.value)}/>
                          <p className="text-[10px] text-[#74C69D]/30 mt-1">
                            Upload gambar ke Cloudinary/Supabase Storage/Google Drive lalu paste URL-nya
                          </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Teks Alt / Caption</label>
                            <input type="text" value={form.banner_sponsor_title ?? ''} className={inputClass}
                              placeholder="Disponsori oleh Mitra Kami"
                              onChange={e => set('banner_sponsor_title', e.target.value)}/>
                          </div>
                          <div>
                            <label className={labelClass}>URL Klik (opsional)</label>
                            <input type="url" value={form.banner_sponsor_url ?? ''} className={inputClass}
                              placeholder="https://website-sponsor.com"
                              onChange={e => set('banner_sponsor_url', e.target.value)}/>
                          </div>
                        </div>

                        {/* Image preview */}
                        {form.banner_sponsor_image && (
                          <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                            <p className="text-[10px] text-[#74C69D]/40 mb-2 uppercase tracking-wide font-bold">Preview</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.banner_sponsor_image}
                              alt={form.banner_sponsor_title || 'Sponsor'}
                              className="w-full h-auto max-h-40 object-cover rounded-xl"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AdminCard>

                {/* ── Info Strip ── */}
                <AdminCard>
                  <AdminSectionHeader title="📌 Info Strip"
                    subtitle="Baris tipis di atas footer — tidak mengganggu, mudah ditutup user"/>
                  <div className="space-y-4">
                    <Toggle k="banner_info_enabled" label="Aktifkan Info Strip"/>
                    {form.banner_info_enabled === 'true' && (
                      <>
                        <div>
                          <label className={labelClass}>Teks Info *</label>
                          <input type="text" value={form.banner_info_text ?? ''} className={inputClass}
                            placeholder="Tersedia juga perlengkapaan badminton. Hubungi admin untuk info."
                            onChange={e => set('banner_info_text', e.target.value)}/>
                        </div>
                        {form.banner_info_text && (
                          <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                            <p className="text-[10px] text-[#74C69D]/40 mb-2 uppercase tracking-wide font-bold">Preview</p>
                            <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-[#0D2B1C] border border-[#52B788]/10">
                              <div className="flex items-center gap-2 text-xs text-[#A8D5BC]/70">
                                <span className="text-[#52B788]">📌</span>
                                {form.banner_info_text}
                              </div>
                              <span className="text-white/20 text-xs flex-shrink-0">✕</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AdminCard>
              </>
            )}

            {/* Save actions */}
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
            {saved  && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ Pengaturan berhasil disimpan!</div>}

            <div className="flex gap-3 pb-6">
              <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving
                  ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
                  : '💾 Simpan Semua Pengaturan'}
              </AdminButton>
              <AdminButton type="button" variant="secondary"
                onClick={() => setForm(toFlat(settings))}>
                Reset
              </AdminButton>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
