'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CourtSettings } from '@/lib/config';
import { Icon } from '@/components/Icons';

interface Props { settings: CourtSettings }

export default function HeroSection({ settings }: Props) {
  const shuttleRef = useRef<HTMLDivElement>(null);

  // Parallax on mouse move (desktop only)
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

  const waLink = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
    'Halo, saya ingin booking lapangan badminton. Mohon info ketersediaan jadwal.'
  )}`;

  const totalSlots = settings.closing_hour - settings.opening_hour;

  const STATS = [
    { value: String(totalSlots), unit: 'Slot', label: 'per hari' },
    { value: `${settings.opening_hour < 10 ? '0' + settings.opening_hour : settings.opening_hour}–${settings.closing_hour}`, unit: 'WIB', label: 'jam buka' },
    { value: `Rp ${(settings.price_per_hour / 1000).toFixed(0)}rb`, unit: '/jam', label: 'harga sewa' },
  ];

  const FEATURES = [
    { icon: 'zap' as const, label: 'Booking Instan',   desc: 'Langsung via WhatsApp' },
    { icon: 'calendar' as const, label: 'Cek Real-Time',    desc: 'Jadwal selalu ter-update' },
    { icon: 'checkIcon' as const, label: 'Konfirmasi Cepat', desc: 'Admin responsif 24 jam' },
  ];

  return (
    <section className="relative min-h-[100dvh] flex flex-col justify-center overflow-hidden bg-[#0D1F16]">

      {/* ── Decorative background ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(64,145,108,0.35) 0%, transparent 70%)' }}/>
        <div className="absolute -bottom-40 -right-20 w-[420px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(116,198,157,0.18) 0%, transparent 70%)' }}/>
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="court-lines" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M80 0 L0 0 L0 80" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#court-lines)"/>
          <circle cx="50%" cy="50%" r="180" fill="none" stroke="white" strokeWidth="1"/>
          <circle cx="50%" cy="50%" r="8"   fill="none" stroke="white" strokeWidth="1"/>
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="white" strokeWidth="0.8" strokeDasharray="6 4"/>
        </svg>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-12">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#52B788]/40 bg-[#52B788]/10 text-[#74C69D] text-xs font-semibold mb-6 sm:mb-8">
          <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse inline-block"/>
          Buka Sekarang • {settings.opening_hour.toString().padStart(2,'0')}:00 – {settings.closing_hour}:00 WIB
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">

          {/* ── Left: copy ── */}
          <div>
            <h1 className="font-display font-bold leading-none text-white mb-5 sm:mb-6">
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight">Booking</span>
              <span
                className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #74C69D 0%, #52B788 50%, #40916C 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Lapangan
              </span>
              <span className="block text-3xl sm:text-4xl lg:text-5xl xl:text-6xl tracking-tight text-white/70 font-normal mt-1">
                Badminton
              </span>
            </h1>

            {/* Court name */}
            <p className="text-[#74C69D] font-semibold text-sm sm:text-base mb-3">{settings.court_name}</p>

            <p className="text-[#A8D5BC] text-sm sm:text-base leading-relaxed mb-6 max-w-md">
              Cek ketersediaan lapangan secara real-time dan konfirmasi booking langsung lewat WhatsApp — cepat, mudah, tanpa ribet.
            </p>

            {settings.court_address && (
              <p className="flex items-center gap-2 text-[#74C69D]/70 text-sm mb-6">
                <Icon name="mapPin" size={16} className="flex-shrink-0" />
                {settings.court_address}
              </p>
            )}

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-8 sm:mb-10">
              <Link href="/#jadwal"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold transition-all duration-200 active:scale-95 shadow-lg shadow-[#40916C]/30 text-sm sm:text-base">
                <Icon name="calendar" size={16} /> Lihat Jadwal
              </Link>
              <a href="/events"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border-2 border-[#52B788]/40 text-[#74C69D] hover:bg-[#52B788]/10 font-bold transition-all duration-200 active:scale-95 text-sm sm:text-base">
                <Icon name="trophy" size={16} /> Lihat Event
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl border-2 border-[#52B788]/20 text-[#74C69D]/60 hover:bg-[#52B788]/10 font-bold transition-all duration-200 active:scale-95 text-sm sm:text-base">
                  <Icon name="message" size={16} />
                Chat WhatsApp
              </a>
            </div>

            {/* Stats row */}
            <div className="flex gap-5 sm:gap-8">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="text-xl sm:text-2xl font-bold font-display text-white leading-none">
                    {s.value}
                    <span className="text-[#74C69D] text-sm sm:text-base ml-1">{s.unit}</span>
                  </div>
                  <div className="text-[#A8D5BC]/60 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: floating card ── */}
          <div className="relative flex justify-center lg:justify-end mt-4 lg:mt-0">
            {/* Floating shuttle */}
            <div ref={shuttleRef} aria-hidden="true"
              className="absolute -top-6 right-4 sm:right-8 text-5xl sm:text-6xl transition-transform duration-700 ease-out select-none pointer-events-none"
              style={{ transform: 'rotate(-15deg)' }}>
              <Icon name="zap" size={48} className="text-[#74C69D]" />
            </div>

            {/* Preview card */}
            <div className="w-full max-w-[340px] sm:max-w-sm rounded-2xl overflow-hidden border border-[#52B788]/20"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}>

              {/* Card header */}
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#52B788]/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#40916C] flex items-center justify-center"><Icon name="court" size={16} className="text-white" /></div>
                  <div>
                    <div className="text-white font-bold text-xs sm:text-sm font-display truncate max-w-[140px]">{settings.court_name}</div>
                    <div className="text-[#74C69D]/60 text-[10px] sm:text-xs">Jadwal Hari Ini</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#52B788]">
                  <span className="w-1.5 h-1.5 bg-[#52B788] rounded-full animate-pulse inline-block"/>
                  Live
                </div>
              </div>

              {/* Mini schedule preview — slots dinamis dari jam buka */}
              <div className="p-4 sm:p-5 space-y-2">
                {[
                  { time: `${settings.opening_hour.toString().padStart(2,'0')}:00`, status: 'booked',    name: 'Andi S.' },
                  { time: `${(settings.opening_hour+1).toString().padStart(2,'0')}:00`, status: 'available' },
                  { time: `${(settings.opening_hour+2).toString().padStart(2,'0')}:00`, status: 'available' },
                  { time: `${(settings.opening_hour+3).toString().padStart(2,'0')}:00`, status: 'pending',   name: 'Menunggu' },
                  { time: `${(settings.opening_hour+4).toString().padStart(2,'0')}:00`, status: 'available' },
                ].map(slot => (
                  <div key={slot.time}
                    className={`flex items-center justify-between px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all ${
                      slot.status === 'available' ? 'border-[#52B788]/30 bg-[#52B788]/10 cursor-pointer hover:bg-[#52B788]/20' :
                      slot.status === 'pending'   ? 'border-amber-400/20 bg-amber-400/5' :
                                                    'border-red-400/20 bg-red-400/5'
                    }`}>
                    <span className={`text-xs font-bold font-display ${
                      slot.status === 'available' ? 'text-[#74C69D]' :
                      slot.status === 'pending'   ? 'text-amber-400'  : 'text-red-400/70'
                    }`}>{slot.time}</span>
                    <span className={`text-xs font-medium ${
                      slot.status === 'available' ? 'text-[#74C69D]/70' :
                      slot.status === 'pending'   ? 'text-amber-400/80' : 'text-red-400/50'
                    }`}>
                      {slot.status === 'available' ? '✓ Tersedia' :
                       slot.status === 'pending'   ? `Menunggu ${slot.name}` : `Tidak tersedia ${slot.name}`}
                    </span>
                  </div>
                ))}
                <div className="text-center text-[#74C69D]/40 text-xs pt-0.5">
                  • • • {totalSlots - 5} slot lainnya
                </div>
              </div>

              {/* Card CTA */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <Link href="/#jadwal"
                  className="block w-full text-center py-2.5 sm:py-3 rounded-xl bg-[#40916C] hover:bg-[#52B788] text-white font-bold text-sm transition-all duration-200 active:scale-95">
                  Lihat Jadwal Lengkap →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="mt-10 sm:mt-14 pt-8 sm:pt-10 border-t border-[#52B788]/10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div key={f.label}
              className="flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-xl border border-[#52B788]/15 bg-[#52B788]/5">
              <Icon name={f.icon} size={22} className="text-[#74C69D] flex-shrink-0" />
              <div>
                <div className="text-white font-bold text-sm font-display">{f.label}</div>
                <div className="text-[#A8D5BC]/60 text-xs">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll cue ── */}
      <div className="relative z-10 flex flex-col items-center pb-6 sm:pb-8 gap-1 text-[#74C69D]/40">
        <span className="text-xs">Scroll untuk lihat jadwal</span>
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </section>
  );
}
