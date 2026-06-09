'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/hooks/useSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminCard, AdminSectionHeader, AdminButton } from '@/components/admin/AdminCard';
import { DEFAULT_SETTINGS, SETTINGS_LABELS, CourtSettings, BannerType, parseClosedDates } from '@/lib/config';

type SettingsFlat = Record<string, string>;

function toFlat(s: CourtSettings): SettingsFlat {
  return {
    court_name:                s.court_name,
    court_address:             s.court_address,
    whatsapp_number:           s.whatsapp_number,
    opening_hour:              String(s.opening_hour),
    closing_hour:              String(s.closing_hour),
    price_per_hour:            String(s.price_per_hour),
    booking_window_days:       String(s.booking_window_days),
    cancellation_window_hours: String(s.cancellation_window_hours),
    announcement:              s.announcement,
    fonnte_enabled:            String(s.fonnte_enabled),
    closed_dates:              JSON.stringify(s.closed_dates ?? []),
    // Banners
    banner_promo_enabled:      String(s.banners.promo_enabled),
    banner_promo_type:         s.banners.promo_type,
    banner_promo_title:        s.banners.promo_title,
    banner_promo_body:         s.banners.promo_body,
    banner_promo_cta_text:     s.banners.promo_cta_text,
    banner_promo_cta_url:      s.banners.promo_cta_url,
    banner_sponsor_enabled:    String(s.banners.sponsor_enabled),
    banner_sponsor_image:      s.banners.sponsor_image,
    banner_sponsor_title:      s.banners.sponsor_title,
    banner_sponsor_url:        s.banners.sponsor_url,
    banner_info_enabled:       String(s.banners.info_enabled),
    banner_info_text:          s.banners.info_text,
  };
}

/** Render closed_dates JSON → human-readable lines for textarea */
function closedDatesToText(raw: string): string {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.join('\n') : '';
  } catch { return ''; }
}

/** Parse textarea lines → JSON string */
function textToClosedDates(text: string): string {
  const dates = text
    .split('\n')
    .map(d => d.trim())
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  return JSON.stringify(Array.from(new Set(dates)).sort());
}

