'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminCard, AdminSectionHeader, AdminButton } from './AdminCard';

// Duplikat default template di sini (bukan import dari lib/whatsapp.ts)
// supaya komponen ini tetap ringan di sisi client tanpa ikut nge-bundle
// dependency server-only (date-fns locale dkk dari lib/whatsapp.ts).
const DEFAULT_TEMPLATES = {
  confirmed:
    `✅ *Booking Dikonfirmasi!*\n\n` +
    `Halo *{nama}*,\n` +
    `Booking lapangan Anda telah dikonfirmasi.\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n` +
    `⏱ Durasi: {durasi} jam\n\n` +
    `Harap hadir tepat waktu. Terima kasih! 🏸`,
  cancelled:
    `❌ *Booking Dibatalkan*\n\n` +
    `Halo *{nama}*,\n` +
    `Maaf, booking lapangan Anda telah dibatalkan.\n\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n` +
    `{alasan_block}` +
    `\nSilakan hubungi kami untuk informasi lebih lanjut.`,
  pending:
    `⏳ *Permintaan Booking Diterima*\n\n` +
    `Halo *{nama}*,\n` +
    `Permintaan booking Anda sedang diproses.\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n\n` +
    `Kami akan segera mengkonfirmasi booking Anda.\n` +
    `Info lebih lanjut hubungi: wa.me/{wa_admin}`,
  reminder:
    `🔔 *Pengingat Booking Besok*\n\n` +
    `Halo *{nama}*,\n` +
    `Mengingatkan booking lapangan Anda besok:\n\n` +
    `📍 *{lapangan}*\n` +
    `📅 {tanggal}\n` +
    `⏰ {jam_mulai} – {jam_selesai} WIB\n\n` +
    `Sampai jumpa! 🏸`,
};

type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

const TEMPLATE_META: { key: TemplateKey; label: string; icon: string; dbKey: string; desc: string }[] = [
  { key: 'confirmed', label: 'Booking Dikonfirmasi', icon: '✅', dbKey: 'wa_template_confirmed', desc: 'Dikirim saat admin konfirmasi booking / setelah pembayaran online berhasil' },
  { key: 'cancelled', label: 'Booking Dibatalkan',   icon: '❌', dbKey: 'wa_template_cancelled', desc: 'Dikirim saat admin membatalkan booking' },
  { key: 'pending',   label: 'Booking Menunggu',     icon: '⏳', dbKey: 'wa_template_pending',   desc: 'Dikirim saat customer baru membuat booking (status pending)' },
  { key: 'reminder',  label: 'Pengingat H-1',         icon: '🔔', dbKey: 'wa_template_reminder',  desc: 'Pengingat otomatis 1 hari sebelum jadwal (kalau fitur reminder diaktifkan)' },
];

// Data dummy untuk live preview
const PREVIEW_VARS: Record<string, string> = {
  nama:         'Budi Santoso',
  lapangan:     'GOR Badminton Sinar Jaya',
  tanggal:      'Senin, 24 Juni 2026',
  jam_mulai:    '19:00',
  jam_selesai:  '20:00',
  durasi:       '1',
  alasan:       'Lapangan sedang maintenance',
  alasan_block: '\n📝 Alasan: Lapangan sedang maintenance\n',
  wa_admin:     '6281234567890',
};

function renderPreview(template: string): string {
  let result = template;
  for (const [k, v] of Object.entries(PREVIEW_VARS)) {
    result = result.split(`{${k}}`).join(v);
  }
  return result + '\n\n_Pesan otomatis dari sistem booking GOR Badminton Sinar Jaya_';
}

const PLACEHOLDER_HELP: Record<TemplateKey, string[]> = {
  confirmed: ['{nama}', '{lapangan}', '{tanggal}', '{jam_mulai}', '{jam_selesai}', '{durasi}'],
  cancelled: ['{nama}', '{tanggal}', '{jam_mulai}', '{jam_selesai}', '{alasan_block}'],
  pending:   ['{nama}', '{lapangan}', '{tanggal}', '{jam_mulai}', '{jam_selesai}', '{wa_admin}'],
  reminder:  ['{nama}', '{lapangan}', '{tanggal}', '{jam_mulai}', '{jam_selesai}'],
};

