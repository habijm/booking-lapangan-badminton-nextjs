'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PAYMENT_STATUS_CONFIG, PaymentStatus } from '@/types/payment';

// ── Feature toggle ────────────────────────────────────────────────────────────
// Fitur "Cek Booking via 4 digit terakhir HP" dinonaktifkan sementara.
// Untuk mengaktifkan kembali: ubah jadi `true`, lalu tambahkan kembali link
// "Cek Booking" di Navbar.tsx (desktop + mobile menu).
const CEK_BOOKING_ENABLED = false;

interface BookingResult {
  id: string;
  customer_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  amount?: number;
  paid_at?: string;
  booking_source?: string;
  snap_url?: string;
  court?: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  confirmed: { label:'Dikonfirmasi', color:'text-[#74C69D]',  bg:'bg-[#52B788]/10',  border:'border-[#52B788]/30' },
  pending:   { label:'Menunggu',     color:'text-amber-400',  bg:'bg-amber-500/10',  border:'border-amber-500/30' },
  cancelled: { label:'Dibatalkan',   color:'text-red-400',    bg:'bg-red-500/10',    border:'border-red-500/30'   },
};

function CekBookingContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const directId  = params.get('booking_id');

  const [phone4, setPhone4]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [error, setError]       = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Jika ada booking_id langsung di URL → langsung fetch status
  // (hook ini HARUS tetap dipanggil tanpa kondisi apapun di atasnya,
  // sesuai Rules of Hooks React — guard fitur dilakukan di dalam effect,
  // bukan dengan early-return sebelum hook ini dipanggil)
  useEffect(() => {
    if (!CEK_BOOKING_ENABLED) return;
    if (directId) {
      fetch(`/api/payment/status?booking_id=${directId}`, { cache:'no-store' })
        .then(r => r.json())
        .then(d => {
          if (d.booking) {
            setBookings([d.booking]);
            setSelectedId(d.booking.id);
            setSearched(true);
          }
        }).catch(() => {});
    }
  }, [directId]);

  // ── Fitur dinonaktifkan ───────────────────────────────────────────────────
  // Guard ini ditaruh SETELAH semua hooks di atas dipanggil, supaya urutan
  // pemanggilan hook tetap konsisten di setiap render (Rules of Hooks).
  if (!CEK_BOOKING_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0A1F12' }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl border border-[#52B788]/20 bg-[#52B788]/5 flex items-center justify-center mx-auto text-3xl">
            🔒
          </div>
          <h1 className="font-bold text-white text-lg font-display">Fitur Sedang Tidak Tersedia</h1>
          <p className="text-[#74C69D]/50 text-sm leading-relaxed">
            Fitur cek status booking mandiri sedang dinonaktifkan.<br/>
            Untuk info status booking, silakan hubungi admin langsung.
          </p>
          <button onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all active:scale-95">
            🏠 Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone4.length !== 4 || !/^\d{4}$/.test(phone4)) {
      setError('Masukkan tepat 4 digit angka'); return;
    }
    setLoading(true); setError(''); setSearched(false); setBookings([]);

    let res: Response;
    try {
      res = await fetch(`/api/booking/lookup?phone_last4=${phone4}`, { cache: 'no-store' });
    } catch {
      // fetch() melempar error hanya kalau benar-benar gagal koneksi
      // (offline, DNS gagal, dll) — bukan karena status HTTP error.
      setError('Gagal terhubung ke server. Cek koneksi internet Anda.');
      setLoading(false);
      return;
    }

    // Baca response sebagai text dulu, baru coba parse JSON.
    // Ini supaya kalau API mengembalikan halaman HTML (misal 404 karena
    // route belum ada, atau 500 unhandled error), kita tahu persis apa
    // yang terjadi, bukan cuma pesan generik.
    const raw = await res.text();
    let data: { error?: string; bookings?: BookingResult[]; count?: number } = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      console.error('[cek-booking] Response bukan JSON valid:', raw.slice(0, 300));
      if (res.status === 404) {
        setError('Endpoint API tidak ditemukan (404). Pastikan file api/booking/lookup/route.ts sudah ada di server.');
      } else {
        setError(`Server mengembalikan respons tidak valid (status ${res.status}). Cek console untuk detail.`);
      }
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? `Terjadi kesalahan (status ${res.status})`);
    } else {
      setBookings(data.bookings ?? []);
      setSearched(true);
    }
    setLoading(false);
  };

  const selected = bookings.find(b => b.id === selectedId) ?? null;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#0A1F12' }}>
      <div className="max-w-md mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')}
            className="w-9 h-9 rounded-xl border border-[#52B788]/20 flex items-center justify-center text-[#74C69D]/50 hover:text-[#74C69D] transition-all text-sm">
            ←
          </button>
          <div>
            <h1 className="font-bold text-white text-lg font-display">Cek Status Booking</h1>
            <p className="text-[#74C69D]/40 text-xs">Masukkan 4 digit terakhir nomor HP Anda</p>
          </div>
        </div>

        {/* Form pencarian */}
        {!directId && (
          <form onSubmit={handleSearch}
            className="rounded-2xl border border-[#52B788]/20 p-5 space-y-4"
            style={{ background: '#0D2B1C' }}>
            <div>
              <label className="block text-xs font-semibold text-[#74C69D]/70 mb-2">
                4 Digit Terakhir Nomor HP
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#74C69D]/30 font-mono text-sm">···</span>
                  <input
                    type="text" inputMode="numeric" pattern="\d{4}" maxLength={4}
                    value={phone4}
                    onChange={e => { setPhone4(e.target.value.replace(/\D/g,'')); setError(''); }}
                    placeholder="0000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#52B788]/20 bg-[#52B788]/5 text-white placeholder:text-[#74C69D]/20 focus:outline-none focus:border-[#52B788]/50 text-lg font-bold font-mono tracking-widest text-center transition-all"
                  />
                </div>
                <button type="submit" disabled={loading || phone4.length !== 4}
                  className="px-5 py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all disabled:opacity-40 active:scale-95 flex items-center gap-2">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : '🔍'}
                  {loading ? '' : 'Cari'}
                </button>
              </div>
              {error && <p className="text-red-400 text-xs mt-2">⚠️ {error}</p>}
            </div>
            <p className="text-[#74C69D]/30 text-xs leading-relaxed">
              Contoh: jika nomor HP Anda <strong className="text-[#74C69D]/50">081234<u>5678</u></strong>,
              masukkan <strong className="text-[#74C69D]/50">5678</strong>
            </p>
          </form>
        )}

        {/* Hasil pencarian — list booking */}
        {searched && bookings.length === 0 && (
          <div className="rounded-2xl border border-[#52B788]/10 p-8 text-center" style={{ background:'#0D2B1C' }}>
            <div className="text-3xl mb-2">📭</div>
            <p className="text-[#74C69D]/50 text-sm">Tidak ada booking ditemukan untuk nomor tersebut.</p>
            <p className="text-[#74C69D]/30 text-xs mt-1">Coba 60 hari terakhir sudah dicari.</p>
          </div>
        )}

        {bookings.length > 0 && !selectedId && (
          <div className="space-y-2">
            <p className="text-xs text-[#74C69D]/40 font-semibold uppercase tracking-wide">
              {bookings.length} Booking Ditemukan
            </p>
            {bookings.map(b => {
              const st    = STATUS_LABEL[b.status] ?? STATUS_LABEL.pending;
              const ps    = b.payment_status ? PAYMENT_STATUS_CONFIG[b.payment_status as PaymentStatus] : null;
              const dl    = format(new Date(b.booking_date + 'T00:00:00'), 'EEE, d MMM yyyy', { locale: id });
              return (
                <button key={b.id} onClick={() => setSelectedId(b.id)}
                  className="w-full text-left rounded-2xl border border-[#52B788]/15 p-4 hover:border-[#52B788]/30 transition-all"
                  style={{ background:'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-sm font-display">{b.customer_name}</div>
                      <div className="text-xs text-[#74C69D]/50 mt-1">
                        📅 {dl} · ⏰ {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)} WIB
                      </div>
                      {b.court && <div className="text-xs text-[#74C69D]/40 mt-0.5">🏟️ {b.court.name}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.border} ${st.color}`}>
                        {st.label}
                      </span>
                      {ps && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ps.bg} ${ps.border} ${ps.color}`}>
                          {ps.icon} {ps.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#52B788]/60 mt-2">Ketuk untuk detail →</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Detail booking terpilih */}
        {selected && (
          <BookingDetail
            booking={selected}
            onBack={directId ? undefined : () => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

function BookingDetail({ booking, onBack }: { booking: BookingResult; onBack?: () => void }) {
  const [polling, setPolling] = useState(false);
  const [data, setData]       = useState(booking);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const refresh = useCallback(async (showPoll = false) => {
    if (showPoll) setPolling(true);
    try {
      const res = await fetch(`/api/payment/status?booking_id=${data.id}`, { cache:'no-store' });
      const json = await res.json();
      if (res.ok && json.booking) { setData(json.booking); setLastCheck(new Date()); }
    } catch {}
    if (showPoll) setPolling(false);
  }, [data.id]);

  // Auto-poll jika masih pending
  useEffect(() => {
    if (!['pending','unpaid'].includes(data.payment_status ?? '')) return;
    const t = setInterval(() => refresh(true), 5000);
    return () => clearInterval(t);
  }, [data.payment_status, refresh]);

  const st   = STATUS_LABEL[data.status]  ?? STATUS_LABEL.pending;
  const ps   = data.payment_status ? PAYMENT_STATUS_CONFIG[data.payment_status as PaymentStatus] : null;
  const dl   = format(new Date(data.booking_date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: id });
  const isPending = ['pending','unpaid'].includes(data.payment_status ?? '');
  const isPaid    = data.payment_status === 'paid';

  return (
    <div className="space-y-3 animate-fade-up">
      {onBack && (
        <button onClick={onBack} className="text-[#74C69D]/50 hover:text-[#74C69D] text-xs transition-colors">← Semua Booking</button>
      )}

      {/* Status utama */}
      <div className={`p-5 rounded-2xl border text-center space-y-2 ${ps ? `${ps.bg} ${ps.border}` : `${st.bg} ${st.border}`}`}>
        <div className="text-4xl">{ps?.icon ?? '📋'}</div>
        <h2 className={`font-bold text-xl font-display ${ps?.color ?? st.color}`}>
          {ps?.label ?? st.label}
        </h2>
        {isPaid && data.paid_at && (
          <p className="text-[#74C69D]/60 text-sm">
            Lunas: {format(new Date(data.paid_at), 'd MMM yyyy, HH:mm', { locale: id })} WIB
          </p>
        )}
        {isPending && (
          <div className="flex items-center justify-center gap-2 text-amber-400/70 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
            Menunggu pembayaran…
            {polling && <span className="text-amber-400/40">(memeriksa…)</span>}
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="rounded-2xl border border-[#52B788]/15 overflow-hidden" style={{ background:'#0D2B1C' }}>
        <div className="px-5 py-3 border-b border-[#52B788]/10">
          <h3 className="text-[#74C69D]/60 text-xs uppercase tracking-widest font-semibold">Detail Booking</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {[
            { label:'📅 Tanggal',   value: dl },
            { label:'⏰ Jam',       value: `${data.start_time.slice(0,5)} – ${data.end_time.slice(0,5)} WIB` },
            { label:'⏱ Durasi',    value: `${data.duration_hours} jam` },
            { label:'🏟 Lapangan',  value: data.court?.name ?? 'Lapangan' },
            { label:'👤 Nama',      value: data.customer_name },
            ...(data.status ? [{ label:'📋 Status', value: st.label }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-start gap-3">
              <span className="text-[#74C69D]/50 text-xs flex-shrink-0">{label}</span>
              <span className="text-white font-medium text-xs text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pembayaran */}
      {(data.payment_status || data.amount) && (
        <div className="rounded-2xl border border-[#52B788]/15 overflow-hidden" style={{ background:'#0D2B1C' }}>
          <div className="px-5 py-3 border-b border-[#52B788]/10">
            <h3 className="text-[#74C69D]/60 text-xs uppercase tracking-widest font-semibold">Pembayaran</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label:'💰 Total',   value: data.amount ? `Rp ${data.amount.toLocaleString('id')}` : '—' },
              { label:'💳 Metode',  value: data.payment_method ?? '—' },
              { label:'📊 Status',  value: ps?.label ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-3">
                <span className="text-[#74C69D]/50 text-xs flex-shrink-0">{label}</span>
                <span className="text-white font-medium text-xs text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aksi */}
      <div className="space-y-2">
        {isPending && data.snap_url && (
          <a href={data.snap_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all shadow-lg shadow-[#40916C]/20">
            💳 Lanjutkan Pembayaran
          </a>
        )}
        <button onClick={() => refresh(true)} disabled={polling}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#52B788]/25 text-[#74C69D]/70 hover:text-[#74C69D] hover:border-[#52B788]/40 text-sm transition-all disabled:opacity-40">
          {polling
            ? <><span className="w-3.5 h-3.5 border-2 border-[#52B788]/30 border-t-[#52B788] rounded-full animate-spin"/>Memeriksa…</>
            : '🔄 Refresh Status'}
        </button>
      </div>

      {lastCheck && (
        <p className="text-center text-[10px] text-[#74C69D]/25">
          Terakhir diperiksa: {format(lastCheck, 'HH:mm:ss')}
          {isPending && ' · auto-refresh tiap 5 detik'}
        </p>
      )}
    </div>
  );
}

export default function CekBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background:'#0A1F12' }}>
        <span className="w-8 h-8 border-4 border-[#52B788]/20 border-t-[#52B788] rounded-full animate-spin"/>
      </div>
    }>
      <CekBookingContent />
    </Suspense>
  );
}
