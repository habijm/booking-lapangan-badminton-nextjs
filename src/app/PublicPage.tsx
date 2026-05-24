'use client';

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ScheduleGrid from '@/components/ScheduleGrid';
import { BannerPromo } from '@/components/public/BannerPromo';
import { BannerSponsor } from '@/components/public/BannerSponsor';
import { BannerInfo } from '@/components/public/BannerInfo';
import { EventsPreview } from '@/components/public/EventsPreview';
import { CourtSettings } from '@/lib/config';

interface Props { settings: CourtSettings }

export default function PublicPage({ settings }: Props) {
  const { banners } = settings;

  return (
    <div className="min-h-screen bg-[#0D1F16]">
      {/* Navbar — fixed, transparent over hero */}
      <Navbar settings={settings} />

      {/* ── 1. Hero ── */}
      <HeroSection settings={settings} />

      {/* ── 2. Banner Promo — langsung setelah hero, tidak mengganggu ── */}
      <BannerPromo banners={banners} waNumber={settings.whatsapp_number} />

      {/* ── 3. Jadwal Lapangan ── */}
      <section id="jadwal" className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="mb-7 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#52B788]/30 bg-[#52B788]/10 text-[#74C69D] text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse inline-block"/>
              Real-time · Auto-update
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Jadwal Lapangan
            </h2>
            <p className="text-[#74C69D]/50 text-sm mt-2">
              Pilih tanggal dan klik slot tersedia untuk langsung booking via WhatsApp
            </p>
          </div>

          {/* Schedule card */}
          <div className="rounded-2xl border border-[#52B788]/15 p-5 sm:p-6"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <ScheduleGrid settings={settings} />
          </div>
        </div>
      </section>

      {/* ── 4. Banner Sponsor — di antara jadwal dan cara booking ── */}
      <BannerSponsor banners={banners} />

      {/* ── 5. Cara Booking ── */}
      <section id="cara-booking" className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-[#52B788]/15 p-5 sm:p-6"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h2 className="text-lg font-bold text-white font-display mb-5 flex items-center gap-2">
              <span>ℹ️</span> Cara Booking Lapangan
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { step:'01', icon:'👀', title:'Cek Jadwal',
                  desc:'Pilih tanggal dan lihat slot yang tersedia (hijau = tersedia)' },
                { step:'02', icon:'💬', title:'Hubungi via WhatsApp',
                  desc:'Klik slot tersedia atau tombol WhatsApp untuk langsung chat admin' },
                { step:'03', icon:'✅', title:'Konfirmasi Booking',
                  desc:'Admin konfirmasi dan slot otomatis tampil sebagai "Dikonfirmasi"' },
              ].map(item => (
                <div key={item.step} className="flex gap-4 p-4 rounded-xl border border-[#52B788]/10 bg-[#52B788]/5">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-[#40916C] text-white flex items-center justify-center font-bold font-display text-sm shadow-lg shadow-[#40916C]/20">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg mb-1">{item.icon}</div>
                    <h3 className="font-bold text-white font-display text-sm">{item.title}</h3>
                    <p className="text-xs text-[#74C69D]/50 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Info penyewaan dinamis */}
            <div className="mt-5 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h3 className="font-bold text-amber-400 font-display text-sm mb-2">📋 Informasi Penyewaan</h3>
              <ul className="text-xs text-amber-300/70 space-y-1.5">
                {[
                  `Jam operasional: ${settings.opening_hour}:00 – ${settings.closing_hour}:00 WIB`,
                  `Harga sewa: Rp ${settings.price_per_hour.toLocaleString('id')}/jam`,
                  `Booking tersedia hingga ${settings.booking_window_days} hari ke depan`,
                  `Pembatalan maksimal ${settings.cancellation_window_hours} jam sebelum jadwal`,
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500/60 mt-0.5 flex-shrink-0">•</span>
                    <span dangerouslySetInnerHTML={{ __html: text.replace(/([\d:–]+\s*(?:WIB|jam|hari|Rp[\d.,\/jam]+))/g, '<strong class="text-amber-300">$1</strong>') }}/>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Events Preview ── */}
      <EventsPreview waNumber={settings.whatsapp_number} />

      {/* ── 7. Banner Info strip (tipis, tidak mengganggu) ── */}
      <BannerInfo banners={banners} />

      {/* ── 7. Footer ── */}
      <footer className="border-t border-[#52B788]/10 px-4 sm:px-6 lg:px-8 py-8"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#40916C] flex items-center justify-center">
              <span className="text-base">🏸</span>
            </div>
            <div>
              <div className="text-sm font-bold text-white font-display">{settings.court_name}</div>
              <div className="text-xs text-[#74C69D]/40">Sistem Booking Online</div>
            </div>
          </div>
          <div className="text-xs text-[#74C69D]/40 text-center sm:text-right">
            <p>Buka setiap hari · {settings.opening_hour}:00 – {settings.closing_hour}:00 WIB</p>
            <p className="mt-1">
              <a href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#52B788] hover:text-[#74C69D] transition-colors font-medium">
                WhatsApp Admin ↗
              </a>
              {settings.court_address && (
                <span className="ml-3 text-[#74C69D]/30">{settings.court_address}</span>
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