export function WhatsAppTemplatesEditor() {
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>({ ...DEFAULT_TEMPLATES });
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState('');
  const [previewOf, setPreviewOf] = useState<TemplateKey | null>(null);
  const [expanded, setExpanded]   = useState(false);

  useEffect(() => {
    async function load() {
      const dbKeys = TEMPLATE_META.map(t => t.dbKey);
      const { data, error: err } = await supabase
        .from('settings').select('key,value').in('key', dbKeys);
      if (!err && data) {
        const map = Object.fromEntries(data.map(r => [r.key, r.value]));
        setTemplates(prev => {
          const next = { ...prev };
          for (const t of TEMPLATE_META) {
            if (map[t.dbKey]) next[t.key] = map[t.dbKey];
          }
          return next;
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    const upserts = TEMPLATE_META.map(t => ({ key: t.dbKey, value: templates[t.key] ?? '' }));
    const { error: err } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
    setSaving(false);
    if (err) { setError('Gagal menyimpan: ' + err.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetOne = (key: TemplateKey) => {
    setTemplates(prev => ({ ...prev, [key]: DEFAULT_TEMPLATES[key] }));
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white text-sm placeholder:text-[#74C69D]/25 focus:outline-none focus:border-[#52B788]/60 focus:bg-[#52B788]/8 transition-all resize-none font-mono leading-relaxed disabled:opacity-50';

  if (loading) {
    return (
      <AdminCard>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: 'rgba(82,183,136,0.05)' }} />
          ))}
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard padding="none">
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#52B788]/5 rounded-2xl transition-colors">
        <div>
          <div className="font-bold text-white font-display text-sm flex items-center gap-2">
            📱 Template Pesan WhatsApp
          </div>
          <div className="text-[#74C69D]/35 text-xs mt-0.5">
            Ubah teks notifikasi WA yang dikirim ke customer — gunakan placeholder untuk data dinamis
          </div>
        </div>
        <span className="text-[#74C69D]/40 text-sm ml-4">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#52B788]/10 px-5 pb-5 pt-4 space-y-4">
          {TEMPLATE_META.map(meta => {
            const isPreview = previewOf === meta.key;
            return (
              <div key={meta.key} className="rounded-xl border border-[#52B788]/15 bg-[#52B788]/5 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      {meta.icon} {meta.label}
                    </div>
                    <p className="text-[#74C69D]/40 text-xs mt-0.5">{meta.desc}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <AdminButton variant="ghost" className="text-[11px] px-2 py-1"
                      onClick={() => setPreviewOf(isPreview ? null : meta.key)}>
                      {isPreview ? '✏️ Edit' : '👁️ Preview'}
                    </AdminButton>
                    <AdminButton variant="ghost" className="text-[11px] px-2 py-1"
                      onClick={() => handleResetOne(meta.key)}>
                      ↺ Reset
                    </AdminButton>
                  </div>
                </div>

                {/* Placeholder hints */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PLACEHOLDER_HELP[meta.key].map(p => (
                    <button key={p} type="button"
                      onClick={() => setTemplates(prev => ({ ...prev, [meta.key]: prev[meta.key] + p }))}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#52B788]/20 bg-[#52B788]/10 text-[#74C69D]/60 hover:text-[#74C69D] hover:border-[#52B788]/40 transition-colors"
                      title="Klik untuk tambahkan ke akhir teks">
                      {p}
                    </button>
                  ))}
                </div>

                {isPreview ? (
                  <div className="rounded-xl border border-[#52B788]/20 p-4" style={{ background: '#0D1F16' }}>
                    <p className="text-[10px] text-[#74C69D]/40 uppercase tracking-wide font-bold mb-2">
                      📲 Preview (data contoh)
                    </p>
                    <div className="whitespace-pre-wrap text-sm text-white/90 leading-relaxed font-sans">
                      {renderPreview(templates[meta.key])}
                    </div>
                  </div>
                ) : (
                  <textarea
                    rows={7}
                    value={templates[meta.key]}
                    onChange={e => setTemplates(prev => ({ ...prev, [meta.key]: e.target.value }))}
                    className={inputCls}
                    placeholder={DEFAULT_TEMPLATES[meta.key]}
                  />
                )}
              </div>
            );
          })}

          {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">⚠️ {error}</div>}
          {saved && <div className="p-3 rounded-xl bg-[#52B788]/10 border border-[#52B788]/20 text-[#74C69D] text-sm">✅ Template berhasil disimpan!</div>}

          <AdminButton variant="primary" onClick={handleSave} disabled={saving} className="w-full">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>Menyimpan...</>
              : '💾 Simpan Semua Template'}
          </AdminButton>

          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/8 text-xs text-amber-400/80">
            <strong className="text-amber-400">💡 Tips:</strong> Klik tombol placeholder (misal <code className="font-mono">{'{nama}'}</code>) untuk
            menambahkannya ke akhir teks. Footer <em>&ldquo;Pesan otomatis dari sistem booking...&rdquo;</em> akan otomatis
            ditambahkan di bawah, tidak perlu ditulis manual.
          </div>
        </div>
      )}
    </AdminCard>
  );
}
