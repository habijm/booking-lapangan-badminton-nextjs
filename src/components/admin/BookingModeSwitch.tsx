// src/components/admin/BookingModeSwitch.tsx
'use client';

import { useState, useEffect } from 'react';
import { BookingMode } from '@/types/payment';

interface Props {
  initialMode?: BookingMode;
  onModeChange?: (mode: BookingMode) => void;
}

export default function BookingModeSwitch({ initialMode = 'whatsapp', onModeChange }: Props) {
  const [mode, setMode]       = useState<BookingMode>(initialMode);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  // Sync dengan server saat mount
  useEffect(() => {
    fetch('/api/admin/settings/booking-mode')
      .then(r => r.json())
      .then(d => { if (d.mode) setMode(d.mode); })
      .catch(() => {});
  }, []);

  const toggle = async (newMode: BookingMode) => {
    if (newMode === mode || saving) return;
    setSaving(true);

    try {
      const res  = await fetch('/api/admin/settings/booking-mode', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan');

      setMode(newMode);
      onModeChange?.(newMode);
      setToast({ msg: `Mode booking diubah ke ${newMode === 'direct' ? 'Pembayaran Online' : 'WhatsApp'}`, ok: true });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : 'Gagal menyimpan', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium shadow-xl z-50 transition-all
          ${toast.ok
            ? 'bg-[#40916C] text-white'
            : 'bg-red-500/90 text-white'
          }`}
        >
          {toast.ok ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      {/* Card */}
      <div className="p-5 rounded-2xl border border-[#52B788]/20" style={{ background: '#0D2B1C' }}>
        {/* Title */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#40916C]/20 border border-[#40916C]/30 flex items-center justify-center text-sm">
            🔁
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-display">Mode Booking</h3>
            <p className="text-[#74C69D]/40 text-xs">Pilih cara pelanggan melakukan booking</p>
          </div>
          {saving && (
            <span className="ml-auto w-4 h-4 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin"/>
          )}
        </div>

        {/* Toggle pill */}
        <div className="flex rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 p-1 gap-1">
          {/* WhatsApp option */}
          <button
            onClick={() => toggle('whatsapp')}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === 'whatsapp'
                ? 'bg-[#25D366] text-white shadow-md shadow-[#25D366]/20'
                : 'text-[#74C69D]/50 hover:text-[#74C69D]/80'
            }`}
          >
            <span className="text-base">💬</span>
            <span className="leading-none">WhatsApp</span>
          </button>

          {/* Direct payment option */}
          <button
            onClick={() => toggle('direct')}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === 'direct'
                ? 'bg-[#40916C] text-white shadow-md shadow-[#40916C]/20'
                : 'text-[#74C69D]/50 hover:text-[#74C69D]/80'
            }`}
          >
            <span className="text-base">💳</span>
            <span className="leading-none">Bayar Online</span>
          </button>
        </div>

        {/* Description card */}
        <div className={`mt-3 p-3.5 rounded-xl border text-xs leading-relaxed transition-all duration-200 ${
          mode === 'direct'
            ? 'bg-[#40916C]/8 border-[#40916C]/20 text-[#74C69D]/70'
            : 'bg-[#25D366]/8 border-[#25D366]/20 text-[#74C69D]/70'
        }`}>
          {mode === 'direct' ? (
            <>
              <div className="font-semibold text-white mb-1">💳 Mode Pembayaran Online Aktif</div>
              Pelanggan dapat booking & bayar langsung via website menggunakan kartu kredit, transfer bank, GoPay, QRIS, dll.
              Booking dikonfirmasi otomatis setelah pembayaran berhasil.
            </>
          ) : (
            <>
              <div className="font-semibold text-white mb-1">💬 Mode WhatsApp Aktif</div>
              Tombol booking di website akan mengarahkan pelanggan ke WhatsApp untuk konfirmasi manual. Cocok jika belum ingin menggunakan payment gateway.
            </>
          )}
        </div>

        {/* Midtrans status (hanya tampil di mode direct) */}
        {mode === 'direct' && (
          <MidtransStatusBadge />
        )}
      </div>
    </div>
  );
}

// ── Sub-komponen: Midtrans status badge ──────────────────────────────────────
function MidtransStatusBadge() {
  const [status, setStatus] = useState<{
    env: string; clientKey: boolean; serverKey: boolean; webhookSet: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings/payment-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  if (!status) return null;

  const allOk = status.clientKey && status.serverKey;

  return (
    <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1.5 ${
      allOk
        ? 'bg-[#52B788]/5 border-[#52B788]/15'
        : 'bg-red-500/5 border-red-500/15'
    }`}>
      <div className="font-semibold text-white/70 mb-2">🔧 Status Midtrans</div>
      {[
        { label: 'Environment',    ok: true,               value: status.env.toUpperCase() },
        { label: 'Client Key',     ok: status.clientKey,   value: status.clientKey ? 'Tersambung' : 'Belum diset' },
        { label: 'Server Key',     ok: status.serverKey,   value: status.serverKey ? 'Tersambung' : 'Belum diset' },
        { label: 'Webhook URL',    ok: status.webhookSet,  value: status.webhookSet ? 'Terkonfigurasi' : 'Belum diset' },
      ].map(({ label, ok, value }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-[#74C69D]/40">{label}</span>
          <span className={ok ? 'text-[#52B788]' : 'text-red-400'}>
            {ok ? '✓' : '✗'} {value}
          </span>
        </div>
      ))}
      {!allOk && (
        <a
          href="/admin/settings"
          className="block mt-2 text-center text-amber-400 hover:text-amber-300 underline"
        >
          → Atur Midtrans di Settings
        </a>
      )}
    </div>
  );
}
