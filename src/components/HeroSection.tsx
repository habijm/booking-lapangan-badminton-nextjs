'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const courtName = process.env.NEXT_PUBLIC_COURT_NAME || 'GOR Badminton';
const courtAddress = process.env.NEXT_PUBLIC_COURT_ADDRESS || '';
const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281234567890';

const FEATURES = [
  { icon: '⚡', label: 'Booking Instan', desc: 'Langsung via WhatsApp' },
  { icon: '📅', label: 'Cek Real-Time', desc: 'Jadwal selalu ter-update' },
  { icon: '✅', label: 'Konfirmasi Cepat', desc: 'Admin responsif 24 jam' },
];

const STATS = [
  { value: '14', unit: 'Slot', label: 'per hari' },
  { value: '08–22', unit: 'WIB', label: 'jam buka' },
  { value: '1–2', unit: 'Jam', label: 'sewa min.' },
];

export default function HeroSection() {
  const shuttleRef = useRef<HTMLDivElement>(null);

  // Parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const el = shuttleRef.current;
      if (!el) return;
      const xFrac = (e.clientX / window.innerWidth - 0.5) * 20;
      const yFrac = (e.clientY / window.innerHeight - 0.5) * 12;
      el.style.transform = `translate(${xFrac}px, ${yFrac}px) rotate(-15deg)`;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo, saya ingin booking lapangan badminton. Mohon info ketersediaan jadwal.')}`;

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#0D1F16]">

      {/* ── Decorative background ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Radial glow top-left */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.35) 0%, transparent 70%)' }} />
        {/* Radial glow bottom-right */}
        <div className="absolute -bottom-40 -right-20 w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(116,198,157,0.18) 0%, transparent 70%)' }} />
        {/* Court line pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="court-lines" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M80 0 L0 0 L0 80" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#court-lines)"/>
          {/* Center court circle */}
          <circle cx="50%" cy="50%" r="180" fill="none" stroke="white" strokeWidth="1"/>
          <circle cx="50%" cy="50%" r="8" fill="none" stroke="white" strokeWidth="1"/>
          {/* Net line */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="0.8" strokeDasharray="6 4"/>
        </svg>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#52B788]/40 bg-[#52B788]/10 text-[#74C69D] text-xs font-semibold mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse inline-block"></span>
          Buka Sekarang • 08:00 – 22:00 WIB
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Left: copy ── */}
          <div>
            <h1 className="font-display font-bold leading-none text-white mb-6">
              <span className="block text-5xl sm:text-6xl lg:text-7xl tracking-tight">
                Booking
              </span>
              <span
                className="block text-5xl sm:text-6xl lg:text-7xl tracking-tight"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #74C69D 0%, #52B788 50%, #40916C 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Lapangan
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white/70 font-normal mt-1">
                Badminton
              </span>
            </h1>

            <p className="text-[#A8D5BC] text-base sm:text-lg leading-relaxed mb-8 max-w-md">
              Cek ketersediaan lapangan secara real-time dan konfirmasi booking langsung lewat WhatsApp — cepat, mudah, tanpa ribet.
            </p>

            {courtAddress && (
              <p className="flex items-center gap-2 text-[#74C69D]/70 text-sm mb-8">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {courtAddress}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/#jadwal"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold transition-all duration-200 active:scale-95 shadow-lg shadow-[#40916C]/30 text-sm sm:text-base"
              >
                <span>📅</span> Lihat Jadwal
              </Link>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border-2 border-[#52B788]/40 text-[#74C69D] hover:bg-[#52B788]/10 font-bold transition-all duration-200 active:scale-95 text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.528 5.847L0 24l6.337-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.807 9.807 0 01-5.001-1.366l-.36-.213-3.727.977.995-3.635-.234-.373A9.773 9.773 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
                </svg>
                Chat WhatsApp
              </a>
            </div>

            {/* Stats row */}
            <div className="flex gap-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold font-display text-white leading-none">
                    {s.value}
                    <span className="text-[#74C69D] text-base ml-1">{s.unit}</span>
                  </div>
                  <div className="text-[#A8D5BC]/60 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: floating visual card ── */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Floating shuttle */}
            <div
              ref={shuttleRef}
              aria-hidden="true"
              className="absolute -top-8 right-8 text-6xl transition-transform duration-700 ease-out select-none"
              style={{ transform: 'rotate(-15deg)' }}
            >
              🏸
            </div>

            {/* Main card */}
            <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-[#52B788]/20"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>
              
              {/* Card header */}
              <div className="px-5 py-4 border-b border-[#52B788]/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#40916C] flex items-center justify-center text-sm">🏸</div>
                  <div>
                    <div className="text-white font-bold text-sm font-display">{courtName}</div>
                    <div className="text-[#74C69D]/60 text-xs">Jadwal Hari Ini</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#52B788]">
                  <span className="w-1.5 h-1.5 bg-[#52B788] rounded-full animate-pulse inline-block"></span>
                  Live
                </div>
              </div>

              {/* Mini schedule preview */}
              <div className="p-5 space-y-2.5">
                {[
                  { time: '08:00', status: 'booked', name: 'Andi S.' },
                  { time: '09:00', status: 'available' },
                  { time: '10:00', status: 'available' },
                  { time: '11:00', status: 'pending', name: 'Menunggu' },
                  { time: '12:00', status: 'available' },
                ].map((slot) => (
                  <div key={slot.time}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
                      slot.status === 'available'
                        ? 'border-[#52B788]/30 bg-[#52B788]/10 cursor-pointer hover:bg-[#52B788]/20'
                        : slot.status === 'pending'
                        ? 'border-amber-400/20 bg-amber-400/5'
                        : 'border-red-400/20 bg-red-400/5'
                    }`}
                  >
                    <span className={`text-xs font-bold font-display ${
                      slot.status === 'available' ? 'text-[#74C69D]' :
                      slot.status === 'pending' ? 'text-amber-400' : 'text-red-400/70'
                    }`}>{slot.time}</span>
                    <span className={`text-xs font-medium ${
                      slot.status === 'available' ? 'text-[#74C69D]/70' :
                      slot.status === 'pending' ? 'text-amber-400/80' : 'text-red-400/50'
                    }`}>
                      {slot.status === 'available' ? '✓ Tersedia' :
                       slot.status === 'pending' ? `⏳ ${slot.name}` : `✗ ${slot.name}`}
                    </span>
                  </div>
                ))}
                <div className="text-center text-[#74C69D]/40 text-xs pt-1">• • • 9 slot lainnya</div>
              </div>

              {/* Card CTA */}
              <div className="px-5 pb-5">
                <Link
                  href="/#jadwal"
                  className="block w-full text-center py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all duration-200 active:scale-95"
                >
                  Lihat Jadwal Lengkap →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="mt-16 pt-10 border-t border-[#52B788]/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.label}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5"
            >
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <div className="text-white font-bold text-sm font-display">{f.label}</div>
                <div className="text-[#A8D5BC]/60 text-xs">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll cue ── */}
      <div className="relative z-10 flex flex-col items-center pb-8 gap-1 text-[#74C69D]/40">
        <span className="text-xs">Scroll untuk lihat jadwal</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </section>
  );
}