export default function SettingsPage() {
  const { ready }                     = useAdminAuth();
  const router                        = useRouter();
  const { settings, loading }         = useSettings();
  const { can, loading: roleLoading } = useUserRole();
  const [form,  setForm]              = useState<SettingsFlat>({});
  const [saving, setSaving]           = useState(false);
  const [saved,  setSaved]            = useState(false);
  const [error,  setError]            = useState('');
  const [activeTab, setActiveTab]     = useState<'general' | 'closure' | 'banners'>('general');

  // For the closure textarea we keep a separate raw string
  const [closureText, setClosureText] = useState('');

  useEffect(() => {
    if (!loading) {
      const flat = toFlat(settings);
      setForm(flat);
      setClosureText(closedDatesToText(flat.closed_dates ?? '[]'));
    }
  }, [settings, loading]);

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

  const set    = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const toggle = (key: string) => setForm(f => ({ ...f, [key]: f[key] === 'true' ? 'false' : 'true' }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);

    if (Number(form.opening_hour) >= Number(form.closing_hour)) {
      setError('Jam buka harus lebih kecil dari jam tutup'); setSaving(false); return;
    }

    // Merge closure text into form before saving
    const finalForm = { ...form, closed_dates: textToClosedDates(closureText) };

    const upserts = Object.entries(finalForm).map(([key, value]) => ({ key, value: String(value) }));
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
    { value: 'promo',   label: '🎉 Promo',   preview: 'Hijau gelap' },
    { value: 'info',    label: 'ℹ️ Info',    preview: 'Biru'       },
    { value: 'warning', label: '⚠️ Penting', preview: 'Amber'      },
    { value: 'sponsor', label: '✨ Sponsor',  preview: 'Ungu'       },
  ];

  // Parse dates for preview
  const parsedClosedDates = closureText
    .split('\n').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));

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
            { id: 'general', label: '⚙️ Umum'           },
            { id: 'closure', label: '🚫 Hari Tutup'     },
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

                <AdminCard>
                  <AdminSectionHeader title="📢 Pengumuman Navbar"/>
                  <textarea value={form.announcement ?? ''} rows={2}
                    onChange={e => set('announcement', e.target.value)}
                    className={inputClass + " resize-none"}
                    placeholder="Kosongkan jika tidak ada. Contoh: Tutup 25 Desember 2025 (Hari Natal)"/>
                  <p className="text-xs text-[#74C69D]/30 mt-2">Tampil sebagai banner kuning di bawah navbar.</p>
                </AdminCard>

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

            {/* ══ CLOSURE TAB ═══════════════════════════════════════════════ */}
            {activeTab === 'closure' && (
              <>
                <AdminCard>
                  <AdminSectionHeader
                    title="🚫 Hari Tutup / Libur"
                    subtitle="Pada tanggal ini, seluruh slot jadwal di halaman publik akan dinonaktifkan dan tampil pesan 'Lapangan Tutup'."/>

                  <div>
                    <label className={labelClass}>
                      Daftar Tanggal Tutup
                      <span className="ml-2 font-normal text-[#74C69D]/35">(satu tanggal per baris, format YYYY-MM-DD)</span>
                    </label>
                    <textarea
                      value={closureText}
                      onChange={e => setClosureText(e.target.value)}
                      rows={8}
                      className={inputClass + " resize-none font-mono text-xs leading-relaxed"}
                      placeholder={"2025-12-25\n2026-01-01\n2026-01-29"}
                    />
                    <p className="text-[10px] text-[#74C69D]/30 mt-1.5">
                      Tanggal yang tidak sesuai format YYYY-MM-DD akan diabaikan otomatis saat disimpan.
                    </p>
                  </div>

                  {/* Quick-add buttons for common holidays */}
                  <div className="mt-4">
                    <p className={labelClass}>Tambah Cepat — Hari Libur Nasional</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Natal 2025',     date: '2025-12-25' },
                        { label: 'Tahun Baru 2026',date: '2026-01-01' },
                        { label: 'Idul Fitri 1447', date: '2026-03-30' },
                        { label: 'Idul Fitri 2',    date: '2026-03-31' },
                        { label: 'Hari Buruh',      date: '2026-05-01' },
                        { label: 'Hari Raya Waisak', date: '2026-05-12'},
                      ].map(h => {
                        const already = parsedClosedDates.includes(h.date);
                        return (
                          <button
                            key={h.date}
                            type="button"
                            onClick={() => {
                              if (already) {
                                setClosureText(t => t.split('\n').filter(l => l.trim() !== h.date).join('\n'));
                              } else {
                                setClosureText(t => (t ? t + '\n' + h.date : h.date));
                              }
                            }}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                              already
                                ? 'border-red-500/40 bg-red-500/15 text-red-400'
                                : 'border-[#52B788]/20 text-[#74C69D]/50 hover:border-[#52B788]/40 hover:text-[#74C69D]'
                            }`}>
                            {already ? '✓ ' : '+ '}{h.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview of parsed dates */}
                  {parsedClosedDates.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
                      <p className="text-[10px] text-[#74C69D]/40 uppercase tracking-wide font-bold mb-3">
                        {parsedClosedDates.length} Tanggal akan ditutup:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parsedClosedDates.map(d => (
                          <div key={d}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 text-[11px]">
                            <span>🚫</span>
                            <span className="font-medium">{d}</span>
                            <span className="text-red-400/50">
                              {format(new Date(d + 'T00:00:00'), 'EEE, d MMM yyyy', { locale: id })}
                            </span>
                            <button
                              type="button"
                              onClick={() => setClosureText(t => t.split('\n').filter(l => l.trim() !== d).join('\n'))}
                              className="ml-1 text-red-400/40 hover:text-red-300 transition-colors"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedClosedDates.length === 0 && (
                    <div className="mt-4 p-4 rounded-xl border border-[#52B788]/10 bg-[#52B788]/3 text-center">
                      <p className="text-[#74C69D]/30 text-sm">Belum ada tanggal tutup yang ditetapkan.</p>
                      <p className="text-[#74C69D]/20 text-xs mt-1">Lapangan dianggap buka setiap hari.</p>
                    </div>
                  )}
                </AdminCard>

                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/8 text-xs text-amber-400/80">
                  <strong className="text-amber-400">💡 Tips:</strong> Gunakan fitur Pengumuman (tab Umum) untuk memberi
                  tahu customer tentang hari libur mendatang, meski jadwal belum diblokir.
                </div>
              </>
            )}

            {/* ══ BANNERS TAB ══════════════════════════════════════════════ */}
            {activeTab === 'banners' && (
              <>
                <div className="grid sm:grid-cols-3 gap-3 mb-2">
                  {[
                    { pos:'1', icon:'🎉', label:'Banner Promo',   desc:'Di bawah hero',         key:'promo'   },
                    { pos:'2', icon:'🖼️', label:'Banner Sponsor', desc:'Di antara jadwal',       key:'sponsor' },
                    { pos:'3', icon:'📌', label:'Info Strip',     desc:'Strip tipis atas footer', key:'info'   },
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

                {/* Banner Promo */}
                <AdminCard>
                  <AdminSectionHeader title="🎉 Banner Promo" subtitle="Muncul di bawah hero section"/>
                  <div className="space-y-4">
                    <Toggle k="banner_promo_enabled" label="Aktifkan Banner Promo"/>
                    {form.banner_promo_enabled === 'true' && (
                      <>
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
                            placeholder="Booking 2 jam gratis 1 jam setiap Senin–Jumat."
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
                              placeholder="https://..."
                              onChange={e => set('banner_promo_cta_url', e.target.value)}/>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </AdminCard>

                {/* Banner Sponsor */}
                <AdminCard>
                  <AdminSectionHeader title="🖼️ Banner Sponsor / Iklan Gambar"/>
                  <div className="space-y-4">
                    <Toggle k="banner_sponsor_enabled" label="Aktifkan Banner Sponsor"/>
                    {form.banner_sponsor_enabled === 'true' && (
                      <>
                        <div>
                          <label className={labelClass}>URL Gambar * (1200×300 px)</label>
                          <input type="url" value={form.banner_sponsor_image ?? ''} className={inputClass}
                            placeholder="https://example.com/banner.jpg"
                            onChange={e => set('banner_sponsor_image', e.target.value)}/>
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
                        {form.banner_sponsor_image && (
                          <div className="p-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5">
                            <p className="text-[10px] text-[#74C69D]/40 mb-2 uppercase tracking-wide font-bold">Preview</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.banner_sponsor_image} alt="Preview"
                              className="w-full h-auto max-h-32 object-cover rounded-xl"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </AdminCard>

                {/* Info Strip */}
                <AdminCard>
                  <AdminSectionHeader title="📌 Info Strip" subtitle="Baris tipis di atas footer"/>
                  <div className="space-y-4">
                    <Toggle k="banner_info_enabled" label="Aktifkan Info Strip"/>
                    {form.banner_info_enabled === 'true' && (
                      <div>
                        <label className={labelClass}>Teks Info *</label>
                        <input type="text" value={form.banner_info_text ?? ''} className={inputClass}
                          placeholder="Tersedia perlengkapan badminton. Hubungi admin untuk info."
                          onChange={e => set('banner_info_text', e.target.value)}/>
                      </div>
                    )}
                  </div>
                </AdminCard>
              </>
            )}

            {/* ── Save / error / success ── */}
            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
            {saved  && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ Pengaturan berhasil disimpan!</div>}

            <div className="flex gap-3 pb-6">
              <AdminButton type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving
                  ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Menyimpan...</>
                  : '💾 Simpan Semua Pengaturan'}
              </AdminButton>
              <AdminButton type="button" variant="secondary"
                onClick={() => {
                  const flat = toFlat(settings);
                  setForm(flat);
                  setClosureText(closedDatesToText(flat.closed_dates ?? '[]'));
                }}>
                Reset
              </AdminButton>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
